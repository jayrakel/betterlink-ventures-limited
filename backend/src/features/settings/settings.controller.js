const settingsService = require('./settings.service');

const getSettings = async (req, res) => {
    try {
        const settings = await settingsService.getAllSettings();
        res.json(settings);
    } catch (err) { res.status(500).json({ error: "Failed to fetch settings" }); }
};

const getBranding = async (req, res) => {
    try {
        const branding = await settingsService.getBranding();
        res.json(branding);
    } catch (err) { res.status(500).json({ error: "Failed to fetch branding" }); }
};

const updateSetting = async (req, res) => {
    try {
        await settingsService.updateSetting(req.body.key, req.body.value);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
};

const getCategories = async (req, res) => {
    try {
        const cats = await settingsService.getCategories();
        res.json(cats);
    } catch (err) { res.status(500).json({ error: "Failed to fetch categories" }); }
};

const createCategory = async (req, res) => {
    try {
        await settingsService.createCategory(req.body.name, req.body.description, req.body.amount);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Creation failed" }); }
};

const deleteCategory = async (req, res) => {
    try {
        await settingsService.deleteCategory(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Delete failed" }); }
};

module.exports = { getSettings, getBranding, updateSetting, getCategories, createCategory, deleteCategory };