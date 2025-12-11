const express = require('express');
const router = express.Router();
const controller = require('./cms.controller');
const { authenticateUser, authorizeRoles } = require('../../features/auth/auth.middleware');
const multer = require('multer');
const path = require('path');

// Configure Multer for PDF uploads
const storage = multer.diskStorage({
    destination: './uploads/minutes/',
    filename: (req, file, cb) => {
        cb(null, 'MINUTES-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Public Route
router.get('/content', controller.getContent);

// Protected Routes (Admin & Secretary)
router.post('/text', authenticateUser, authorizeRoles('ADMIN', 'SECRETARY'), controller.updateText);

router.post('/history', authenticateUser, authorizeRoles('ADMIN', 'SECRETARY'), controller.addHistory);
router.put('/history/:id', authenticateUser, authorizeRoles('ADMIN', 'SECRETARY'), controller.updateHistory);
router.delete('/history/:id', authenticateUser, authorizeRoles('ADMIN', 'SECRETARY'), controller.deleteHistory);

router.post('/minutes', authenticateUser, authorizeRoles('ADMIN', 'SECRETARY'), upload.single('file'), controller.uploadMinutes);
router.delete('/minutes/:id', authenticateUser, authorizeRoles('ADMIN', 'SECRETARY'), controller.removeMinutes);

module.exports = router;