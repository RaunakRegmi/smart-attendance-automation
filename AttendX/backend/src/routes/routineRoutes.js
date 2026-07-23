const express = require('express');
const multer = require('multer');
const routineController = require('../controllers/routineController');
const authorizeRoles = require('../middleware/authorizeRoles');
const path = require('path');

const router = express.Router();

router.use(authorizeRoles('ADMIN'));

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
 *     description: Upload routine schedule from Excel or CSV file. Provide batchId and sectionId explicitly, or use the filename format "A25(L2)_Class_Schedule.xlsx" as fallback.
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
 *                 description: Excel (.xlsx, .xls) or CSV file
 *               batchId:
 *                 type: string
 *                 format: uuid
 *                 description: Batch ID (required if not using filename parsing)
 *               sectionId:
 *                 type: string
 *                 format: uuid
 *                 description: Section ID (required if not using filename parsing)
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
router.post('/upload', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'batchId', maxCount: 1 }, { name: 'sectionId', maxCount: 1 }]), (req, res, next) => {
  // Normalize single file upload for multer.fields — attach req.files.file[0] as req.file
  if (req.files && req.files.file && req.files.file.length > 0) {
    req.file = req.files.file[0];
  }
  routineController.uploadRoutine(req, res, next);
});

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

/**
 * @swagger
 * /api/routine/list:
 *   get:
 *     summary: List all routine uploads grouped by section
 *     tags: [Routine]
 *     description: Returns routine groups with section/batch info, entry count, and last upload time
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of routine groups
 */
router.get('/list', routineController.listRoutines);

/**
 * @swagger
 * /api/routine/{sectionId}:
 *   delete:
 *     summary: Delete all routine entries for a section
 *     tags: [Routine]
 *     description: Removes all routine records for the given sectionId
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Routine entries deleted
 */
/**
 * @swagger
 * /api/routine/{id}:
 *   put:
 *     summary: Update a single routine entry
 *     tags: [Routine]
 *     description: Update fields of an existing routine entry by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dayOfWeek: { type: string }
 *               subjectCode: { type: string }
 *               subjectName: { type: string }
 *               startTime: { type: string }
 *               endTime: { type: string }
 *               block: { type: string }
 *               room: { type: string }
 *               teacher: { type: string }
 *     responses:
 *       200:
 *         description: Routine entry updated
 */
router.put('/:id', routineController.updateRoutine);

router.delete('/:sectionId', routineController.deleteRoutine);

module.exports = router;
