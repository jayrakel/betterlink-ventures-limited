const express = require('express');
const router = express.Router();
const controller = require('./dividends.controller');
const { authenticateUser, authorizeRoles } = require('../../features/auth/auth.middleware');

router.get('/', authenticateUser, controller.list);
router.post('/declare', authenticateUser, authorizeRoles('ADMIN', 'TREASURER'), controller.declare);
router.post('/:dividendId/calculate', authenticateUser, authorizeRoles('ADMIN', 'TREASURER'), controller.calculate);

module.exports = router;