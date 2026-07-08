const express = require('express');
const batchController = require('../controllers/batchController');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.use(authorizeRoles('ADMIN'));

/**
 * @swagger
 * /api/batches:
 *   post:
 *     summary: Create a new batch
 *     tags: [Batch]
 *     description: Create a new batch with name and abbreviation. Abbreviation must be uppercase alphanumeric (e.g., A25 for Autumn 2025). Sections can be added later using the sections endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - abbreviation
 *             properties:
 *               name:
 *                 type: string
 *                 example: Autumn 2025
 *               abbreviation:
 *                 type: string
 *                 example: A25
 *                 description: Uppercase alphanumeric abbreviation for batch (e.g., A25)
 *     responses:
 *       201:
 *         description: Batch created successfully with auto-generated UUID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BatchCreate'
 *       400:
 *         description: Bad request - missing name/abbreviation or invalid abbreviation format
 */
router.post('/', batchController.createBatch);

/**
 * @swagger
 * /api/batches:
 *   get:
 *     summary: Get all batches with sections
 *     tags: [Batch]
 *     responses:
 *       200:
 *         description: List of batches
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
 *                     $ref: '#/components/schemas/Batch'
 */
router.get('/', batchController.getBatches);

/**
 * @swagger
 * /api/batches/{id}:
 *   get:
 *     summary: Get a batch by ID
 *     tags: [Batch]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Batch ID
 *     responses:
 *       200:
 *         description: Batch found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Batch'
 *       404:
 *         description: Batch not found
 */
router.get('/:id', batchController.getBatchById);

/**
 * @swagger
 * /api/batches/{id}:
 *   put:
 *     summary: Update an existing batch
 *     tags: [Batch]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Batch ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Autumn 2025
 *               abbreviation:
 *                 type: string
 *                 example: A25
 *                 description: Uppercase alphanumeric abbreviation for batch (e.g., A25)
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Batch'
 *       400:
 *         description: Bad request - invalid abbreviation format
 *       404:
 *         description: Batch not found
 */
router.put('/:id', batchController.updateBatch);

/**
 * @swagger
 * /api/batches/{id}:
 *   delete:
 *     summary: Delete a batch
 *     tags: [Batch]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Batch ID (UUID)
 *     responses:
 *       200:
 *         description: Batch deleted successfully
 *       404:
 *         description: Batch not found
 */
router.delete('/:id', batchController.deleteBatch);

module.exports = router;
