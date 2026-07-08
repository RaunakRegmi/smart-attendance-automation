const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.use(authorizeRoles('ADMIN'));

router.get('/logs', auditController.fetchAllLogs);

module.exports = router;