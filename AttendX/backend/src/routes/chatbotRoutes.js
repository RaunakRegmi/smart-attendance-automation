const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const chatAgentController = require('../controllers/chatAgentController');
const authorizeRoles = require('../middleware/authorizeRoles');

// Admin-only: export Postgres → CSV → trigger chatbot reindex
router.post('/refresh', authorizeRoles('ADMIN'), chatbotController.refresh);

// Admin-only: health passthrough
router.get('/health', authorizeRoles('ADMIN'), chatbotController.health);

// Admin-only: dry-run preview of payload
router.get('/preview', authorizeRoles('ADMIN'), chatbotController.preview);

// Admin chat — durable per-user memory; backend persists the transcript and
// proxies inference to the chatbot (port stays private).
router.post('/chat', authorizeRoles('ADMIN'), (req, res) => chatAgentController.chat(req, res, 'ADMIN'));

// Streaming admin chat (SSE: token / usage / done events).
router.post('/chat/stream', authorizeRoles('ADMIN'), (req, res) => chatAgentController.chatStream(req, res, 'ADMIN'));

// Restore the admin's conversation (survives reload / new tab / new device).
router.get('/conversation', authorizeRoles('ADMIN'), (req, res) => chatAgentController.getConversation(req, res, 'ADMIN'));

// Clear (soft-archive) the admin's conversation.
router.delete('/conversation', authorizeRoles('ADMIN'), (req, res) => chatAgentController.clearConversation(req, res, 'ADMIN'));

// Context-window stats (token meter + memory state).
router.get('/conversation/context', authorizeRoles('ADMIN'), (req, res) => chatAgentController.getContext(req, res, 'ADMIN'));

// Admin analytics for dashboard charts
router.get('/analytics', authorizeRoles('ADMIN'), chatbotController.analytics);

module.exports = router;
