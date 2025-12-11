const express = require('express');
const router = express.Router();
const controller = require('./loans.controller');
const { authenticateUser, requireRole, authorizeRoles } = require('../auth/auth.middleware');

// --- Member Routes ---
router.get('/status', authenticateUser, controller.getMyStatus);
router.post('/init', authenticateUser, controller.initApp);
router.post('/submit', authenticateUser, controller.submitApp);
router.post('/guarantors/add', authenticateUser, controller.addGuarantor);
router.post('/guarantors/respond', authenticateUser, controller.respondGuarantor);
router.post('/vote', authenticateUser, controller.castVote);

// --- Role Routes ---
router.get('/officer/applications', authenticateUser, requireRole('LOAN_OFFICER'), controller.officerList);
router.post('/officer/verify', authenticateUser, requireRole('LOAN_OFFICER'), controller.verifyLoan);

router.get('/agenda', authenticateUser, requireRole('SECRETARY'), controller.secretaryList);
router.post('/table', authenticateUser, requireRole('SECRETARY'), controller.tableLoan);
router.post('/secretary/finalize', authenticateUser, requireRole('SECRETARY'), controller.secretaryFinalize);

router.post('/chair/open-voting', authenticateUser, requireRole('CHAIRPERSON'), controller.chairOpenVote);

router.get('/treasury/queue', authenticateUser, requireRole('TREASURER'), controller.treasuryList);
router.post('/treasury/disburse', authenticateUser, requireRole('TREASURER'), controller.disburse);

module.exports = router;