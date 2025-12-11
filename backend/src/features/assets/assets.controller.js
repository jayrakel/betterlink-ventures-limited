const assetService = require('./assets.service');

const listAssets = async (req, res) => {
    try {
        const assets = await assetService.getFixedAssets();
        res.json(assets);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const createAsset = async (req, res) => {
    try {
        await assetService.addFixedAsset(req.user.id, req.body);
        res.json({ message: "Asset added" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateValuation = async (req, res) => {
    try {
        await assetService.revalueAsset(req.user.id, req.params.id, req.body.new_value, req.body.notes);
        res.json({ message: "Asset revalued successfully" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const listExpenses = async (req, res) => {
    try {
        const expenses = await assetService.getExpenses();
        res.json(expenses);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const createExpense = async (req, res) => {
    try {
        await assetService.addExpense(req.user.id, req.body);
        res.json({ message: "Expense recorded" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { listAssets, createAsset, updateValuation, listExpenses, createExpense };