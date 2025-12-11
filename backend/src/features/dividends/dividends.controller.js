const service = require('./dividends.service');

const declare = async (req, res) => {
    try {
        const div = await service.declareDividend(req.user.id, req.body);
        res.json({ success: true, dividend: div });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

const calculate = async (req, res) => {
    try {
        const result = await service.calculateAllocations(req.params.dividendId, req.body.calculation_method, req.user.id);
        res.json({ success: true, ...result });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

const list = async (req, res) => {
    const result = await service.getAllDividends();
    res.json(result);
};

module.exports = { declare, calculate, list };