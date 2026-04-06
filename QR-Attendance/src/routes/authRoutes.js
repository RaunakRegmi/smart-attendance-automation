const express = require('express');
const { AuthController } = require('../controllers/AuthController');

const authRoutes = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (student/teacher)
 *     description: Admin should create users via Admin APIs; this endpoint is for basic self-registration.
 *     tags: [Auth]
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
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [TEACHER, STUDENT] }
 *     responses:
 *       201:
 *         description: Registered
 *       400:
 *         description: Validation error
 */
authRoutes.post('/register', AuthController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: JWT token
 */
authRoutes.post('/login', AuthController.login);

module.exports = { authRoutes };

