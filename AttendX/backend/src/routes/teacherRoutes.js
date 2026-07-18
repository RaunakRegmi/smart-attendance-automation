const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const authorizeRoles = require('../middleware/authorizeRoles');

// Every route here is teacher-only; row-level scoping to the teacher's
// assigned (section, subject) pairs is enforced inside the controller via
// teacherScopeService — never by the frontend.
router.use(authorizeRoles('TEACHER'));

/**
 * @swagger
 * /api/teacher/dashboard:
 *   get:
 *     summary: Teacher dashboard (today's classes, stats, unread messages, notifications)
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard payload scoped to the teacher's assignments
 */
router.get('/dashboard', teacherController.getDashboard);

/**
 * @swagger
 * /api/teacher/classes:
 *   get:
 *     summary: Assigned classes (section + subject pairs) with roster stats
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assigned classes only
 */
router.get('/classes', teacherController.getClasses);

/**
 * @swagger
 * /api/teacher/classes/{sectionId}/{subjectId}/students:
 *   get:
 *     summary: Roster with attendance percentage and at-risk flags (scoped)
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Class roster
 *       403:
 *         description: Not assigned to this class
 */
router.get('/classes/:sectionId/:subjectId/students', teacherController.getClassRoster);

/**
 * @swagger
 * /api/teacher/attendance:
 *   get:
 *     summary: Read-only attendance history for an assigned class
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
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
 *         description: Attendance records (read-only in v1)
 *       403:
 *         description: Not assigned to this class
 */
router.get('/attendance', teacherController.getAttendance);

/**
 * @swagger
 * /api/teacher/attendance:
 *   post:
 *     summary: "FUTURE SCOPE: mark/edit attendance (returns 501 in v1)"
 *     description: Reserved extension point. Attendance is sourced from the sheet sync pipeline in v1.
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       501:
 *         description: Not implemented in v1 (read-only attendance)
 */
router.post('/attendance', teacherController.markAttendance);

/**
 * @swagger
 * /api/teacher/reports:
 *   get:
 *     summary: Attendance report for one of the teacher's subjects (scoped to assigned sections)
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sectionId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Subject report restricted to the teacher's assigned sections
 *       403:
 *         description: Not assigned to this subject/class
 */
router.get('/reports', teacherController.getReports);

/**
 * @swagger
 * /api/teacher/at-risk:
 *   get:
 *     summary: Students under the attendance threshold across assigned classes
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           default: 80
 *     responses:
 *       200:
 *         description: At-risk (student, subject) rows, worst first
 */
router.get('/at-risk', teacherController.getAtRisk);

/**
 * @swagger
 * /api/teacher/notifications:
 *   get:
 *     summary: Admin notifications for this teacher (system messages, newest first)
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Notification list with read flags
 */
router.get('/notifications', teacherController.getNotifications);

/**
 * @swagger
 * /api/teacher/profile:
 *   get:
 *     summary: Teacher profile (user, linked lecturer record, read-only assignments)
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile payload
 */
router.get('/profile', teacherController.getProfile);

/**
 * @swagger
 * /api/teacher/profile:
 *   put:
 *     summary: Update limited profile fields (name/contact on the linked lecturer record)
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: No linked lecturer record or invalid fields
 */
router.put('/profile', teacherController.updateProfile);

module.exports = router;
