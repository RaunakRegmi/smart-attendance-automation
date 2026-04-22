const express = require('express');
const multer = require('multer');
const routineController = require('../controllers/routineController');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
    }
  },
});

/**
 * @swagger
 * /api/routine/upload:
 *   post:
 *     summary: Upload routine schedule file
 *     tags: [Routine]
 *     description: Upload routine schedule from Excel or CSV file. File naming format should be "A25(L2)_Class_Schedule.xlsx" where A25 is batch abbreviation and L2 is section name.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel (.xlsx, .xls) or CSV file containing routine schedule. Filename format "A25(L2)_Class_Schedule.xlsx"
 *     responses:
 *       200:
 *         description: Routine uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Routine'
 */
router.post('/upload', upload.single('file'), routineController.uploadRoutine);

/**
 * @swagger
 * /api/routine:
 *   get:
 *     summary: Get routine entries by section
 *     tags: [Routine]
 *     parameters:
 *       - in: query
 *         name: sectionId
 *         schema:
 *           type: integer
 *         description: Section ID to return schedule for
 *       - in: query
 *         name: sectionName
 *         schema:
 *           type: string
 *         description: Section name to return schedule for
 *       - in: query
 *         name: dayOfWeek
 *         schema:
 *           type: string
 *         description: Day of week filter, e.g. Monday
 *     responses:
 *       200:
 *         description: Routine entries
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
 *                     $ref: '#/components/schemas/Routine'
 */
router.get('/', routineController.getRoutine);

module.exports = router;
