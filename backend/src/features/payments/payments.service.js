const db = require('../../config/db');
const axios = require('axios');

// --- ROUTING HELPER ---
const processCompletedTransaction = async (client, transaction) => {
    const { user_id, type, amount, reference_code } = transaction;
    const safeType = type || 'DEPOSIT'; 
    const safeRef = reference_code.substring(0, 40); 
    
    console.log(`[Router] Processing: ${safeType} for User ${user_id} - KES ${amount}`);

    // 1. Credit General Savings
    const depositRef = `DEP-${safeRef}`;
    await client.query(
        `INSERT INTO deposits (user_id, amount, type, transaction_ref, status, description) 
         VALUES ($1, $2, 'DEPOSIT', $3, 'COMPLETED', $4)
         ON CONFLICT (transaction_ref) DO NOTHING`, 
        [user_id, amount, depositRef, `Incoming Funds: ${safeType}`]
    );

    if (safeType === 'DEPOSIT') return;

    // 2. Deduct for Transfer
    const transferRef = `TRF-${safeRef}`;
    await client.query(
        `INSERT INTO deposits (user_id, amount, type, transaction_ref, status, description) 
         VALUES ($1, $2, 'DEPOSIT', $3, 'COMPLETED', $4)
         ON CONFLICT (transaction_ref) DO NOTHING`,
        [user_id, -amount, transferRef, `Transfer to: ${safeType.replace(/_/g, ' ')}`]
    );

    // 3. Credit Target
    if (safeType === 'LOAN_REPAYMENT') {
        const loanRes = await client.query(
            "SELECT id, amount_repaid, total_due, amount_requested FROM loan_applications WHERE user_id = $1 AND status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1",
            [user_id]
        );
        if (loanRes.rows.length > 0) {
            const loan = loanRes.rows[0];
            const newPaid = parseFloat(loan.amount_repaid) + parseFloat(amount);
            const total = parseFloat(loan.total_due || loan.amount_requested);
            const newStatus = newPaid >= total - 5 ? 'COMPLETED' : 'ACTIVE';

            await client.query("UPDATE loan_applications SET amount_repaid = $1, status = $2, updated_at = NOW() WHERE id = $3", [newPaid, newStatus, loan.id]);
        } else {
            // Refund if no loan
            await client.query("INSERT INTO deposits (user_id, amount, type, transaction_ref, status, description) VALUES ($1, $2, 'DEPOSIT', $3, 'COMPLETED', 'Refund: No Active Loan')", [user_id, amount, `RFD-${safeRef}`]);
        }
    } 
    else if (['LOAN_FORM_FEE', 'FEE_PAYMENT'].includes(safeType)) {
        const loanRes = await client.query("SELECT id FROM loan_applications WHERE user_id = $1 AND status = 'FEE_PENDING' ORDER BY created_at DESC LIMIT 1", [user_id]);
        if (loanRes.rows.length > 0) {
            await client.query("UPDATE loan_applications SET status = 'FEE_PAID', fee_transaction_ref = $1, fee_amount = $2 WHERE id = $3", [safeRef, amount, loanRes.rows[0].id]);
        }
    }
    else {
        // Custom Category or Share Capital
        const desc = safeType === 'SHARE_CAPITAL' ? 'Purchase of Shares' : `Contribution: ${safeType}`;
        await client.query(
            `INSERT INTO deposits (user_id, amount, type, transaction_ref, status, description) 
             VALUES ($1, $2, $3, $4, 'COMPLETED', $5) ON CONFLICT (transaction_ref) DO NOTHING`,
            [user_id, amount, safeType, safeRef, desc]
        );
    }
};

// --- MPESA HELPERS ---
const getMpesaToken = async () => {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
};

const initiateStkPush = async (userId, amount, phone, type) => {
    const token = await getMpesaToken();
    const date = new Date();
    const timestamp = date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2) + ("0" + date.getHours()).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ("0" + date.getSeconds()).slice(-2);
    const password = Buffer.from(process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp).toString('base64');
    
    let formattedPhone = phone.startsWith('0') ? '254' + phone.slice(1) : phone;

    const stkRes = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: Math.ceil(amount),
            PartyA: formattedPhone,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: process.env.MPESA_CALLBACK_URL,
            AccountReference: "SaccoPayment",
            TransactionDesc: (type || "Payment").substring(0, 13) 
        },
        { headers: { Authorization: `Bearer ${token}` } }
    );

    const { CheckoutRequestID, MerchantRequestID } = stkRes.data;
    await db.query(
        `INSERT INTO transactions (user_id, type, amount, status, reference_code, checkout_request_id, merchant_request_id, description) 
         VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7)`,
        [userId, type || 'DEPOSIT', amount, `PENDING-${CheckoutRequestID}`, CheckoutRequestID, MerchantRequestID, `M-Pesa STK: ${type}`]
    );
    
    return CheckoutRequestID;
};

