const express = require('express');
const qrController = require('../controllers/qrController');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.use(authorizeRoles('ADMIN'));

router.post('/generate', qrController.generateQR);
router.get('/sessions', qrController.getActiveSessions);
router.put('/deactivate/:id', qrController.deactivateSession);

module.exports = router;
