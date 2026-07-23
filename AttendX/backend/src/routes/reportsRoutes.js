const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.use(authorizeRoles('ADMIN'));

/**
 * @swagger
 * components:
 *   schemas:
 *     SubjectAttendance:
 *       type: object
 *       properties:
 *         subject: { type: object, properties: { code: { type: string }, name: { type: string } } }
 *         status: { type: string, enum: [Present, Absent, Late] }
 *         date: { type: string, format: date }
 *     StudentRef:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         name: { type: string }
 *         email: { type: string }
 *         regNum: { type: string }
 *         faculty: { type: string }
 *     AttendanceOverall:
 *       type: object
 *       properties:
 *         total: { type: integer }
 *         present: { type: integer }
 *         absent: { type: integer }
 *         late: { type: integer }
 *         attendancePercentage: { type: number }
 *     SubjectStat:
 *       type: object
 *       properties:
 *         subject: { type: object, properties: { id: { type: integer }, code: { type: string }, name: { type: string } } }
 *         total: { type: integer }
 *         present: { type: integer }
 *         absent: { type: integer }
 *         late: { type: integer }
 *         attendancePercentage: { type: number }
 *         lowAttendance: { type: boolean }
 *     StudentAggregateReport:
 *       type: object
 *       properties:
 *         student: { $ref: '#/components/schemas/StudentRef' }
 *         overall: { $ref: '#/components/schemas/AttendanceOverall' }
 *         subjectStats: { type: array, items: { $ref: '#/components/schemas/SubjectStat' } }
 *         lowAttendanceSubjects: { type: array, items: { $ref: '#/components/schemas/SubjectStat' } }
 *     StudentLeaderboardEntry:
 *       type: object
 *       properties:
 *         rank: { type: integer }
 *         student: { $ref: '#/components/schemas/StudentRef' }
 *         overall: { $ref: '#/components/schemas/AttendanceOverall' }
 *         subjectPerformance: { type: array, items: { type: object } }
 *     MonthlyTrend:
 *       type: object
 *       properties:
 *         month: { type: string }
 *         total: { type: integer }
 *         present: { type: integer }
 *         absent: { type: integer }
 *         late: { type: integer }
 *         attendancePercentage: { type: number }
 */

/**
 * @swagger
 * /api/reports/student/daily:
 *   get:
 *     summary: Individual Student Daily Report
 *     tags: [Reports-Student]
 *     description: Get attendance of a particular student on a particular date across all subjects. If date is omitted, all records for the student are returned.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema: { type: integer }
 *         description: Student ID
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date }
 *         description: Date in YYYY-MM-DD format (optional - omitting returns all records)
 *     responses:
 *       200:
 *         description: Student daily attendance report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     student: { $ref: '#/components/schemas/StudentRef' }
 *                     date: { type: string }
 *                     totalSubjects: { type: integer }
 *                     present: { type: integer }
 *                     absent: { type: integer }
 *                     late: { type: integer }
 *                     attendance: { type: array, items: { $ref: '#/components/schemas/SubjectAttendance' } }
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Student not found
 */
router.get('/student/daily', reportsController.getStudentDailyReport);

/**
 * @swagger
 * /api/reports/student/subject-time:
 *   get:
 *     summary: Student Subject-Time Report
 *     tags: [Reports-Student]
 *     description: Get attendance of a particular student for a specific subject at a specific date
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: subjectId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Specific attendance record
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Record not found
 */
router.get('/student/subject-time', reportsController.getStudentSubjectTimeReport);

/**
 * @swagger
 * /api/reports/student/subject-wise:
 *   get:
 *     summary: Student Subject-wise Report
 *     tags: [Reports-Student]
 *     description: Complete attendance history of a student grouped by subject
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: subjectId
 *         required: false
 *         schema: { type: integer }
 *         description: Filter by specific subject (optional)
 *     responses:
 *       200:
 *         description: Subject-wise attendance report
 *       400:
 *         description: studentId is required
 */
router.get('/student/subject-wise', reportsController.getStudentSubjectWiseReport);

