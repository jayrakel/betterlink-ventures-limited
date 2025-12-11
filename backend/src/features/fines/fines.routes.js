const express = require('express');
const router = express.Router();
const controller = require('./fines.controller');
const { authenticateUser, authorizeRoles } = require('../../features/auth/auth.middleware');

router.get('/my-fines', authenticateUser, controller.getMyFines);
router.post('/impose', authenticateUser, authorizeRoles('ADMIN', 'SECRETARY', 'CHAIRPERSON'), controller.impose);

module.exports = router;