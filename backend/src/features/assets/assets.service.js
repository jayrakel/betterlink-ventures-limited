const db = require('../../config/db');

// --- FIXED ASSETS ---
const getFixedAssets = async () => {
    const result = await db.query("SELECT * FROM fixed_assets WHERE status = 'ACTIVE' ORDER BY created_at DESC");
    return result.rows;
};

const addFixedAsset = async (userId, data) => {
    const { name, type, value, location, description } = data;
    // Initial current_value equals purchase_value (value)
    await db.query(
        "INSERT INTO fixed_assets (name, type, purchase_value, current_value, location, description, created_by) VALUES ($1, $2, $3, $3, $4, $5, $6)",
        [name, type, value, location, description, userId]
    );
};

const revalueAsset = async (userId, id, newValue, notes) => {
    await db.query("UPDATE fixed_assets SET current_value = $1, updated_at = NOW() WHERE id = $2", [newValue, id]);
    
    // Optional: Log revaluation history if you have an audit table (not strictly required for MVP)
    // await db.query("INSERT INTO asset_valuations ...") 
};

// --- EXPENSES ---
const getExpenses = async () => {
    const result = await db.query("SELECT * FROM operational_expenses ORDER BY expense_date DESC");
    return result.rows;
};

const addExpense = async (userId, data) => {
    const { title, category, amount, description, receipt_ref, assetId } = data;
    
    await db.query(
        "INSERT INTO operational_expenses (title, category, amount, description, receipt_ref, incurred_by) VALUES ($1, $2, $3, $4, $5, $6)",
        [title, category, amount, description, receipt_ref, userId]
    );

    // Depreciation Logic: Automatically reduce asset value
    if (category === 'DEPRECIATION' && assetId) {
        await db.query("UPDATE fixed_assets SET current_value = current_value - $1 WHERE id = $2", [amount, assetId]);
    }
};

module.exports = { getFixedAssets, addFixedAsset, revalueAsset, getExpenses, addExpense };