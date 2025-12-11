const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { authenticateUser } = require('./auth.middleware');
const { validate, registerSchema } = require('../../../modules/common/validation'); // Keeping generic validation for now

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', controller.login);
router.post('/verify-email', controller.verifyEmail);
router.post('/logout', controller.logout);
router.post('/change-password', authenticateUser, controller.changePassword);

// Profile routes can be added here later or in a separate 'members' feature
// For now, let's keep the existing profile logic in the old file until we refactor Members

module.exports = router;