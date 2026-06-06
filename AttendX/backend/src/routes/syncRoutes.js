const express = require('express');
const syncController = require('../controllers/syncController');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const schedulerService = require('../services/schedulerService');
const sheetSyncQueue = require('../queues/sheetSyncQueue');

const router = express.Router();

router.use(authorizeRoles('ADMIN'));

/**
 * @swagger
 * /api/sync/manual:
 *   post:
 *     summary: Trigger a manual sync for a specific sheet
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sheetId:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of the sheet to sync
 *                 example: f6ff052c-ecee-46f8-9c46-bddad4228c03
 *     responses:
 *       200:
 *         description: Manual sync job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 syncJobId:
 *                   type: integer
 */
router.post('/manual', syncController.manualSync);

/**
 * @swagger
 * /api/sync/status:
 *   get:
 *     summary: List sync jobs (optional filtering)
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sheetId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by sheet UUID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, RUNNING, SUCCESS, FAILED, SKIPPED]
 *         description: Filter by job status
 *     responses:
 *       200:
 *         description: List of sync jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SyncJob'
 */
router.get('/status', syncController.getStatus);

/**
 * @swagger
 * /api/sync/status/{id}:
 *   get:
 *     summary: Get details of a specific sync job
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sync job ID or sheet UUID (returns the specified job or latest job for the sheet)
 *     responses:
 *       200:
 *         description: Sync job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 job:
 *                   $ref: '#/components/schemas/SyncJob'
 */
router.get('/status/:id', syncController.getJob);

/**
 * @swagger
 * /api/sync/scheduler-status:
 *   get:
 *     summary: Get scheduler service status
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 syncStatus:
 *                   $ref: '#/components/schemas/SchedulerStatus'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/scheduler-status', authMiddleware, async (req, res) => {
  try {
    const status = await schedulerService.getStatus();
    res.json({ success: true, syncStatus: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add the new routes
/**
 * @swagger
 * /api/sync/start:
 *   post:
 *     summary: Start the background scheduler service
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/start', authMiddleware, syncController.startScheduler);

/**
 * @swagger
 * /api/sync/stop:
 *   post:
 *     summary: Stop the background scheduler service
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/stop', authMiddleware, syncController.stopScheduler);

/**
 * @swagger
 * /api/sync/modify:
 *   post:
 *     summary: Modify the scheduler sync time
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newSyncTime]
 *             properties:
 *               newSyncTime:
 *                 type: string
 *                 format: time
 *                 example: "07:30"
 *                 description: New sync time in HH:MM format (24-hour)
 *     responses:
 *       200:
 *         description: Schedule modified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid time format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/modify', authMiddleware, syncController.modifyScheduler);

/**
 * @swagger
 * /api/sync/queue-status:
 *   get:
 *     summary: Get the current queue status
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 queueStatus:
 *                   $ref: '#/components/schemas/QueueStatus'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/queue-status', authMiddleware, async (req, res) => {
  try {
    const queueJobs = await sheetSyncQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
    const queueStatus = {
      totalJobs: queueJobs.length,
      waiting: queueJobs.filter(job => job.state === 'waiting').length,
      active: queueJobs.filter(job => job.state === 'active').length,
      completed: queueJobs.filter(job => job.state === 'completed').length,
      failed: queueJobs.filter(job => job.state === 'failed').length,
    };
    res.json({ success: true, queueStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;