const db = require('../../config/db');

const declareDividend = async (userId, data) => {
    const { financial_year, dividend_rate, total_amount, description } = data;
    const existing = await db.query('SELECT id FROM dividends WHERE financial_year = $1 AND status != $2', [financial_year, 'CANCELLED']);
    if (existing.rows.length > 0) throw new Error('Dividend already declared for this year');

    const result = await db.query(
        `INSERT INTO dividends (financial_year, dividend_rate, total_amount, status, declared_by, description)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [financial_year, dividend_rate, total_amount, 'PENDING', userId, description]
    );
    return result.rows[0];
};

const calculateAllocations = async (dividendId, method, userId) => {
    const dividendRes = await db.query('SELECT * FROM dividends WHERE id = $1', [dividendId]);
    if (dividendRes.rows.length === 0) throw new Error('Dividend not found');
    const dividend = dividendRes.rows[0];

    const membersRes = await db.query(
        `SELECT u.id, COALESCE(SUM(CASE WHEN d.type = 'SHARE_CAPITAL' THEN d.amount ELSE 0 END), 0) as share_capital
         FROM users u LEFT JOIN deposits d ON u.id = d.user_id AND d.status = 'COMPLETED'
         WHERE u.role = 'MEMBER' AND u.is_active = true GROUP BY u.id HAVING COALESCE(SUM(CASE WHEN d.type = 'SHARE_CAPITAL' THEN d.amount ELSE 0 END), 0) > 0`
    );
    const members = membersRes.rows;
    if (members.length === 0) throw new Error('No eligible members found');

    const totalShares = members.reduce((sum, m) => sum + parseFloat(m.share_capital), 0);
    
    await db.query('BEGIN');
    try {
        for (const m of members) {
            const amount = method === 'SHARE_BASED' 
                ? (parseFloat(m.share_capital) / totalShares) * dividend.total_amount
                : dividend.total_amount / members.length;
                
            await db.query(
                `INSERT INTO dividend_allocations (dividend_id, member_id, share_value, dividend_amount, status) VALUES ($1, $2, $3, $4, $5)`,
                [dividendId, m.id, m.share_capital, amount, 'PENDING']
            );
        }
        await db.query('COMMIT');
        return { count: members.length };
    } catch (e) { await db.query('ROLLBACK'); throw e; }
};

const getAllDividends = async () => {
    const result = await db.query("SELECT * FROM dividends ORDER BY financial_year DESC");
    return result.rows;
};

module.exports = { declareDividend, calculateAllocations, getAllDividends };