const handleCallback = async (body) => {
    const { stkCallback } = body.Body;
    const checkoutReqId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;

    const txCheck = await db.query("SELECT * FROM transactions WHERE checkout_request_id = $1", [checkoutReqId]);
    if (txCheck.rows.length === 0) return;
    const transaction = txCheck.rows[0];

    if (resultCode === 0) {
        const items = stkCallback.CallbackMetadata?.Item || [];
        const mpesaReceipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || `MPESA-${Date.now()}`;

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                "UPDATE transactions SET status = 'COMPLETED', reference_code = $1, description = $2 WHERE id = $3",
                [mpesaReceipt, `STK Confirmed: ${transaction.type}`, transaction.id]
            );
            await processCompletedTransaction(client, { ...transaction, reference_code: mpesaReceipt });
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error("Callback Processing Error:", e);
        } finally {
            client.release();
        }
    } else {
        await db.query("UPDATE transactions SET status = 'FAILED', description = $1 WHERE id = $2", [stkCallback.ResultDesc || 'Failed', transaction.id]);
    }
};

// --- MANUAL & BANK ---
const recordManualDeposit = async (userId, type, amount, reference, description) => {
    await db.query(
        `INSERT INTO transactions (user_id, type, amount, status, reference_code, description) 
         VALUES ($1, $2, $3, 'PENDING', $4, $5)`,
        [userId, type || 'DEPOSIT', amount, reference, description]
    );
};

const reviewDeposit = async (transactionId, decision) => {
    if (!['COMPLETED', 'REJECTED'].includes(decision)) throw new Error("Invalid decision");

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const txRes = await client.query("SELECT * FROM transactions WHERE id = $1", [transactionId]);
        if (txRes.rows.length === 0) throw new Error("Transaction not found");
        const tx = txRes.rows[0];

        await client.query("UPDATE transactions SET status = $1 WHERE id = $2", [decision, transactionId]);

        if (decision === 'COMPLETED') {
            await processCompletedTransaction(client, tx);
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// --- ADMIN ---
const runComplianceCheck = async () => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        // Logic from previous complianceLogic.js
        const minDepositRes = await client.query("SELECT setting_value FROM system_settings WHERE setting_key = 'min_weekly_deposit'");
        const penaltyRes = await client.query("SELECT setting_value FROM system_settings WHERE setting_key = 'penalty_missed_savings'");
        const minDeposit = parseFloat(minDepositRes.rows[0]?.setting_value) || 250;
        const penalty = parseFloat(penaltyRes.rows[0]?.setting_value) || 50;

        const nonCompliant = await client.query(`
            SELECT id FROM users u
            WHERE u.role = 'MEMBER' AND u.is_active = TRUE
            AND u.id NOT IN (
                SELECT user_id FROM transactions WHERE type = 'DEPOSIT' AND status = 'COMPLETED' AND created_at >= date_trunc('week', CURRENT_DATE) GROUP BY user_id HAVING SUM(amount) >= $1
            )
            AND u.id NOT IN (
                SELECT user_id FROM member_fines WHERE title LIKE 'Missed Weekly Deposit%' AND date_created >= date_trunc('week', CURRENT_DATE)
            )
        `, [minDeposit]);

        for (const user of nonCompliant.rows) {
            await client.query(
                `INSERT INTO member_fines (user_id, title, original_amount, current_balance, description, status)
                 VALUES ($1, 'Missed Weekly Deposit', $2, $2, $3, 'PENDING')`,
                [user.id, penalty, `Penalty for missing ${minDeposit} deposit`]
            );
        }
        await client.query('COMMIT');
        return nonCompliant.rows.length;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// ADMIN: Admin manual record with instant approval
const adminRecordTransaction = async (userId, type, amount, reference, description) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `INSERT INTO transactions (user_id, type, amount, reference_code, description, status) 
             VALUES ($1, $2, $3, $4, $5, 'COMPLETED') RETURNING *`,
            [userId, type, amount, reference, description]
        );
        await processCompletedTransaction(client, result.rows[0]);
        await client.query('COMMIT');
        return result.rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const getPendingDeposits = async () => {
    const result = await db.query(
        `SELECT t.id, t.amount, t.reference_code, t.type, t.created_at, u.full_name, t.description 
         FROM transactions t JOIN users u ON t.user_id = u.id 
         WHERE t.status = 'PENDING' ORDER BY t.created_at ASC`
    );
    return result.rows;
};

const getAllTransactions = async () => {
    const result = await db.query(`SELECT t.*, u.full_name FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC`);
    return result.rows;
};

// Member claiming manual M-Pesa
const claimMpesaManual = async (userId, reference, purpose) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const check = await client.query("SELECT * FROM transactions WHERE reference_code = $1", [reference]);
        if (check.rows.length === 0) throw new Error("Transaction not found");
        const tx = check.rows[0];
        if (tx.status === 'COMPLETED') throw new Error("Already claimed");

        const finalType = purpose || tx.type || 'DEPOSIT';
        await client.query("UPDATE transactions SET user_id = $1, status = 'COMPLETED', type = $2, description = $3 WHERE id = $4", [userId, finalType, `Manual Claim: ${reference}`, tx.id]);
        await processCompletedTransaction(client, { ...tx, user_id: userId, type: finalType });
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

module.exports = { 
    initiateStkPush, handleCallback, recordManualDeposit, 
    reviewDeposit, runComplianceCheck, adminRecordTransaction,
    getPendingDeposits, getAllTransactions, claimMpesaManual 
};