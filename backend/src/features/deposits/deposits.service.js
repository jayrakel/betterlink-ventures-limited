const db = require('../../config/db');

const getUserBalance = async (userId) => {
    // Savings (Withdrawable)
    const savingsRes = await db.query(
        "SELECT COALESCE(SUM(amount), 0) as balance FROM deposits WHERE user_id = $1 AND status = 'COMPLETED' AND type = 'DEPOSIT'",
        [userId]
    );
    // Share Capital (Non-Withdrawable)
    const sharesRes = await db.query(
        "SELECT COALESCE(SUM(amount), 0) as balance FROM deposits WHERE user_id = $1 AND status = 'COMPLETED' AND type = 'SHARE_CAPITAL'",
        [userId]
    );

    return { 
        balance: parseFloat(savingsRes.rows[0].balance),
        shares: parseFloat(sharesRes.rows[0].balance) 
    };
};

const getHistory = async (userId) => {
    const result = await db.query(
        "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
        [userId]
    );
    return result.rows;
};

const getAllDeposits = async () => {
    const result = await db.query(
        `SELECT d.*, u.full_name 
         FROM deposits d 
         JOIN users u ON d.user_id = u.id 
         ORDER BY d.created_at DESC LIMIT 100`
    );
    return result.rows;
};

const requestWithdrawal = async (userId, amount) => {
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount <= 0) throw new Error("Invalid amount");

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check Savings Balance (Exclude Shares)
        const savingsRes = await client.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE user_id = $1 AND status = 'COMPLETED' AND type = 'DEPOSIT'",
            [userId]
        );
        const currentSavings = parseFloat(savingsRes.rows[0].total);

        if (currentSavings < withdrawAmount) {
            throw new Error("Insufficient withdrawable savings. Share Capital cannot be withdrawn.");
        }

        // 2. Check for Active Loan Guarantees (Locked Savings)
        const liabilityRes = await client.query(
            `SELECT COALESCE(SUM(amount_guaranteed), 0) as locked 
             FROM loan_guarantors 
             WHERE guarantor_id = $1 AND status = 'ACCEPTED'`,
            [userId]
        );
        const lockedAmount = parseFloat(liabilityRes.rows[0].locked);
        const freeSavings = currentSavings - lockedAmount;

        if (freeSavings < withdrawAmount) {
            throw new Error(`Funds locked by guarantees. You have guaranteed KES ${lockedAmount.toLocaleString()} in active loans.`);
        }

        // 3. Process Withdrawal (Deduction)
        const ref = `WTH-${Date.now()}`;
        
        await client.query(
            "INSERT INTO deposits (user_id, amount, type, transaction_ref, status) VALUES ($1, $2, 'WITHDRAWAL', $3, 'COMPLETED')",
            [userId, -withdrawAmount, ref]
        );

        await client.query(
            "INSERT INTO transactions (user_id, type, amount, reference_code, description) VALUES ($1, 'WITHDRAWAL', $2, $3, 'Withdrawal to M-Pesa')",
            [userId, withdrawAmount, ref]
        );

        await client.query('COMMIT');
        return { ref };

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { getUserBalance, getHistory, getAllDeposits, requestWithdrawal };