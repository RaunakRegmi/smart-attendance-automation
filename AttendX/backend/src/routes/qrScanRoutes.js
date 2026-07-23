const express = require('express');
const qrController = require('../controllers/qrController');
const authorizeRoles = require('../middleware/authorizeRoles');

const router = express.Router();

router.post('/scan', authorizeRoles('STUDENT'), qrController.scanQR);

module.exports = router;
