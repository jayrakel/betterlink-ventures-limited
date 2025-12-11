const loanService = require('./loans.service');

// Member Actions
const getMyStatus = async (req, res) => {
    try {
        const status = await loanService.getMemberLoanStatus(req.user.id);
        res.json(status);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const initApp = async (req, res) => {
    try {
        const loan = await loanService.initApplication(req.user.id);
        res.json(loan);
    } catch (e) { res.status(400).json({ error: e.message }); }
};

const submitApp = async (req, res) => {
    try {
        await loanService.submitApplicationDetails(req.user.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

const addGuarantor = async (req, res) => {
    try {
        await loanService.addGuarantor(req.user.id, req.body.loanId, req.body.guarantorId);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

const respondGuarantor = async (req, res) => {
    try {
        await loanService.respondToGuarantorRequest(req.user.id, req.body.requestId, req.body.decision);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

const castVote = async (req, res) => {
    try {
        await loanService.castVote(req.user.id, req.body.loanId, req.body.decision);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// Role Actions
const officerList = async (req, res) => {
    const list = await loanService.getOfficerQueue();
    res.json(list);
};

const verifyLoan = async (req, res) => {
    await loanService.verifyApplication(req.body.loanId);
    res.json({ success: true });
};

const secretaryList = async (req, res) => {
    const list = await loanService.getSecretaryQueue();
    res.json(list);
};

const tableLoan = async (req, res) => {
    await loanService.tableApplication(req.body.loanId);
    res.json({ success: true });
};

const chairOpenVote = async (req, res) => {
    await loanService.openVoting(req.body.loanId);
    res.json({ success: true });
};

const secretaryFinalize = async (req, res) => {
    await loanService.finalizeVote(req.body.loanId, req.body.decision);
    res.json({ success: true });
};

const treasuryList = async (req, res) => {
    const list = await loanService.getTreasuryQueue();
    res.json(list);
};

const disburse = async (req, res) => {
    try {
        await loanService.disburseLoan(req.user.id, req.body.loanId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- DATA ACCESSORS (MISSING FUNCTIONS ADDED HERE) ---

const getGuarantorRequests = async (req, res) => {
    try {
        const list = await loanService.getGuarantorRequests(req.user.id);
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const searchMembers = async (req, res) => {
    try {
        const list = await loanService.searchMembers(req.user.id, req.query.q);
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const getMyGuarantors = async (req, res) => {
    try {
        const list = await loanService.getMyGuarantors(req.user.id);
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const getOpenVotes = async (req, res) => {
    try {
        const list = await loanService.getOpenVotes(req.user.id);
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const getChairAgenda = async (req, res) => {
    try {
        const list = await loanService.getChairAgenda();
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const getLiveTally = async (req, res) => {
    try {
        const list = await loanService.getLiveTally();
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const announceMeeting = async (req, res) => {
    try {
        await loanService.announceMeeting(req.body.meetingDate, req.body.extraAgendas);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const getTreasuryStats = async (req, res) => {
    try {
        const stats = await loanService.getTreasuryStats();
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
    getMyStatus, initApp, submitApp, addGuarantor, respondGuarantor, castVote,
    officerList, verifyLoan,
    secretaryList, tableLoan, secretaryFinalize,
    chairOpenVote,
    treasuryList, disburse,
    // Exporting the missing controllers
    getGuarantorRequests, searchMembers, getMyGuarantors,
    getOpenVotes, getChairAgenda, getLiveTally, announceMeeting,
    getTreasuryStats
};