const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/schedule/today:
 *   get:
 *     summary: Get today's class schedule for logged-in student
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's class schedule
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       subjectCode:
 *                         type: string
 *                       subjectName:
 *                         type: string
 *                       startTime:
 *                         type: string
 *                       endTime:
 *                         type: string
 *                       dayOfWeek:
 *                         type: string
 *                       room:
 *                         type: string
 *                       block:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [UPCOMING, ONGOING, COMPLETED]
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No schedule found for today
 */
router.get('/today', scheduleController.getTodaySchedule);

/**
 * @swagger
 * /api/schedule/week:
 *   get:
 *     summary: Get weekly schedule for logged-in student
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly schedule
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
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                       classes:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/ClassCard'
 */
router.get('/week', scheduleController.getWeeklySchedule);

/**
 * @swagger
 * /api/schedule/full:
 *   get:
 *     summary: Get full timetable for logged-in student
 *     tags: [Schedule]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Complete timetable
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
 *                     type: object
 *                     properties:
 *                       dayOfWeek:
 *                         type: string
 *                       classes:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/ClassCard'
 */
router.get('/full', scheduleController.getFullSchedule);

module.exports = router;