const express = require('express');
const router = express.Router();
const controller = require('./members.controller');
const { authenticateUser, authorizeRoles } = require('../auth/auth.middleware');

router.get('/profile', authenticateUser, controller.getMyProfile);
router.put('/profile', authenticateUser, controller.updateMyProfile);
router.get('/users', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'SECRETARY', 'TREASURER'), controller.listMembers);

module.exports = router;