const express = require('express');
const router = express.Router();
const agentTools = require('../controllers/agentToolsController');
const authorizeRoles = require('../middleware/authorizeRoles');

// Called by the Python agent over HTTP with the caller's JWT (validated by the
// global authMiddleware). STUDENT-safe tools self-scope; admin-only tools guard here.

// Available to both roles (STUDENT is forced to their own record inside).
router.post('/student-attendance', agentTools.studentAttendance);

// Admin-only analytics tools.
router.post('/at-risk', authorizeRoles('ADMIN'), agentTools.atRiskStudents);
router.post('/batch-summary', authorizeRoles('ADMIN'), agentTools.batchSummary);
router.post('/course-performance', authorizeRoles('ADMIN'), agentTools.coursePerformance);

module.exports = router;
