const express = require('express');
const sheetsController = require('../controllers/sheetsController');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.use(authorizeRoles('ADMIN'));

/**
 * @swagger
 * /api/sheets:
 *   post:
 *     summary: Link a new Google Sheet
 *     tags: [Sheets]
 *     description: Link a new Google Sheet by URL, assigning batch and section.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - batchId
 *               - sectionId
 *             properties:
 *               url:
 *                 type: string
 *                 example: https://docs.google.com/spreadsheets/d/abc123/edit
 *               batchId:
 *                 type: string
 *                 format: uuid
 *               sectionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Sheet linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 sheetName:
 *                   type: string
 *                 sheetId:
 *                   type: string
 *                 batchId:
 *                   type: string
 *                   format: uuid
 *                 sectionId:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [active, inactive]
 *       400:
 *         description: Invalid input or sheet validation failed
 */
router.post('/', sheetsController.linkSheet);

/**
 * @swagger
 * /api/sheets:
 *   get:
 *     summary: List all linked sheets
 *     tags: [Sheets]
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by batch ID
 *       - in: query
 *         name: sectionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by section ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of sheets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   sheetName:
 *                     type: string
 *                   batchId:
 *                     type: string
 *                     format: uuid
 *                   sectionId:
 *                     type: string
 *                     format: uuid
 *                   status:
 *                     type: string
 *                   lastSuccessfulSyncTime:
 *                     type: string
 *                     format: date-time
 *                   lastAttemptedSyncTime:
 *                     type: string
 *                     format: date-time
 */
router.get('/', sheetsController.getSheets);

/**
 * @swagger
 * /api/sheets/{id}/toggle:
 *   put:
 *     summary: Toggle sheet active/inactive status
 *     tags: [Sheets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Sheet ID
 *     responses:
 *       200:
 *         description: Status toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *       404:
 *         description: Sheet not found
 */
router.put('/:id/toggle', sheetsController.toggleSheetStatus);

/**
 * @swagger
 * /api/sheets/sync:
 *   post:
 *     summary: Trigger sync jobs (background)
 *     tags: [Sheets]
 *     description: If sheetId is provided in body, syncs that sheet; otherwise syncs all active sheets.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sheetId:
 *                 type: string
 *                 format: uuid
 *                 description: (Optional) Specific sheet to sync
 *     responses:
 *       200:
 *         description: Sync jobs enqueued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sheetId:
 *                         type: string
 *                       jobId:
 *                         type: string
 */
router.post('/sync', sheetsController.syncSheet);

router.delete('/:id', sheetsController.deleteSheet);

module.exports = router;