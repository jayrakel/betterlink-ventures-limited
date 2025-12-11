const express = require('express');
const router = express.Router();
const controller = require('./assets.controller');
const { authenticateUser, authorizeRoles } = require('../../features/auth/auth.middleware');

// Assets
router.get('/fixed', authenticateUser, controller.listAssets);
router.post('/fixed', authenticateUser, authorizeRoles('ADMIN', 'TREASURER', 'CHAIRPERSON'), controller.createAsset);
router.put('/fixed/:id/revalue', authenticateUser, authorizeRoles('ADMIN', 'TREASURER'), controller.updateValuation);

// Expenses
router.get('/expenses', authenticateUser, controller.listExpenses);
router.post('/expenses', authenticateUser, authorizeRoles('ADMIN', 'TREASURER', 'CHAIRPERSON', 'SECRETARY'), controller.createExpense);

module.exports = router;