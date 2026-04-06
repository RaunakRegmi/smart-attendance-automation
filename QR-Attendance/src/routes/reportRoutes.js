const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ReportController } = require('../controllers/ReportController');

const reportRoutes = express.Router();

/**
 * @openapi
 * /api/reports/student/me:
 *   get:
 *     summary: Student-wise report for current student
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
reportRoutes.get('/student/me', requireAuth, requireRole('STUDENT'), ReportController.studentMe);

/**
 * @openapi
 * /api/reports/class/{classId}:
 *   get:
 *     summary: Class-wise report (Teacher/Admin)
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
reportRoutes.get('/class/:classId', requireAuth, requireRole('TEACHER', 'ADMIN'), ReportController.classReport);

/**
 * @openapi
 * /api/reports/monthly:
 *   get:
 *     summary: Monthly attendance report (Teacher/Admin/Student)
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string, example: "2026-03" }
 *       - in: query
 *         name: classId
 *         schema: { type: string }
 *         description: Teacher/Admin can filter by classId. Student ignores classId unless enrolled.
 *     responses:
 *       200: { description: OK }
 */
reportRoutes.get('/monthly', requireAuth, ReportController.monthly);

module.exports = { reportRoutes };

