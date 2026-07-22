const express = require('express');
const multer = require('multer');
const attendanceController = require('../controllers/attendanceController');
const authorizeRoles = require('../middleware/authorizeRoles');
const path = require('path');

const router = express.Router();

router.use(authorizeRoles('ADMIN'));

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
 *     description: |
 *       Upload an Excel file (.xlsx or .xls) containing attendance data.
 *       The file must have either:
 *       - Flat header format with columns: student name, email (gmail), subject code, date, attendance
 *       - Legacy format with subject code in row 3 and dates in row 7
 *       All date headers in row 7 (for legacy format) must be valid dates.
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
 *         description: No file uploaded, invalid format, or invalid date headers
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - $ref: '#/components/schemas/ValidationError'
 */
router.post('/upload', upload.single('file'), attendanceController.uploadExcel);

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
 *           enum: [Present, Absent, Late]
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
 *     summary: Get attendance statistics for a subject
 *     tags: [Subject]
 *     description: |
 *       Returns attendance metrics calculated based on valid session dates.
 *       - `totalSessions`: Count of valid dates from row 7 (legacy format) or Date column (flat format)
 *       - `attendancePercentage`: Calculated as `(presentCount + lateCount) / totalSessions * 100`
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
 *                       example: "CS101"
 *                     totalSessions:
 *                       type: integer
 *                       description: Number of valid session dates
 *                       example: 15
 *                     presentCount:
 *                       type: integer
 *                       description: Number of Present records
 *                       example: 12
 *                     lateCount:
 *                       type: integer
 *                       description: Number of Late records
 *                       example: 1
 *                     attendancePercentage:
 *                       type: number
 *                       format: float
 *                       description: Attendance percentage (Present + Late) / Total Sessions * 100
 *                       example: 86.67
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
 *                     totalSubjects:
 *                       type: integer
 *                     totalBatches:
 *                       type: integer
 *                     generatedReports:
 *                       type: integer
 *                     presentToday:
 *                       type: integer
 *                     absentToday:
 *                       type: integer
 *                     markedToday:
 *                       type: integer
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           title: { type: string }
 *                           timestamp: { type: string, format: date-time }
 *                     enrollmentTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                     subjectsByDepartment:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           department: { type: string }
 *                           count: { type: integer }
 */
router.get('/dashboard', attendanceController.getDashboard);

module.exports = router;