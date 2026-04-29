const express = require('express');
const multer = require('multer');
const attendanceController = require('../controllers/attendanceController');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

/**
 * @swagger
 * /api/attendance/upload:
 *   post:
 *     summary: Upload attendance Excel file
 *     tags: [Attendance]
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
 *                 description: Excel file (.xlsx or .xls)
 *     responses:
 *       200:
 *         description: File processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: No file uploaded or invalid format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', upload.single('file'), attendanceController.uploadExcel);

/**
 * @swagger
 * /api/attendance/add-sheet:
 *   post:
 *     summary: Add and sync a Google Sheet
 *     tags: [Sheets]
 *     description: Save a Google Sheet URL, persist sheet metadata, and immediately sync attendance data from Google Sheets into the database.
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
 *       200:
 *         description: Sheet added and synced successfully
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
 *                   type: object
 *                   properties:
 *                     sheetId:
 *                       type: string
 *                     syncResult:
 *                       type: object
 *       400:
 *         description: Missing required fields or invalid sheet URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/add-sheet', attendanceController.addSheet);

/**
 * @swagger
 * /api/attendance/stats:
 *   get:
 *     summary: Get overall attendance statistics
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Attendance statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStudents:
 *                       type: integer
 *                       example: 50
 *                     totalRecords:
 *                       type: integer
 *                       example: 100
 *                     presentCount:
 *                       type: integer
 *                       example: 85
 *                     absentCount:
 *                       type: integer
 *                       example: 15
 *                     presentPercentage:
 *                       type: string
 *                       example: "85.00"
 */
router.get('/stats', attendanceController.getAttendanceStats);

/**
 * @swagger
 * /api/attendance/search:
 *   get:
 *     summary: Search student attendance by email
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: Student email address
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Filter by date in YYYY-MM-DD format (optional)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Records per page
 *     responses:
 *       200:
 *         description: Student attendance history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     student:
 *                       $ref: '#/components/schemas/Student'
 *                     attendance:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Attendance'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *       404:
 *         description: Student not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', attendanceController.searchByEmail);

/**
 * @swagger
 * /api/attendance/filter:
 *   get:
 *     summary: Filter attendance records
 *     tags: [Filter]
 *     parameters:
 *       - in: query
 *         name: subjectCode
 *         schema:
 *           type: string
 *         description: Subject code (e.g., CS101)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Present, Absent]
 *         description: Attendance status
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Filtered attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     records:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Attendance'
 *                     pagination:
 *                       type: object
 */
router.get('/filter', attendanceController.filterAttendance);

/**
 * @swagger
 * /api/attendance/subject/{subjectCode}:
 *   get:
 *     summary: Get attendance percentage for a subject
 *     tags: [Subject]
 *     parameters:
 *       - in: path
 *         name: subjectCode
 *         schema:
 *           type: string
 *         required: true
 *         description: Subject code (e.g., CS101)
 *     responses:
 *       200:
 *         description: Subject attendance statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     subjectCode:
 *                       type: string
 *                     totalClasses:
 *                       type: integer
 *                     presentCount:
 *                       type: integer
 *                     absentCount:
 *                       type: integer
 *                     attendancePercentage:
 *                       type: number
 *       404:
 *         description: Subject not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/subject/:subjectCode', attendanceController.getSubjectAttendance);

/**
 * @swagger
 * /api/attendance/export:
 *   get:
 *     summary: Export attendance data to Excel
 *     tags: [Export]
 *     parameters:
 *       - in: query
 *         name: subjectCode
 *         schema:
 *           type: string
 *         description: Filter by subject code
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No records found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/export', attendanceController.exportToExcelFile);

/**
 * @swagger
 * /api/attendance/student-percentage/{email}:
 *   get:
 *     summary: Get student attendance percentage by email
 *     tags: [Student]
 *     parameters:
 *       - in: path
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: Student email address
 *     responses:
 *       200:
 *         description: Student attendance percentage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     studentName:
 *                       type: string
 *                     email:
 *                       type: string
 *                     overallAttendancePercentage:
 *                       type: number
 *                     subjectWisePercentage:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subjectCode:
 *                             type: string
 *                           attendancePercentage:
 *                             type: number
 *                           presentDays:
 *                             type: integer
 *                           totalDays:
 *                             type: integer
 *       404:
 *         description: Student not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/student-percentage/:email', attendanceController.getStudentAttendancePercentage);

/**
 * @swagger
 * /api/attendance/dashboard:
 *   get:
 *     summary: Get dashboard overview for today
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Today's attendance summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStudents:
 *                       type: integer
 *                     presentToday:
 *                       type: integer
 *                     absentToday:
 *                       type: integer
 *                     markedToday:
 *                       type: integer
 */
router.get('/dashboard', attendanceController.getDashboard);

module.exports = router;