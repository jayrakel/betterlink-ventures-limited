const cmsService = require('./cms.service');

const getContent = async (req, res) => {
    try {
        const data = await cmsService.getPublicContent();
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateText = async (req, res) => {
    try {
        await cmsService.updateTextContent(req.user.id, req.body.key, req.body.value);
        res.json({ message: "Content updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const addHistory = async (req, res) => {
    try {
        const { title, date, description } = req.body;
        await cmsService.addHistoryEvent(title, date, description);
        res.json({ message: "History added" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateHistory = async (req, res) => {
    try {
        const { title, date, description } = req.body;
        await cmsService.updateHistoryEvent(req.params.id, title, date, description);
        res.json({ message: "History updated" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteHistory = async (req, res) => {
    try {
        await cmsService.deleteHistoryEvent(req.params.id);
        res.json({ message: "History deleted" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const uploadMinutes = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        const { title, date } = req.body;
        await cmsService.addMinutes(title, date, req.file.filename);
        res.json({ message: "Minutes uploaded" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const removeMinutes = async (req, res) => {
    try {
        await cmsService.deleteMinutes(req.params.id);
        res.json({ message: "Document deleted" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { 
    getContent, updateText, 
    addHistory, updateHistory, deleteHistory,
    uploadMinutes, removeMinutes 
};