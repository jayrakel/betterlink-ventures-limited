const db = require('../../config/db');
const { notifyUser, notifyAll } = require('../../shared/notify');
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
    
    // --- SCHEDULE LOGIC ---
    const loan = result.rows[0];

    loan.amount_requested = parseFloat(loan.amount_requested || 0);
    loan.amount_repaid = parseFloat(loan.amount_repaid || 0);
    loan.total_due = parseFloat(loan.total_due || 0);
    loan.interest_amount = parseFloat(loan.interest_amount || 0);
    loan.repayment_weeks = parseInt(loan.repayment_weeks || 0);

    loan.schedule = {
        weekly_installment: 0,
        weeks_passed: 0,
        installments_due: 0,
        expected_to_date: 0,
        running_balance: 0,
        status_text: 'Pending',
        grace_days_remaining: 0
    };

    if (loan.status === 'ACTIVE' && loan.disbursed_at && loan.total_due > 0) {
        const graceVal = await getSetting('loan_grace_period_weeks');
        const graceWeeks = parseInt(graceVal) || 4; 

        const now = new Date();
        const start = new Date(loan.disbursed_at);
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        const weeks = loan.repayment_weeks > 0 ? loan.repayment_weeks : 1;
        const weeklyAmount = loan.total_due / weeks;
        
        const diffMs = now - start;
        const rawWeeksPassed = Math.floor(diffMs / oneWeekMs);
        const effectiveWeeksPassed = rawWeeksPassed - graceWeeks;

        // 1. Calculate Expected Amount
        let installmentsDue = 0;
        if (effectiveWeeksPassed < 0) {
            installmentsDue = 0; // Grace Period = 0 Due
        } else {
            installmentsDue = Math.min(effectiveWeeksPassed + 1, loan.repayment_weeks);
        }
        
        const amountExpectedSoFar = installmentsDue * weeklyAmount;
        const runningBalance = loan.amount_repaid - amountExpectedSoFar;

        // 2. Determine Status (Prioritize Grace Period)
        let statusText = '';
        let graceDaysRemaining = 0;

        // ✅ FIX: Check Grace Period FIRST
        if (effectiveWeeksPassed < 0) {
            statusText = 'GRACE PERIOD';
            // Calculate Countdown
            const graceEndDate = new Date(start.getTime() + (graceWeeks * oneWeekMs));
            const remainingMs = graceEndDate - now;
            graceDaysRemaining = Math.max(0, Math.ceil(remainingMs / oneDayMs));
        } else if (runningBalance < 0) {
            statusText = 'ARREARS'; 
        } else if (runningBalance > 0) {
            statusText = 'PREPAYMENT'; 
        } else {
            statusText = 'UP TO DATE';
        }

        loan.schedule = {
            weekly_installment: parseFloat(weeklyAmount.toFixed(2)),
            weeks_passed: Math.max(0, effectiveWeeksPassed + 1),
            weeks_remaining: Math.max(0, loan.repayment_weeks - (effectiveWeeksPassed + 1)),
            expected_to_date: parseFloat(amountExpectedSoFar.toFixed(2)),
            running_balance: parseFloat(runningBalance.toFixed(2)),
            status_text: statusText,
            grace_days_remaining: graceDaysRemaining
        };
    }

    return { ...loan, eligibility };
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
    const check = await db.query("SELECT loan_application_id FROM loan_guarantors WHERE id=$1 AND guarantor_id=$2", [requestId, userId]);
    if (check.rows.length === 0) throw new Error("Unauthorized request");

    await db.query("UPDATE loan_guarantors SET status=$1 WHERE id=$2", [decision, requestId]);
    
    const loanId = check.rows[0].loan_application_id;
    await db.query(
        `UPDATE loan_applications SET guarantor_ids = ARRAY(SELECT guarantor_id FROM loan_guarantors WHERE loan_application_id = $1 AND status = 'ACCEPTED') WHERE id = $1`, 
        [loanId]
    );
};

// --- 3. WORKFLOW ACTIONS ---

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

// --- 4. LISTING HELPERS ---

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

