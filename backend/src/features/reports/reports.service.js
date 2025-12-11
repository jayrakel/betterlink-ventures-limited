const db = require('../../config/db');

// --- 1. DASHBOARD & ANALYTICS ---

const getDashboardSummary = async () => {
    // ✅ FIX: Added COALESCE to force 0 if table is empty or values are null
    const portfolioRes = await db.query(`SELECT COALESCE(SUM(total_due - amount_repaid), 0) as total FROM loan_applications WHERE status = 'ACTIVE'`);
    const depositsRes = await db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'COMPLETED'`);
    
    // ✅ FIX: Ensure we select current_value, not 'value'
    const assetsRes = await db.query(`SELECT COALESCE(SUM(current_value), 0) as total FROM fixed_assets WHERE status = 'ACTIVE'`);
    
    const totalPortfolio = parseFloat(portfolioRes.rows[0].total) || 0;
    const fixedAssets = parseFloat(assetsRes.rows[0].total) || 0; // This prevents NaN
    const totalDeposits = parseFloat(depositsRes.rows[0].total) || 0;

    // ... rest of the function remains the same ...
    
    const loansCountRes = await db.query(`SELECT COUNT(*) as count FROM loan_applications WHERE status = 'ACTIVE'`);
    const activeLoans = parseInt(loansCountRes.rows[0].count) || 0;

    const defaultRes = await db.query(`
        SELECT 
            COUNT(*) FILTER (WHERE status = 'DEFAULT') as defaulted,
            COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'COMPLETED', 'DEFAULT')) as total
        FROM loan_applications
    `);
    const defaulted = parseInt(defaultRes.rows[0].defaulted) || 0;
    const totalLoans = parseInt(defaultRes.rows[0].total) || 0;
    const defaultRate = totalLoans > 0 ? ((defaulted / totalLoans) * 100).toFixed(1) + '%' : '0%';

    return {
        assets: { total: totalPortfolio + fixedAssets },
        liabilities: { total: totalDeposits },
        summary: { active_loans: activeLoans },
        ratios: { default_rate: defaultRate }
    };
};

const getLoanAnalytics = async () => {
    const loansRes = await db.query(
      `SELECT 
        COALESCE(COUNT(DISTINCT id) FILTER (WHERE status = 'ACTIVE'), 0) as active_loans,
        COALESCE(COUNT(DISTINCT id) FILTER (WHERE status IN ('ACTIVE', 'COMPLETED')), 0) as total_loans,
        COALESCE(SUM(total_due - amount_repaid) FILTER (WHERE status = 'ACTIVE'), 0) as total_outstanding,
        COALESCE(SUM(amount_repaid) FILTER (WHERE status = 'COMPLETED'), 0) as total_repaid,
        COALESCE(SUM(total_due) FILTER (WHERE status = 'DEFAULT'), 0) as total_defaulted,
        COALESCE(SUM(total_due) FILTER (WHERE status = 'OVERDUE'), 0) as total_overdue,
        COALESCE(AVG(amount_requested), 0) as avg_loan_amount,
        COALESCE(AVG(interest_amount), 0) as avg_interest
       FROM loan_applications`
    );
    const loans = loansRes.rows[0] || {};
    const total_loans = parseInt(loans.total_loans) || 0;
    const total_defaulted = parseInt(loans.total_defaulted) || 0;
    
    return {
      summary: {
        active_loans: parseInt(loans.active_loans) || 0,
        total_loans: total_loans,
        total_portfolio: parseFloat(loans.total_outstanding) || 0,
        total_repaid: parseFloat(loans.total_repaid) || 0,
        total_defaulted: total_defaulted,
        total_overdue: parseInt(loans.total_overdue) || 0
      },
      ratios: {
        default_rate: total_loans > 0 ? ((total_defaulted / total_loans) * 100).toFixed(2) + '%' : '0%',
        repayment_rate: total_loans > 0 ? (((total_loans - total_defaulted) / total_loans) * 100).toFixed(2) + '%' : '0%'
      },
      averages: {
        average_loan: loans.avg_loan_amount ? parseFloat(loans.avg_loan_amount).toFixed(2) : 0,
        average_interest: loans.avg_interest ? parseFloat(loans.avg_interest).toFixed(2) : 0
      }
    };
};

const getDepositAnalytics = async () => {
    const depositsRes = await db.query(
      `SELECT 
        COALESCE(COUNT(DISTINCT user_id), 0) as total_members,
        COALESCE(COUNT(DISTINCT id), 0) as total_deposits,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_deposit,
        COALESCE(SUM(CASE WHEN (type = 'SHARE_CAPITAL' OR category = 'SHARE_CAPITAL') THEN amount ELSE 0 END), 0) as share_capital_total,
        COALESCE(SUM(CASE WHEN (type = 'EMERGENCY_FUND' OR category = 'EMERGENCY_FUND') THEN amount ELSE 0 END), 0) as emergency_fund_total,
        COALESCE(SUM(CASE WHEN (type = 'WELFARE' OR category = 'WELFARE') THEN amount ELSE 0 END), 0) as welfare_total
       FROM deposits WHERE status = 'COMPLETED'`
    );
    const deposits = depositsRes.rows[0] || {};
    const total_members = parseInt(deposits.total_members) || 0;
    const total_amount = parseFloat(deposits.total_amount) || 0;

    return {
      summary: { total_members, total_deposits: parseInt(deposits.total_deposits)||0, total_amount },
      by_category: {
        share_capital: parseFloat(deposits.share_capital_total) || 0,
        emergency_fund: parseFloat(deposits.emergency_fund_total) || 0,
        welfare: parseFloat(deposits.welfare_total) || 0
      },
      averages: {
        average_deposit: deposits.avg_deposit ? parseFloat(deposits.avg_deposit).toFixed(2) : 0,
        average_per_member: total_members > 0 ? (total_amount / total_members).toFixed(2) : 0
      }
    };
};

// --- 2. FINANCIAL STATEMENTS ---

const getBalanceSheetData = async (date) => {
    // 1. Cash (Net of Inflows - Outflows - Expenses)
    const cashRes = await db.query(`SELECT SUM(CASE WHEN type IN ('DEPOSIT', 'SAVINGS', 'SHARE_CAPITAL', 'REGISTRATION_FEE', 'LOAN_REPAYMENT') THEN amount ELSE 0 END) - SUM(CASE WHEN type IN ('WITHDRAWAL', 'LOAN_DISBURSEMENT') THEN amount ELSE 0 END) as net_cash FROM transactions WHERE status = 'COMPLETED' AND created_at <= $1`, [date]);
    const expRes = await db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM operational_expenses WHERE expense_date <= $1`, [date]);
    const cash_at_hand = (parseFloat(cashRes.rows[0].net_cash) || 0) - (parseFloat(expRes.rows[0].total) || 0);

    // 2. Loans
    const loansRes = await db.query(`SELECT COALESCE(SUM(total_due - amount_repaid), 0) as outstanding FROM loan_applications WHERE status = 'ACTIVE' AND created_at <= $1`, [date]);
    const loans_outstanding = parseFloat(loansRes.rows[0].outstanding) || 0;

    // 3. Fixed Assets
    // Note: Ensure you ran the repair_schema.js to add purchase_date!
    const fixedRes = await db.query(`SELECT COALESCE(SUM(current_value), 0) as total, COALESCE(SUM(current_value) FILTER (WHERE type = 'LAND'), 0) as land, COALESCE(SUM(current_value) FILTER (WHERE type = 'BUILDING'), 0) as buildings, COALESCE(SUM(current_value) FILTER (WHERE type NOT IN ('LAND', 'BUILDING')), 0) as other FROM fixed_assets WHERE status = 'ACTIVE'`, []);
    const fixed_assets = fixedRes.rows[0];

    const totalAssets = cash_at_hand + loans_outstanding + (parseFloat(fixed_assets.total) || 0);

    // 4. Liabilities
    const liabRes = await db.query(`SELECT COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'SAVINGS') THEN amount ELSE 0 END), 0) as member_savings, COALESCE(SUM(CASE WHEN type = 'EMERGENCY_FUND' THEN amount ELSE 0 END), 0) as emergency_fund, COALESCE(SUM(CASE WHEN type = 'WELFARE' THEN amount ELSE 0 END), 0) as welfare_fund FROM deposits WHERE created_at <= $1 AND status = 'COMPLETED'`, [date]);
    const liabs = liabRes.rows[0];
    const totalLiabilities = (parseFloat(liabs.member_savings)||0) + (parseFloat(liabs.emergency_fund)||0) + (parseFloat(liabs.welfare_fund)||0);

    // 5. Equity
    const eqRes = await db.query(`SELECT COALESCE(SUM(amount), 0) as share_capital FROM deposits WHERE type = 'SHARE_CAPITAL' AND created_at <= $1`, [date]);
    const share_capital = parseFloat(eqRes.rows[0].share_capital) || 0;
    const retained_earnings = totalAssets - (totalLiabilities + share_capital);

    return {
        cash_at_hand, loans_outstanding, fixed_assets, totalAssets,
        liabs, totalLiabilities,
        share_capital, retained_earnings
    };
};

