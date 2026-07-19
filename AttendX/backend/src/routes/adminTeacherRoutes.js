const express = require('express');
const router = express.Router();
const adminTeacherController = require('../controllers/adminTeacherController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.use(authorizeRoles('ADMIN'));

/**
 * @swagger
 * /api/admin/teachers:
 *   get:
 *     summary: List teacher accounts (Admin, paginated, searchable)
 *     tags: [Admin Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Paginated teacher list with linked lecturer + assignment counts
 */
router.get('/teachers', adminTeacherController.getTeachers);

/**
 * @swagger
 * /api/admin/teachers:
 *   post:
 *     summary: Create a teacher login (Admin sets the password; account is flagged must-change-password)
 *     tags: [Admin Teachers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *                 description: Creates + links a lecturer record for the display name (optional)
 *               lecturerId:
 *                 type: integer
 *                 description: Link an existing lecturer record instead (explicit promote action)
 *               phone:
 *                 type: string
 *                 description: Nepali mobile (96/97/98XXXXXXXX, +977 optional) — used for SMS delivery
 *               address:
 *                 type: string
 *               deliveryChannels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, sms]
 *                 description: Where to send the credentials (login URL + temp password + reset link)
 *     responses:
 *       201:
 *         description: Teacher created (data.delivery carries per-channel send status)
 *       400:
 *         description: Duplicate email/phone or invalid input
 *       409:
 *         description: Lecturer already linked to another account
 */
router.post('/teachers', adminTeacherController.createTeacher);

/**
 * @swagger
 * /api/admin/teachers/{id}/resend-credentials:
 *   post:
 *     summary: Regenerate a reset token and re-send credentials (optionally resetting the temp password)
 *     tags: [Admin Teachers]
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
 *             required: [deliveryChannels]
 *             properties:
 *               deliveryChannels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, sms]
 *               newTempPassword:
 *                 type: string
 *                 description: If set, resets the password and includes it in the message; otherwise the message carries the reset link only
 *     responses:
 *       200:
 *         description: Per-channel delivery status
 */
router.post('/teachers/:id/resend-credentials', adminTeacherController.resendCredentials);

/**
 * @swagger
 * /api/admin/teachers/{id}:
 *   put:
 *     summary: Update a teacher account (email, password reset, active flag, lecturer link)
 *     tags: [Admin Teachers]
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
 *         description: Teacher updated
 */
router.put('/teachers/:id', adminTeacherController.updateTeacher);

/**
 * @swagger
 * /api/admin/teachers/{id}:
 *   delete:
 *     summary: Deactivate a teacher (soft — history is preserved, sessions revoked)
 *     tags: [Admin Teachers]
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
 *         description: Teacher deactivated
 */
router.delete('/teachers/:id', adminTeacherController.deactivateTeacher);

/**
 * @swagger
 * /api/admin/teachers/{id}/assignments:
 *   get:
 *     summary: List a teacher's active class assignments
 *     tags: [Admin Teachers]
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
 *         description: Assignment list
 */
router.get('/teachers/:id/assignments', adminTeacherController.getAssignments);

/**
 * @swagger
 * /api/admin/teachers/{id}/assignments:
 *   post:
 *     summary: Assign a (section, subject) class to a teacher — powers all teacher scoping
 *     tags: [Admin Teachers]
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
 *             required: [sectionId, subjectId]
 *             properties:
 *               sectionId:
 *                 type: string
 *                 format: uuid
 *               subjectId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Assignment added (or reactivated)
 *       409:
 *         description: Already assigned
 */
router.post('/teachers/:id/assignments', adminTeacherController.addAssignment);

/**
 * @swagger
 * /api/admin/teachers/{id}/assignments/{assignmentId}:
 *   delete:
 *     summary: Remove a class assignment (soft-deactivated for history)
 *     tags: [Admin Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assignment removed
 */
router.delete('/teachers/:id/assignments/:assignmentId', adminTeacherController.removeAssignment);

/**
 * @swagger
 * /api/admin/notifications:
 *   post:
 *     summary: Compose a notification to one/group/all teachers (per-recipient read tracking)
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body]
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               recipients:
 *                 oneOf:
 *                   - type: string
 *                     enum: [all]
 *                   - type: array
 *                     items:
 *                       type: integer
 *                 description: "'all' (default) or an array of teacher user ids"
 *     responses:
 *       201:
 *         description: Notification sent
 */
router.post('/notifications', adminTeacherController.sendNotification);

/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     summary: List sent teacher notifications with read counts
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sent notifications, newest first
 */
router.get('/notifications', adminTeacherController.listNotifications);

/**
 * @swagger
 * /api/admin/notifications/{id}/read-status:
 *   get:
 *     summary: Per-recipient read status for a sent notification
 *     tags: [Admin Notifications]
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
 *         description: Who has/hasn't read
 */
router.get('/notifications/:id/read-status', adminTeacherController.getNotificationReadStatus);

/**
 * @swagger
 * /api/admin/oversight/threads:
 *   get:
 *     summary: "Read-only oversight: browse student↔teacher threads (view is audit-logged)"
 *     tags: [Admin Oversight]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student↔teacher thread list
 */
router.get('/oversight/threads', adminTeacherController.listOversightThreads);

/**
 * @swagger
 * /api/admin/oversight/threads/{id}:
 *   get:
 *     summary: "Read-only oversight: full thread transcript (no reply capability; view is audit-logged)"
 *     tags: [Admin Oversight]
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
 *         description: Thread with messages
 *       404:
 *         description: Not a student↔teacher thread
 */
router.get('/oversight/threads/:id', adminTeacherController.getOversightThread);

module.exports = router;
