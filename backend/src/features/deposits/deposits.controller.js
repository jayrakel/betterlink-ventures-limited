const depositService = require('./deposits.service');

const getBalance = async (req, res) => {
    try {
        const balance = await depositService.getUserBalance(req.user.id);
        res.json(balance);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const getHistory = async (req, res) => {
    try {
        const history = await depositService.getHistory(req.user.id);
        res.json(history);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const listAll = async (req, res) => {
    try {
        const list = await depositService.getAllDeposits();
        res.json(list);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

const withdraw = async (req, res) => {
    try {
        const result = await depositService.requestWithdrawal(req.user.id, req.body.amount);
        res.json({ success: true, message: "Withdrawal processed successfully", ref: result.ref });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

module.exports = { getBalance, getHistory, listAll, withdraw };