const getIncomeStatementData = async (startDate, endDate) => {
    const interestRes = await db.query(`SELECT COALESCE(SUM(interest_amount), 0) as val FROM loan_applications WHERE created_at BETWEEN $1 AND $2`, [startDate, endDate]);
    const penaltyRes = await db.query(`SELECT COALESCE(SUM(amount), 0) as val FROM transactions WHERE (type = 'PENALTY' OR type = 'FINE' OR type = 'REGISTRATION_FEE') AND created_at BETWEEN $1 AND $2`, [startDate, endDate]);
    const expRes = await db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM operational_expenses WHERE expense_date BETWEEN $1 AND $2`, [startDate, endDate]);
    
    // Note: Ensure repair_schema.js added payment_date to dividend_allocations
    let dividendsPaid = 0;
    try {
        const divRes = await db.query(`SELECT COALESCE(SUM(dividend_amount), 0) as val FROM dividend_allocations WHERE status = 'PAID' AND payment_date BETWEEN $1 AND $2`, [startDate, endDate]);
        dividendsPaid = parseFloat(divRes.rows[0].val);
    } catch(e) { console.log("Dividends table issue, skipping..."); }

    return {
        interest: parseFloat(interestRes.rows[0].val),
        penalties: parseFloat(penaltyRes.rows[0].val),
        expenses: parseFloat(expRes.rows[0].total),
        dividends: dividendsPaid
    };
};

const getCashFlowData = async (startDate, endDate) => {
    const operatingRes = await db.query(
      `SELECT SUM(CASE WHEN type IN ('DEPOSIT', 'SAVINGS', 'SHARE_CAPITAL', 'REGISTRATION_FEE') THEN amount ELSE 0 END) as money_in, SUM(CASE WHEN type IN ('WITHDRAWAL', 'LOAN_DISBURSEMENT') THEN amount ELSE 0 END) as money_out, SUM(CASE WHEN type = 'LOAN_REPAYMENT' THEN amount ELSE 0 END) as loan_repayments FROM transactions WHERE created_at BETWEEN $1 AND $2 AND (status = 'COMPLETED' OR status IS NULL)`, 
      [startDate, endDate]
    );
    const expenseRes = await db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM operational_expenses WHERE expense_date BETWEEN $1 AND $2`, [startDate, endDate]);
    
    let investingOutflow = 0;
    try {
        const investingRes = await db.query(`SELECT COALESCE(SUM(dividend_amount), 0) as dividend_distributions FROM dividend_allocations WHERE status = 'PAID' AND payment_date BETWEEN $1 AND $2`, [startDate, endDate]);
        investingOutflow = parseFloat(investingRes.rows[0].dividend_distributions) || 0;
    } catch(e) { investingOutflow = 0; }

    return {
        operating: operatingRes.rows[0],
        opExpenses: parseFloat(expenseRes.rows[0].total) || 0,
        investingOutflow
    };
};

