const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.get('/all', authorizeRoles('ADMIN', 'STUDENT'), facultyController.getAllFaculties);
router.get('/', authorizeRoles('ADMIN'), facultyController.getFaculties);
router.post('/', authorizeRoles('ADMIN'), facultyController.createFaculty);
router.get('/:id', authorizeRoles('ADMIN'), facultyController.getFacultyById);
router.put('/:id', authorizeRoles('ADMIN'), facultyController.updateFaculty);
router.delete('/:id', authorizeRoles('ADMIN'), facultyController.deleteFaculty);

module.exports = router;
