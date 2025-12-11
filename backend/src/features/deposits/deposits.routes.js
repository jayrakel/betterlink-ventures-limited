const express = require('express');
const router = express.Router();
const controller = require('./deposits.controller');
const { authenticateUser, authorizeRoles } = require('../../features/auth/auth.middleware');

router.get('/balance', authenticateUser, controller.getBalance);
router.get('/history', authenticateUser, controller.getHistory);
router.get('/admin/all', authenticateUser, authorizeRoles('ADMIN', 'TREASURER', 'CHAIRPERSON'), controller.listAll);
router.post('/withdraw', authenticateUser, controller.withdraw);

module.exports = router;