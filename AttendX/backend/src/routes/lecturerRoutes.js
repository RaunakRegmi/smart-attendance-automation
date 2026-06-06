const express = require('express');
const router = express.Router();
const lecturerController = require('../controllers/lecturerController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.use(authorizeRoles('ADMIN'));

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
 *     summary: Create a lecturer (Admin)
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
 *     responses:
 *       201:
 *         description: Lecturer created
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
