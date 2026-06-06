const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.use(authorizeRoles('ADMIN'));

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: List subjects (Admin, paginated)
 *     tags: [Subject]
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
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated subject list
 *       403:
 *         description: Admin only
 */
router.get('/', subjectController.getSubjects);

/**
 * @swagger
 * /api/subjects:
 *   post:
 *     summary: Create a subject (Admin)
 *     tags: [Subject]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subjectCode]
 *             properties:
 *               subjectCode:
 *                 type: string
 *                 example: CS101
 *               subjectName:
 *                 type: string
 *                 example: Introduction to CS
 *     responses:
 *       201:
 *         description: Subject created
 */
router.post('/', subjectController.createSubject);

/**
 * @swagger
 * /api/subjects/{id}:
 *   put:
 *     summary: Update a subject (Admin)
 *     tags: [Subject]
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
 *               subjectCode:
 *                 type: string
 *               subjectName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subject updated
 *       404:
 *         description: Subject not found
 */
router.put('/:id', subjectController.updateSubject);

/**
 * @swagger
 * /api/subjects/{id}:
 *   delete:
 *     summary: Delete a subject (Admin)
 *     tags: [Subject]
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
 *         description: Subject deleted
 *       404:
 *         description: Subject not found
 */
router.delete('/:id', subjectController.deleteSubject);

module.exports = router;
