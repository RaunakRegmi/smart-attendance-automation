const express = require('express');
const router = express.Router();
const studentPortalController = require('../controllers/studentPortalController');
const chatAgentController = require('../controllers/chatAgentController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.use(authorizeRoles('STUDENT'));

/**
 * @swagger
 * /api/student/dashboard:
 *   get:
 *     summary: Get student dashboard data (aggregated)
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns combined dashboard data for the authenticated student:
 *       - Personal info and current attendance percentage
 *       - Subject-wise attendance breakdown with at-risk detection
 *       - Today's class schedule with UPCOMING/ONGOING/COMPLETED status
 *       - Recent attendance logs (last 4)
 *       - Unread notification count
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     student:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         name: { type: string }
 *                         email: { type: string }
 *                         studentId: { type: string }
 *                         department: { type: string }
 *                         batch: { type: string }
 *                         section: { type: string }

 *                     attendance:
 *                       type: object
 *                       properties:
 *                         overallPercentage: { type: number }
 *                         subjectWise: { type: array, items: { type: object } }
 *                         totalSubjects: { type: integer }
 *                         atRiskCount: { type: integer }
 *                     todaySchedule:
 *                       type: object
 *                       properties:
 *                         classes: { type: array, items: { type: object } }
 *                         totalToday: { type: integer }
 *                         nextClass: { type: object, nullable: true }
 *                     recentLogs:
 *                       type: array
 *                       items: { type: object }
 *                     notifications:
 *                       type: object
 *                       properties:
 *                         unreadCount: { type: integer }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student profile not found
 */
router.get('/dashboard', studentPortalController.getDashboard);

/**
 * @swagger
 * /api/student/attendance/summary:
 *   get:
 *     summary: Get student attendance summary with subject breakdown
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns the authenticated student's overall attendance percentage
 *       and subject-wise breakdown with at-risk indicators.
 *     responses:
 *       200:
 *         description: Attendance summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: object
 *                       properties:
 *                         percentage: { type: number }
 *                         attended: { type: integer }
 *                         total: { type: integer }
 *                         absents: { type: integer }
 *                         lates: { type: integer }
 *                     subjects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subject: { type: string }
 *                           code: { type: string }
 *                           total: { type: integer }
 *                           attended: { type: integer }
 *                           absents: { type: integer }
 *                           lates: { type: integer }
 *                           percentage: { type: number }
 *                           isOnTrack: { type: boolean }
 *                     atRisk:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student not found
 */
router.get('/attendance/summary', studentPortalController.getAttendanceSummary);
router.get('/attendance/weekly-summary', studentPortalController.getWeeklyAttendanceSummary);

/**
 * @swagger
 * /api/student/attendance/logs:
 *   get:
 *     summary: Get student attendance logs (paginated)
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns paginated attendance logs for the authenticated student,
 *       ordered by date descending.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Records per page
 *     responses:
 *       200:
 *         description: Attendance logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       subject: { type: string }
 *                       code: { type: string }
 *                       status: { type: string, enum: [Present, Absent, Late] }
 *                       date: { type: string, format: date }
 *                       time: { type: string, format: date-time }
 *                       subjectId: { type: integer }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     totalPages: { type: integer }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student not found
 */
router.get('/attendance/logs', studentPortalController.getAttendanceLogs);

/**
 * @swagger
 * /api/student/chat:
 *   post:
 *     summary: Personalised AI chatbot for the authenticated student
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Sends a message to the AI assistant. The student is identified from
 *       their JWT, so they can only ever query their own attendance data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "What is my attendance?"
 *     responses:
 *       200:
 *         description: Chatbot reply
 */
router.post('/chat', (req, res) => chatAgentController.chat(req, res, 'STUDENT'));

// Streaming student chat (SSE: token / usage / done events).
router.post('/chat/stream', (req, res) => chatAgentController.chatStream(req, res, 'STUDENT'));

// Restore / clear the student's durable conversation (survives reload / reinstall).
router.get('/conversation', (req, res) => chatAgentController.getConversation(req, res, 'STUDENT'));
router.get('/conversation/context', (req, res) => chatAgentController.getContext(req, res, 'STUDENT'));
router.delete('/conversation', (req, res) => chatAgentController.clearConversation(req, res, 'STUDENT'));

/**
 * @swagger
 * /api/student/profile:
 *   get:
 *     summary: Get student full profile details
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile details
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', studentPortalController.getProfile);

/**
 * @swagger
 * /api/student/profile:
 *   put:
 *     summary: Update editable student profile fields
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gender: { type: string }
 *               bloodGroup: { type: string }
 *               regNum: { type: string }
 *               admissionDate: { type: string }
 *               faculty: { type: string }
 *               guardianName: { type: string }
 *               guardianContact: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', studentPortalController.updateProfile);

/**
 * @swagger
 * /api/student/profile/photo:
 *   post:
 *     summary: Upload student profile photo
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Photo uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/profile/photo', studentPortalController.photoUpload.single('photo'), studentPortalController.uploadPhoto);

module.exports = router;
