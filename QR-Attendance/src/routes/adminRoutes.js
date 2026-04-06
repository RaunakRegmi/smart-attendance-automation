const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { AdminController } = require('../controllers/AdminController');

const adminRoutes = express.Router();

adminRoutes.use(requireAuth, requireRole('ADMIN'));

/**
 * @openapi
 * /api/admin/users:
 *   post:
 *     summary: Create user (ADMIN only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [ADMIN, TEACHER, STUDENT] }
 *               studentProfile:
 *                 type: object
 *                 properties:
 *                   batchId: { type: string }
 *                   parentName: { type: string }
 *                   parentPhone: { type: string }
 *               teacherProfile:
 *                 type: object
 *                 properties:
 *                   department: { type: string }
 *     responses:
 *       201: { description: Created }
 */
adminRoutes.post('/users', AdminController.createUser);

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: List users (ADMIN only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [ADMIN, TEACHER, STUDENT] }
 *     responses:
 *       200: { description: OK }
 */
adminRoutes.get('/users', AdminController.listUsers);

module.exports = { adminRoutes };

