const finesService = require('./fines.service');

const getMyFines = async (req, res) => {
    try {
        const fines = await finesService.getMemberFines(req.user.id);
        res.json(fines);
    } catch (err) { res.status(500).json({ error: "Failed to fetch fines" }); }
};

const impose = async (req, res) => {
    try {
        await finesService.imposeFine(req.body);
        res.json({ message: "Fine imposed successfully" });
    } catch (err) { res.status(500).json({ error: "Failed to impose fine" }); }
};

module.exports = { getMyFines, impose };