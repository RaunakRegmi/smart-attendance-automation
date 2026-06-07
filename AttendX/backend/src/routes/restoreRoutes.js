const express = require('express');
const router = express.Router();
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  restoreBatch,
  restoreSection,
  restoreSubject,
  restoreLecturer,
  restoreStudent,
} = require('../controllers/restoreController');

// All restore endpoints require ADMIN role
router.post('/batches/:id/restore', authorizeRoles('ADMIN'), restoreBatch);
router.post('/sections/:id/restore', authorizeRoles('ADMIN'), restoreSection);
router.post('/subjects/:id/restore', authorizeRoles('ADMIN'), restoreSubject);
router.post('/lecturers/:id/restore', authorizeRoles('ADMIN'), restoreLecturer);
router.post('/students/:id/restore', authorizeRoles('ADMIN'), restoreStudent);

module.exports = router;
