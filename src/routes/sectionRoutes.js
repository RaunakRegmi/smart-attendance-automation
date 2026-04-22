const express = require('express');
const sectionController = require('../controllers/sectionController');

const router = express.Router();

/**
 * @swagger
 * /api/sections:
 *   post:
 *     summary: Create a new section under an existing batch
 *     tags: [Section]
 *     description: Create a new section under an existing batch. The batch must already exist.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - batchId
 *             properties:
 *               name:
 *                 type: string
 *                 example: L1
 *               batchId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174001
 *     responses:
 *       201:
 *         description: Section created successfully with auto-generated UUID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SectionCreate'
 */
router.post('/', sectionController.createSection);

/**
 * @swagger
 * /api/sections:
 *   get:
 *     summary: Get sections optionally filtered by batch
 *     tags: [Section]
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Batch ID to filter sections
 *     responses:
 *       200:
 *         description: List of sections
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
 *                     $ref: '#/components/schemas/Section'
 */
router.get('/', sectionController.getSections);

/**
 * @swagger
 * /api/sections/{id}:
 *   get:
 *     summary: Get a section by ID
 *     tags: [Section]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Section ID
 *     responses:
 *       200:
 *         description: Section found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Section'
 *       404:
 *         description: Section not found
 */
router.get('/:id', sectionController.getSectionById);

/**
 * @swagger
 * /api/sections/{id}:
 *   put:
 *     summary: Update an existing section
 *     tags: [Section]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Section ID (UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               batchId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Section updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SectionCreate'
 */
router.put('/:id', sectionController.updateSection);

module.exports = router;