/**
 * @swagger
 * /api/reports/student/aggregate:
 *   get:
 *     summary: Student Aggregate Report
 *     tags: [Reports-Student]
 *     description: Overall aggregate attendance report with subject-wise statistics and low attendance indicators
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Comprehensive student aggregate report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/StudentAggregateReport' }
 *       400:
 *         description: studentId is required
 *       404:
 *         description: Student not found
 */
router.get('/student/aggregate', reportsController.getStudentAggregateReport);

/**
 * @swagger
 * /api/reports/section:
 *   get:
 *     summary: Section-wise Attendance Report
 *     tags: [Reports-Section]
 *     description: Report of all students in a section with attendance percentages and subject-wise breakdown
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sectionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by student name, email, or registration number
 *     responses:
 *       200:
 *         description: Section-wise attendance report with pagination
 *       400:
 *         description: sectionId is required
 *       404:
 *         description: Section not found
 */
router.get('/section', reportsController.getSectionWiseReport);

/**
 * @swagger
 * /api/reports/batch:
 *   get:
 *     summary: Batch-wise Attendance Report
 *     tags: [Reports-Batch]
 *     description: Report of all students in a batch with aggregate analytics and section comparisons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: batchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Batch-wise attendance report
 *       400:
 *         description: batchId is required
 *       404:
 *         description: Batch not found
 */
router.get('/batch', reportsController.getBatchWiseReport);

/**
 * @swagger
 * /api/reports/subject:
 *   get:
 *     summary: Subject-wise Attendance Report
 *     tags: [Reports-Subject]
 *     description: Attendance statistics for a particular subject with student-wise records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema: { type: integer }
 *         description: Subject ID (required if subjectCode not provided)
 *       - in: query
 *         name: subjectCode
 *         schema: { type: string }
 *         description: Subject code (required if subjectId not provided)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Subject attendance report
 *       400:
 *         description: subjectId or subjectCode is required
 */
router.get('/subject', reportsController.getSubjectWiseReport);

/**
 * @swagger
 * /api/reports/faculty:
 *   get:
 *     summary: Faculty-wise Attendance Report
 *     tags: [Reports-Faculty]
 *     description: Attendance report filtered by student faculty/department
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: faculty
 *         required: true
 *         schema: { type: string }
 *         description: Faculty/department name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Faculty-wise attendance report
 *       400:
 *         description: faculty is required
 */
router.get('/faculty', reportsController.getFacultyWiseReport);

/**
 * @swagger
 * /api/reports/daily-summary:
 *   get:
 *     summary: Daily Attendance Summary Report
 *     tags: [Reports-Analytics]
 *     description: Summary of attendance for a specific date with subject breakdown and absent students list. Defaults to today if date is omitted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date }
 *         description: Date in YYYY-MM-DD format (optional - defaults to today)
 *     responses:
 *       200:
 *         description: Daily attendance summary
 */
router.get('/daily-summary', reportsController.getDailySummaryReport);

/**
 * @swagger
 * /api/reports/monthly:
 *   get:
 *     summary: Monthly Attendance Report
 *     tags: [Reports-Analytics]
 *     description: Complete attendance report for a given month with daily trends and subject breakdown
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, default: current month }
 *         description: Month number (1-12)
 *       - in: query
 *         name: year
 *         schema: { type: integer, default: current year }
 *         description: Year (e.g., 2025)
 *     responses:
 *       200:
 *         description: Monthly attendance report
 */
router.get('/monthly', reportsController.getMonthlyReport);

/**
 * @swagger
 * /api/reports/date-range:
 *   get:
 *     summary: Date-Range Attendance Report
 *     tags: [Reports-Analytics]
 *     description: Attendance report for a custom date range with optional section/batch filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: batchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Date-range attendance report
 */
router.get('/date-range', reportsController.getDateRangeReport);

