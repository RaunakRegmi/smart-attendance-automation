const express = require('express');
const router = express.Router();
const lecturerController = require('../controllers/lecturerController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.use(authorizeRoles('ADMIN'));

/**
 * @swagger
 * /api/lecturers/subjects/all:
 *   get:
 *     summary: Get all subjects for dropdown selection
 *     tags: [Lecturer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All subjects list
 */
router.get('/subjects/all', lecturerController.getAllSubjects);

/**
 * @swagger
 * /api/lecturers:
 *   get:
 *     summary: List lecturers (Admin, paginated)
 *     tags: [Lecturer]
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
 *         description: Paginated lecturer list
 */
router.get('/', lecturerController.getLecturers);

/**
 * @swagger
 * /api/lecturers:
 *   post:
 *     summary: Create a lecturer (Admin) - auto-creates teacher account
 *     tags: [Lecturer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               contact:
 *                 type: string
 *               password:
 *                 type: string
 *               subjectIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               deliveryChannels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, sms]
 *     responses:
 *       201:
 *         description: Lecturer created with optional teacher account
 */
router.post('/', lecturerController.createLecturer);

/**
 * @swagger
 * /api/lecturers/{id}:
 *   put:
 *     summary: Update a lecturer (Admin)
 *     tags: [Lecturer]
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
 *         description: Lecturer updated
 */
router.put('/:id', lecturerController.updateLecturer);

/**
 * @swagger
 * /api/lecturers/{id}/resend-credentials:
 *   post:
 *     summary: Resend credentials for a lecturer's teacher account
 *     tags: [Lecturer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryChannels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [email, sms]
 *               newTempPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Credentials sent
 */
router.post('/:id/resend-credentials', lecturerController.resendLecturerCredentials);

/**
 * @swagger
 * /api/lecturers/{id}:
 *   delete:
 *     summary: Delete a lecturer (Admin)
 *     tags: [Lecturer]
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
 *         description: Lecturer deleted
 */
router.delete('/:id', lecturerController.deleteLecturer);

module.exports = router;
