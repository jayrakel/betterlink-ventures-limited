const express = require('express');
const router = express.Router();
const controller = require('./payments.controller');
const { authenticateUser, authorizeRoles } = require('../../features/auth/auth.middleware');

// Public Callback
router.post('/mpesa/callback', controller.mpesaCallback);

// Member
router.post('/mpesa/stk-push', authenticateUser, controller.stkPush);
router.post('/mpesa/manual', authenticateUser, controller.claimManual);
router.post('/bank/deposit', authenticateUser, controller.bankDeposit);
router.post('/paypal/deposit', authenticateUser, controller.paypalDeposit);

// Admin
router.get('/admin/deposits/pending', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.getPending);
router.post('/admin/deposits/review', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.review);
router.post('/admin/record', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.adminRecord);
router.get('/admin/all', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.getAll);
router.post('/admin/run-weekly-compliance', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.runCompliance);

module.exports = router;