// --- 3. MEMBER DATA ---

const getMemberStatementData = async (userId) => {
    const userRes = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    const txRes = await db.query("SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at ASC", [userId]);
    return { user: userRes.rows[0], transactions: txRes.rows };
};

const getActivePortfolio = async () => {
    // SAFE QUERY: Uses COALESCE to prevent crashes on NULL values
    const result = await db.query(`
        SELECT 
            l.id, 
            u.full_name, 
            COALESCE(l.total_due, 0) as total_due, 
            COALESCE(l.amount_repaid, 0) as amount_repaid, 
            (COALESCE(l.total_due, 0) - COALESCE(l.amount_repaid, 0)) as outstanding_balance, 
            l.disbursed_at, 
            COALESCE(l.amount_requested, 0) as principal,
            CASE 
                WHEN COALESCE(l.total_due, 0) > 0 THEN 
                    ROUND((COALESCE(l.amount_repaid, 0)::numeric / COALESCE(l.total_due, 1)::numeric) * 100, 1) 
                ELSE 0 
            END as progress
        FROM loan_applications l 
        JOIN users u ON l.user_id = u.id 
        WHERE l.status = 'ACTIVE' 
        ORDER BY l.created_at DESC
    `);
    return result.rows;
};

// --- 4. EXPORT HELPERS ---

