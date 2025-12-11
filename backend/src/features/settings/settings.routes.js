const express = require('express');
const router = express.Router();
const controller = require('./settings.controller');
const { authenticateUser, authorizeRoles } = require('../auth/auth.middleware');

router.get('/branding', controller.getBranding); // Public
router.get('/', authenticateUser, controller.getSettings);
router.post('/update', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON'), controller.updateSetting);

router.get('/categories', authenticateUser, controller.getCategories);
router.post('/categories', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.createCategory);
router.delete('/categories/:id', authenticateUser, authorizeRoles('ADMIN', 'CHAIRPERSON', 'TREASURER'), controller.deleteCategory);

module.exports = router;