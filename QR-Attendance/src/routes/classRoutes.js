const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ClassController } = require('../controllers/ClassController');

const classRoutes = express.Router();

/**
 * @openapi
 * /api/classes:
 *   post:
 *     summary: Create class (Teacher/Admin)
 *     tags: [Classes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [className, batchId]
 *             properties:
 *               className: { type: string }
 *               batchId: { type: string }
 *               teacherId:
 *                 type: string
 *                 description: Required if ADMIN creates for a teacher
 *     responses:
 *       201: { description: Created }
 */
classRoutes.post('/', requireAuth, requireRole('ADMIN', 'TEACHER'), ClassController.createClass);

/**
 * @openapi
 * /api/classes:
 *   get:
 *     summary: List classes (role-based)
 *     tags: [Classes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
classRoutes.get('/', requireAuth, ClassController.listClasses);

/**
 * @openapi
 * /api/classes/{classId}/schedule:
 *   post:
 *     summary: Add class schedule (Teacher/Admin)
 *     tags: [Classes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dayOfWeek, startTime, endTime]
 *             properties:
 *               dayOfWeek: { type: integer, minimum: 0, maximum: 6 }
 *               startTime: { type: string, example: "09:00" }
 *               endTime: { type: string, example: "10:00" }
 *     responses:
 *       201: { description: Created }
 */
classRoutes.post('/:classId/schedule', requireAuth, requireRole('ADMIN', 'TEACHER'), ClassController.addSchedule);

/**
 * @openapi
 * /api/classes/{classId}/enroll:
 *   post:
 *     summary: Enroll a student into a class (Admin/Teacher)
 *     tags: [Classes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId]
 *             properties:
 *               studentId: { type: string }
 *     responses:
 *       200: { description: Enrolled }
 */
classRoutes.post('/:classId/enroll', requireAuth, requireRole('ADMIN', 'TEACHER'), ClassController.enrollStudent);

/**
 * @openapi
 * /api/classes/{classId}/enroll/bulk:
 *   post:
 *     summary: Enroll multiple students into a class at once (Admin/Teacher)
 *     tags: [Classes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [students]
 *             properties:
 *               students:
 *                 type: array
 *                 description: Array of student user IDs to enroll
 *                 items:
 *                   type: string
 *                 example: ["user_id_1", "user_id_2", "user_id_3"]
 *     responses:
 *       200:
 *         description: Students enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enrolled:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of successfully enrolled student IDs
 *                 skipped:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of student IDs that were already enrolled or failed
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of error messages for failed enrollments
 *       400: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/schemas/ErrorResponse' }
 *       404: { $ref: '#/components/schemas/ErrorResponse' }
 */
classRoutes.post('/:classId/enroll/bulk', requireAuth, requireRole('ADMIN', 'TEACHER'), ClassController.enrollMultipleStudents);

module.exports = { classRoutes };

