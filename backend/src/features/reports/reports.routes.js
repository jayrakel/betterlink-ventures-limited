const express = require('express');
const router = express.Router();
const controller = require('./reports.controller');
const { authenticateUser, authorizeRoles } = require('../../features/auth/auth.middleware');

// Analytics (Advanced)
router.get('/dashboard-summary', authenticateUser, controller.dashboardSummary);
router.get('/analytics/loans', authenticateUser, controller.loanAnalytics);
router.get('/analytics/deposits', authenticateUser, controller.depositAnalytics);
router.get('/financial/balance-sheet', authenticateUser, controller.balanceSheet);
router.get('/financial/income-statement', authenticateUser, controller.incomeStatement);
router.get('/financial/cash-flow', authenticateUser, controller.cashFlow);

// PDFs & Exports
router.get('/statement/me', authenticateUser, controller.downloadStatement);
router.get('/summary/download', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.downloadMasterLedger);
router.get('/export/:report_type', authenticateUser, controller.exportReport);

// Lists
router.get('/active-portfolio', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER', 'SECRETARY'), controller.activePortfolio);
router.get('/summary', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.summaryJson);

module.exports = router;