const getSaccoDetails = async () => {
    try {
        const res = await db.query("SELECT setting_key, setting_value FROM system_settings WHERE category = 'SACCO' OR setting_key LIKE 'sacco_%'");
        const settings = {};
        res.rows.forEach(r => settings[r.setting_key] = r.setting_value);
        return {
            name: settings['sacco_name'] || 'Sacco System',
            address: settings['sacco_address'] || 'P.O Box 12345, Nairobi, Kenya',
            email: settings['sacco_email'] || 'info@sacco.com',
            phone: settings['sacco_phone'] || '+254 700 000 000',
            logo: settings['sacco_logo'] 
        };
    } catch (e) {
        return { name: 'Sacco System', address: 'P.O Box 12345', email: 'admin@sacco.com', phone: '', logo: null };
    }
};

const getFullLedgerData = async () => {
    const savingsRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'COMPLETED' AND type = 'DEPOSIT'");
    const revenueRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type IN ('FINE', 'PENALTY', 'REGISTRATION_FEE', 'LOAN_FORM_FEE', 'FEE_PAYMENT')");
    const loansRes = await db.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount_requested), 0) as principal, COALESCE(SUM(interest_amount), 0) as interest, COALESCE(SUM(amount_repaid), 0) as repaid, COALESCE(SUM(total_due), 0) as total_due FROM loan_applications WHERE status = 'ACTIVE'`);
    const liquidityRes = await db.query(`SELECT COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'LOAN_REPAYMENT', 'FINE', 'PENALTY', 'REGISTRATION_FEE', 'FEE_PAYMENT') THEN amount ELSE 0 END), 0) as inflow, COALESCE(SUM(CASE WHEN type IN ('LOAN_DISBURSEMENT', 'WITHDRAWAL') THEN amount ELSE 0 END), 0) as outflow FROM transactions`);
    const recentTx = await db.query(`SELECT t.*, u.full_name FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC LIMIT 50`);

    return {
        netSavings: parseFloat(savingsRes.rows[0].total),
        totalRevenue: parseFloat(revenueRes.rows[0].total),
        loanStats: loansRes.rows[0],
        cashOnHand: parseFloat(liquidityRes.rows[0].inflow) - parseFloat(liquidityRes.rows[0].outflow),
        recentTx: recentTx.rows
    };
};

module.exports = {
    getDashboardSummary, getLoanAnalytics, getDepositAnalytics,
    getBalanceSheetData, getIncomeStatementData, getCashFlowData,
    getMemberStatementData, getActivePortfolio, getSaccoDetails, getFullLedgerData
};