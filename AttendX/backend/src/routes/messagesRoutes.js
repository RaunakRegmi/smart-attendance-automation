const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const authorizeRoles = require('../middleware/authorizeRoles');

// Async messaging shared by every role; eligibility is enforced per-request in
// the controller (§10.3). No websockets — unread state is computed by query.
router.use(authorizeRoles('ADMIN', 'STUDENT', 'TEACHER'));

/**
 * @swagger
 * /api/messages/contacts:
 *   get:
 *     summary: Eligible message recipients for the caller (role-scoped)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students get their subject teachers; teachers get their students + admins; admins get teachers
 */
router.get('/contacts', messagesController.getContacts);

/**
 * @swagger
 * /api/messages/unread-count:
 *   get:
 *     summary: Total unread message count for the caller (inbox badge)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', messagesController.getUnreadCount);

/**
 * @swagger
 * /api/messages/threads:
 *   get:
 *     summary: The caller's threads with last message + unread count, sorted by last activity
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: contextType
 *         schema:
 *           type: string
 *           enum: [STUDENT_TEACHER_SUBJECT, ADMIN_TEACHER, ADMIN_BROADCAST]
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Thread list
 */
router.get('/threads', messagesController.listThreads);

/**
 * @swagger
 * /api/messages/threads:
 *   post:
 *     summary: Start a thread (server validates participant eligibility; reuses the existing thread for the same context + pair)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientUserId, body]
 *             properties:
 *               recipientUserId:
 *                 type: integer
 *               subjectId:
 *                 type: integer
 *                 description: Required for student↔teacher threads (the shared subject)
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thread created
 *       200:
 *         description: Message appended to the existing thread for this pair
 *       403:
 *         description: Recipient not eligible (scoping enforced server-side)
 */
router.post('/threads', messagesController.createThread);

/**
 * @swagger
 * /api/messages/threads/{id}:
 *   get:
 *     summary: Thread detail + paginated messages (participants only)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thread with messages (oldest first)
 *       403:
 *         description: Not a participant
 */
router.get('/threads/:id', messagesController.getThread);

/**
 * @swagger
 * /api/messages/threads/{id}:
 *   post:
 *     summary: Append a message to a thread (participants only; broadcasts are one-way)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message appended (bumps thread updatedAt)
 *       403:
 *         description: Not a participant, or replying to a one-way notification
 */
router.post('/threads/:id', messagesController.postMessage);

/**
 * @swagger
 * /api/messages/threads/{id}/read:
 *   post:
 *     summary: Mark the thread read (sets the caller's lastReadAt to now)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thread marked read
 *       403:
 *         description: Not a participant
 */
router.post('/threads/:id/read', messagesController.markRead);

module.exports = router;
