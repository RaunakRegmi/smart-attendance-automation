const express = require('express');
const studentController = require('../controllers/studentController');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.use(authorizeRoles('ADMIN'));

/**
 * @swagger
 * /api/students/profile:
 *   get:
 *     summary: Get student profile by email
 *     tags: [Student]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: Student email address
 *     responses:
 *       200:
 *         description: Student profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StudentProfile'
 *       404:
 *         description: Student not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', studentController.getProfile);

/**
 * @swagger
 * /api/students/profile:
 *   put:
 *     summary: Update student profile
 *     tags: [Student]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: Student email address to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudentProfileUpdate'
 *     responses:
 *       200:
 *         description: Updated student profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StudentProfile'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/profile', studentController.updateProfile);

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: List students (Admin, paginated)
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sectionId
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Paginated student list
 *       403:
 *         description: Admin only
 */
router.get('/', authorizeRoles('ADMIN'), studentController.getStudents);

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Create a student (Admin)
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               batchId:
 *                 type: string
 *                 format: uuid
 *               sectionId:
 *                 type: string
 *                 format: uuid
 *               password:
 *                 type: string
 *                 description: Optional portal password
 *     responses:
 *       201:
 *         description: Student created
 */
router.post('/', authorizeRoles('ADMIN'), studentController.createStudent);

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Update a student (Admin)
 *     tags: [Student]
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
 *         description: Student updated
 */
router.put('/:id', authorizeRoles('ADMIN'), studentController.updateStudent);

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Delete a student (Admin)
 *     tags: [Student]
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
 *         description: Student deleted
 */
router.delete('/:id', authorizeRoles('ADMIN'), studentController.deleteStudent);

module.exports = router;
