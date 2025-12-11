const paymentService = require('./payments.service');

const stkPush = async (req, res) => {
    try {
        const { amount, phoneNumber, type } = req.body;
        const checkoutId = await paymentService.initiateStkPush(req.user.id, amount, phoneNumber, type);
        res.json({ success: true, message: "STK Push sent.", checkoutReqId: checkoutId });
    } catch (e) { res.status(500).json({ error: "STK Push Failed" }); }
};

const mpesaCallback = async (req, res) => {
    try {
        await paymentService.handleCallback(req.body);
        res.sendStatus(200);
    } catch (e) { res.sendStatus(200); }
};

const bankDeposit = async (req, res) => {
    try {
        const { amount, reference, bankName, type } = req.body;
        await paymentService.recordManualDeposit(req.user.id, type, amount, reference, `Bank: ${bankName}`);
        res.json({ success: true, message: "Recorded. Waiting for approval." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const paypalDeposit = async (req, res) => {
    try {
        const { amount, reference, type } = req.body;
        await paymentService.recordManualDeposit(req.user.id, type, amount, reference, 'PayPal Transfer');
        res.json({ success: true, message: "Recorded. Waiting for approval." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const claimManual = async (req, res) => {
    try {
        await paymentService.claimMpesaManual(req.user.id, req.body.reference, req.body.purpose);
        res.json({ success: true, message: "Claimed successfully." });
    } catch (e) { res.status(400).json({ error: e.message }); }
};

// Admin
const getPending = async (req, res) => {
    try {
        const list = await paymentService.getPendingDeposits();
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const review = async (req, res) => {
    try {
        await paymentService.reviewDeposit(req.body.transactionId || req.body.depositId, req.body.decision);
        res.json({ success: true, message: `Transaction ${req.body.decision}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const adminRecord = async (req, res) => {
    try {
        let { userId, type, amount, reference, description } = req.body;
        if (!reference) reference = `AUTO-${Date.now()}`;
        const tx = await paymentService.adminRecordTransaction(userId, type, amount, reference, description);
        res.json({ success: true, transaction: tx });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const getAll = async (req, res) => {
    try {
        const list = await paymentService.getAllTransactions();
        res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const runCompliance = async (req, res) => {
    try {
        const count = await paymentService.runComplianceCheck();
        res.json({ message: `Compliance check complete. ${count} fined.` });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { stkPush, mpesaCallback, bankDeposit, paypalDeposit, claimManual, getPending, review, adminRecord, getAll, runCompliance };