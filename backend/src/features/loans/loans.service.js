const db = require('../../config/db');
const { notifyUser, notifyAll } = require('../../shared/notify');
// We import getSetting from the new settings service we created in Phase 2
const { getSetting } = require('../settings/settings.service');

// --- 1. APPLICATION LOGIC ---

const getMemberLoanStatus = async (userId) => {
    const result = await db.query(
        `SELECT id, status, fee_amount, amount_requested, amount_repaid, 
                purpose, repayment_weeks, total_due, interest_amount, disbursed_at 
         FROM loan_applications 
         WHERE user_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );
    
    // Eligibility Logic
    const minSavingsVal = await getSetting('min_savings_for_loan');
    const minSavings = parseFloat(minSavingsVal) || 5000;
    
    const savingsRes = await db.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = $1 AND status = 'COMPLETED' AND type = 'DEPOSIT'",
        [userId]
    );
    const currentSavings = parseFloat(savingsRes.rows[0].total);

    const eligibility = {
        eligible: currentSavings >= minSavings,
        min_savings: minSavings,
        current_savings: currentSavings,
        message: currentSavings >= minSavings ? "Eligible" : `Insufficient savings. Reach KES ${minSavings.toLocaleString()} to apply.`
    };

    if (result.rows.length === 0) return { status: 'NO_APP', eligibility };
    
    return { ...result.rows[0], eligibility };
};

const initApplication = async (userId) => {
    const activeCheck = await db.query("SELECT id FROM loan_applications WHERE user_id = $1 AND status NOT IN ('REJECTED', 'COMPLETED') LIMIT 1", [userId]);
    if (activeCheck.rows.length > 0) throw new Error("Active application exists");

    const statusObj = await getMemberLoanStatus(userId);
    if (!statusObj.eligibility.eligible) throw new Error(statusObj.eligibility.message);

    const feeVal = await getSetting('loan_processing_fee');
    const processingFee = parseFloat(feeVal) || 500;

    const result = await db.query(
        "INSERT INTO loan_applications (user_id, status, fee_amount) VALUES ($1, 'FEE_PENDING', $2) RETURNING *", 
        [userId, processingFee]
    );
    return result.rows[0];
};

const submitApplicationDetails = async (userId, data) => {
    const { loanAppId, amount, purpose, repaymentWeeks } = data;
    
    // Ownership check
    const check = await db.query("SELECT user_id FROM loan_applications WHERE id=$1", [loanAppId]);
    if (check.rows.length === 0) throw new Error("Loan not found");
    if (check.rows[0].user_id !== userId) throw new Error("Unauthorized");

    // Limit check
    const savingsRes = await db.query("SELECT SUM(amount) as total FROM deposits WHERE user_id = $1 AND status = 'COMPLETED'", [userId]);
    const multiplierVal = await getSetting('loan_multiplier');
    const multiplier = parseFloat(multiplierVal) || 3;
    
    const totalSavings = parseFloat(savingsRes.rows[0].total || 0);
    const maxLimit = totalSavings * multiplier;

    if (parseInt(amount) > maxLimit) {
        throw new Error(`Limit exceeded. Max Loan (${multiplier}x): ${maxLimit.toLocaleString()}`);
    }

    await db.query(
        "UPDATE loan_applications SET amount_requested=$1, purpose=$2, repayment_weeks=$3, status='PENDING_GUARANTORS' WHERE id=$4", 
        [amount, purpose, repaymentWeeks, loanAppId]
    );
};

// --- 2. GUARANTOR LOGIC ---

const addGuarantor = async (userId, loanId, guarantorId) => {
    const app = await db.query("SELECT full_name FROM users WHERE id=$1", [userId]);
    
    await db.query("INSERT INTO loan_guarantors (loan_application_id, guarantor_id) VALUES ($1, $2)", [loanId, guarantorId]);
    await db.query(`UPDATE loan_applications SET guarantor_ids = ARRAY(SELECT guarantor_id FROM loan_guarantors WHERE loan_application_id = $1) WHERE id = $1`, [loanId]);
    
    await notifyUser(guarantorId, `🤝 Request: ${app.rows[0].full_name} needs a guarantor (Loan #${loanId}).`);
};

const respondToGuarantorRequest = async (userId, requestId, decision) => {
    // Basic accept logic (Complex liability checks can be added here if needed)
    const check = await db.query("SELECT loan_application_id FROM loan_guarantors WHERE id=$1 AND guarantor_id=$2", [requestId, userId]);
    if (check.rows.length === 0) throw new Error("Unauthorized request");

    await db.query("UPDATE loan_guarantors SET status=$1 WHERE id=$2", [decision, requestId]);
    
    // Sync array
    const loanId = check.rows[0].loan_application_id;
    await db.query(
        `UPDATE loan_applications SET guarantor_ids = ARRAY(SELECT guarantor_id FROM loan_guarantors WHERE loan_application_id = $1 AND status = 'ACCEPTED') WHERE id = $1`, 
        [loanId]
    );
};

// --- 3. WORKFLOW ACTIONS (Officer, Secretary, Chair, Treasurer) ---

const verifyApplication = async (loanId) => {
    await db.query("UPDATE loan_applications SET status='VERIFIED' WHERE id=$1", [loanId]);
};

const tableApplication = async (loanId) => {
    await db.query("UPDATE loan_applications SET status='TABLED' WHERE id=$1", [loanId]);
    
    const admins = await db.query("SELECT id FROM users WHERE role='ADMIN'");
    await Promise.all(admins.rows.map(a => notifyUser(a.id, `⚖️ AGENDA: Loan #${loanId} tabled for voting.`)));
};

const openVoting = async (loanId) => {
    await db.query("UPDATE loan_applications SET status='VOTING' WHERE id=$1", [loanId]);
    await notifyAll(`📢 VOTING OPEN: Loan #${loanId} is now on the floor.`);
};

const castVote = async (userId, loanId, decision) => {
    await db.query(
        "INSERT INTO votes (loan_application_id, user_id, vote) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", 
        [loanId, userId, decision]
    );
};

const finalizeVote = async (loanId, decision) => {
    const newStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    await db.query("UPDATE loan_applications SET status=$1 WHERE id=$2", [newStatus, loanId]);
    await notifyAll(`📢 RESULT: Loan #${loanId} has been ${newStatus}.`);
};

const disburseLoan = async (treasurerId, loanId) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        const check = await client.query("SELECT status, amount_requested, user_id, repayment_weeks FROM loan_applications WHERE id=$1", [loanId]);
        if (check.rows.length === 0 || check.rows[0].status !== 'APPROVED') throw new Error("Invalid loan status");
        
        const loan = check.rows[0];
        const principal = parseFloat(loan.amount_requested);
        
        // Calculate Interest
        const rateVal = await getSetting('loan_interest_rate'); 
        const rate = parseFloat(rateVal || 10);
        const totalInterest = principal * (rate / 100);
        const totalDue = principal + totalInterest;

        await client.query(
            `UPDATE loan_applications SET status='ACTIVE', interest_amount=$1, total_due=$2, disbursed_at=NOW() WHERE id=$3`, 
            [totalInterest, totalDue, loanId]
        );

        await client.query(
            "INSERT INTO transactions (user_id, type, amount, reference_code, description) VALUES ($1, 'LOAN_DISBURSEMENT', $2, $3, $4)", 
            [loan.user_id, principal, `DISB-${loanId}`, `Disbursement (Flat Rate)`]
        );

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// --- LISTING HELPERS ---
const getOfficerQueue = async () => {
    const res = await db.query(`SELECT l.*, u.full_name FROM loan_applications l JOIN users u ON l.user_id = u.id WHERE l.status IN ('SUBMITTED', 'PENDING_GUARANTORS')`);
    return res.rows;
};

const getSecretaryQueue = async () => {
    const res = await db.query(`SELECT l.id, l.amount_requested, u.full_name, l.purpose FROM loan_applications l JOIN users u ON l.user_id = u.id WHERE l.status = 'VERIFIED'`);
    return res.rows;
};

const getTreasuryQueue = async () => {
    const res = await db.query(`SELECT l.id, l.amount_requested, u.full_name FROM loan_applications l JOIN users u ON l.user_id = u.id WHERE l.status = 'APPROVED'`);
    return res.rows;
};

module.exports = {
    getMemberLoanStatus, initApplication, submitApplicationDetails,
    addGuarantor, respondToGuarantorRequest,
    verifyApplication, tableApplication, openVoting, castVote, finalizeVote,
    disburseLoan,
    getOfficerQueue, getSecretaryQueue, getTreasuryQueue
};