/**
 * @swagger
 * /api/reports/low-attendance:
 *   get:
 *     summary: Low Attendance / Defaulter Report
 *     tags: [Reports-Analytics]
 *     description: Students with attendance below a threshold percentage
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema: { type: number, default: 75 }
 *         description: Attendance percentage threshold
 *       - in: query
 *         name: batchId
 *         schema: { type: string, format: uuid }
 *         description: Filter by batch
 *       - in: query
 *         name: sectionId
 *         schema: { type: string, format: uuid }
 *         description: Filter by section
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: List of students with low attendance
 */
router.get('/low-attendance', reportsController.getLowAttendanceReport);

/**
 * @swagger
 * /api/reports/top-performers:
 *   get:
 *     summary: Top Attendance Performers
 *     tags: [Reports-Analytics]
 *     description: Students with the highest attendance percentages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Maximum number of top performers to return
 *       - in: query
 *         name: batchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Top attendance performers
 */
router.get('/top-performers', reportsController.getTopPerformersReport);

/**
 * @swagger
 * /api/reports/absent-students:
 *   get:
 *     summary: Absent Students Report
 *     tags: [Reports-Analytics]
 *     description: List of absent students for a given date and optional subject/section. If date is omitted, all absent records are returned.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date }
 *         description: Date in YYYY-MM-DD format (optional - omitting returns all absent records)
 *       - in: query
 *         name: subjectId
 *         schema: { type: integer }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: List of absent students
 */
router.get('/absent-students', reportsController.getAbsentStudentsReport);

/**
 * @swagger
 * /api/reports/leaderboard:
 *   get:
 *     summary: Attendance Leaderboard
 *     tags: [Reports-Analytics]
 *     description: Full attendance leaderboard with rankings, summary statistics, and subject performance
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: batchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full attendance leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     leaderboard: { type: array, items: { $ref: '#/components/schemas/StudentLeaderboardEntry' } }
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalStudents: { type: integer }
 *                         averageAttendance: { type: number }
 *                         top25Average: { type: number }
 *                         bottom25Average: { type: number }
 */
router.get('/leaderboard', reportsController.getAttendanceLeaderboard);

/**
 * @swagger
 * /api/reports/section-comparison:
 *   get:
 *     summary: Section Comparison Analytics
 *     tags: [Reports-Analytics]
 *     description: Compare attendance across all sections in a batch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: batchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Section comparison data
 */
router.get('/section-comparison', reportsController.getSectionComparisonReport);

/**
 * @swagger
 * /api/reports/batch-comparison:
 *   get:
 *     summary: Batch Comparison Analytics
 *     tags: [Reports-Analytics]
 *     description: Compare attendance across all batches
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch comparison data
 */
router.get('/batch-comparison', reportsController.getBatchComparisonReport);

/**
 * @swagger
 * /api/reports/trends:
 *   get:
 *     summary: Attendance Trend Analytics
 *     tags: [Reports-Analytics]
 *     description: Monthly attendance trends with subject performance analysis over a configurable period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6 }
 *         description: Number of months to analyze (max 24)
 *       - in: query
 *         name: batchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sectionId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attendance trend analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     period: { type: object, properties: { months: { type: integer }, startDate: { type: string }, endDate: { type: string } } }
 *                     summary: { $ref: '#/components/schemas/AttendanceOverall' }
 *                     monthlyTrend: { type: array, items: { $ref: '#/components/schemas/MonthlyTrend' } }
 *                     subjectPerformance: { type: array, items: { type: object } }
 */
router.get('/trends', reportsController.getTrendAnalytics);

/**
 * @swagger
 * /api/reports/weekly/run-now:
 *   post:
 *     summary: Manually trigger weekly attendance report generation for all students
 *     tags: [Reports]
 *     description: |
 *       Runs the same logic as the Friday-evening cron immediately. Each student gets a
 *       personalised in-app notification with their weekly attendance, trend vs last
 *       week, and any subject that needs attention. Idempotent across reruns within
 *       the same week (new notifications are appended; the old ones aren't deleted).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reports generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     generated: { type: integer }
 *                     weekStart: { type: string }
 *                     weekEnd: { type: string }
 */
router.post('/weekly/run-now', reportsController.runWeeklyReportNow);

module.exports = router;
