const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { AttendanceController } = require('../controllers/AttendanceController');

const attendanceRoutes = express.Router();

/**
 * @openapi
 * /api/attendance/sessions/start:
 *   post:
 *     summary: Teacher starts an attendance session (generates QR token)
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classId, durationMinutes]
 *             properties:
 *               classId: { type: string }
 *               durationMinutes: { type: integer, minimum: 1, maximum: 180 }
 *     responses:
 *       201:
 *         description: Created session with QR
 */
attendanceRoutes.post('/sessions/start', requireAuth, requireRole('TEACHER'), AttendanceController.startSession);

/**
 * @openapi
 * /api/attendance/sessions/{sessionId}:
 *   get:
 *     summary: Get session info (Teacher/Admin)
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
attendanceRoutes.get('/sessions/:sessionId', requireAuth, AttendanceController.getSession);

/**
 * @openapi
 * /api/attendance/scan:
 *   post:
 *     summary: Student scans QR token to mark attendance
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qrToken]
 *             properties:
 *               qrToken: { type: string }
 *     responses:
 *       200:
 *         description: Attendance recorded
 */
attendanceRoutes.post('/scan', requireAuth, requireRole('STUDENT'), AttendanceController.scanQr);

/**
 * @openapi
 * /api/attendance/sessions/{sessionId}/live:
 *   get:
 *     summary: Teacher views live attendance list for a session
 *     tags: [Attendance]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
attendanceRoutes.get('/sessions/:sessionId/live', requireAuth, requireRole('TEACHER'), AttendanceController.liveAttendance);

/**
 * @openapi
 * /api/attendance/requests:
 *   post:
 *     summary: Student requests attendance correction
 *     tags: [AttendanceRequests]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, reason]
 *             properties:
 *               sessionId: { type: string }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Created }
 */
attendanceRoutes.post('/requests', requireAuth, requireRole('STUDENT'), AttendanceController.createRequest);

/**
 * @openapi
 * /api/attendance/requests/{requestId}/approve:
 *   post:
 *     summary: Teacher approves attendance correction request
 *     tags: [AttendanceRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
attendanceRoutes.post('/requests/:requestId/approve', requireAuth, requireRole('TEACHER'), AttendanceController.approveRequest);

/**
 * @openapi
 * /api/attendance/requests/{requestId}/reject:
 *   post:
 *     summary: Teacher rejects attendance correction request
 *     tags: [AttendanceRequests]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 */
attendanceRoutes.post('/requests/:requestId/reject', requireAuth, requireRole('TEACHER'), AttendanceController.rejectRequest);

module.exports = { attendanceRoutes };