const getGuarantorRequests = async (userId) => {
    const result = await db.query(
        `SELECT g.id, u.full_name as applicant_name, l.amount_requested 
         FROM loan_guarantors g
         JOIN loan_applications l ON g.loan_application_id = l.id
         JOIN users u ON l.user_id = u.id
         WHERE g.guarantor_id = $1 AND g.status = 'PENDING'`,
        [userId]
    );
    return result.rows;
};

const searchMembers = async (userId, query) => {
    const result = await db.query(
        `SELECT id, full_name, phone_number FROM users 
         WHERE id != $1 AND (full_name ILIKE $2 OR phone_number ILIKE $2) LIMIT 5`,
        [userId, `%${query}%`]
    );
    return result.rows;
};

const getMyGuarantors = async (userId) => {
    const loan = await db.query("SELECT id FROM loan_applications WHERE user_id = $1 AND status IN ('PENDING_GUARANTORS')", [userId]);
    if (loan.rows.length === 0) return [];
    
    const result = await db.query(
        `SELECT g.id, u.full_name, g.status 
         FROM loan_guarantors g 
         JOIN users u ON g.guarantor_id = u.id 
         WHERE g.loan_application_id = $1`,
        [loan.rows[0].id]
    );
    return result.rows;
};

const getOpenVotes = async (userId) => {
    const result = await db.query(
        `SELECT l.id, l.amount_requested, u.full_name, l.purpose 
         FROM loan_applications l
         JOIN users u ON l.user_id = u.id
         WHERE l.status = 'VOTING' AND l.user_id != $1
         AND NOT EXISTS (SELECT 1 FROM votes v WHERE v.loan_application_id = l.id AND v.user_id = $1)`,
        [userId]
    );
    return result.rows;
};

const getChairAgenda = async () => {
    const result = await db.query(
        `SELECT l.id, l.amount_requested, u.full_name, l.purpose 
         FROM loan_applications l
         JOIN users u ON l.user_id = u.id
         WHERE l.status = 'TABLED' 
         ORDER BY l.created_at ASC`
    );
    return result.rows;
};

const getLiveTally = async () => {
    const result = await db.query(
        `SELECT l.id, u.full_name, l.amount_requested, l.status,
         COUNT(CASE WHEN v.vote = 'YES' THEN 1 END) as yes_votes,
         COUNT(CASE WHEN v.vote = 'NO' THEN 1 END) as no_votes
         FROM loan_applications l
         JOIN users u ON l.user_id = u.id
         LEFT JOIN votes v ON l.id = v.loan_application_id
         WHERE l.status IN ('TABLED', 'VOTING')
         GROUP BY l.id, u.full_name, l.amount_requested, l.status`
    );
    return result.rows;
};

const announceMeeting = async (meetingDate, extraAgendas) => {
    await notifyAll(`📅 MEETING CALL: ${meetingDate || "Next Thursday"}. Agenda: ${extraAgendas}`);
};

const getTreasuryStats = async () => {
    const stats = await db.query(`SELECT (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status='COMPLETED') as savings, (SELECT COUNT(*) * 500 FROM loan_applications WHERE status != 'FEE_PENDING') as fees, (SELECT COALESCE(SUM(amount_repaid), 0) FROM loan_applications) as repaid, (SELECT COALESCE(SUM(amount_requested), 0) FROM loan_applications WHERE status IN ('ACTIVE', 'COMPLETED')) as disbursed`);
    const r = stats.rows[0];
    const liquid = (parseFloat(r.savings) + parseFloat(r.fees) + parseFloat(r.repaid)) - parseFloat(r.disbursed);
    return { availableFunds: liquid, totalDisbursed: parseFloat(r.disbursed) };
};

module.exports = {
    getMemberLoanStatus, initApplication, submitApplicationDetails,
    addGuarantor, respondToGuarantorRequest,
    verifyApplication, tableApplication, openVoting, castVote, finalizeVote,
    disburseLoan,
    getOfficerQueue, getSecretaryQueue, getTreasuryQueue,
    getGuarantorRequests, searchMembers, getMyGuarantors,
    getOpenVotes, getChairAgenda, getLiveTally, announceMeeting,
    getTreasuryStats
};