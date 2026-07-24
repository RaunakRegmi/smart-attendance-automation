const express = require('express');
const qrController = require('../controllers/qrController');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.post('/generate', authorizeRoles('ADMIN'), qrController.generateQR);
router.get('/sessions', authorizeRoles('ADMIN'), qrController.getActiveSessions);
router.put('/deactivate/:id', authorizeRoles('ADMIN'), qrController.deactivateSession);

module.exports = router;
