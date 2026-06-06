const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const authorizeRoles = require('../middleware/authorizeRoles');

// Admin-only: export Postgres → CSV → trigger chatbot reindex
router.post('/refresh', authorizeRoles('ADMIN'), chatbotController.refresh);

// Admin-only: health passthrough
router.get('/health', authorizeRoles('ADMIN'), chatbotController.health);

// Admin-only: dry-run preview of payload
router.get('/preview', authorizeRoles('ADMIN'), chatbotController.preview);

// Admin chat — backend proxies to chatbot so the chatbot port stays private
router.post('/chat', authorizeRoles('ADMIN'), chatbotController.adminChat);

// Admin analytics for dashboard charts
router.get('/analytics', authorizeRoles('ADMIN'), chatbotController.analytics);

module.exports = router;
