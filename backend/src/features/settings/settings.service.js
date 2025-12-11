const db = require('../../config/db');

const getAllSettings = async () => {
    const result = await db.query("SELECT * FROM system_settings ORDER BY category, setting_key ASC");
    return result.rows;
};

const getBranding = async () => {
    const result = await db.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('sacco_logo', 'sacco_favicon', 'sacco_name')");
    return result.rows;
};

const updateSetting = async (key, value) => {
    await db.query("UPDATE system_settings SET setting_value = $1 WHERE setting_key = $2", [value, key]);
};

// Contribution Categories
const getCategories = async () => {
    const result = await db.query("SELECT * FROM contribution_categories WHERE is_active = TRUE ORDER BY name ASC");
    return result.rows;
};

const createCategory = async (name, description, amount) => {
    const code = name.toUpperCase().replace(/\s+/g, '_');
    await db.query(
        "INSERT INTO contribution_categories (name, description, amount) VALUES ($1, $2, $3)",
        [code, description || name, amount || 0]
    );
};

const deleteCategory = async (id) => {
    await db.query("UPDATE contribution_categories SET is_active = FALSE WHERE id = $1", [id]);
};

module.exports = { getAllSettings, getBranding, updateSetting, getCategories, createCategory, deleteCategory };