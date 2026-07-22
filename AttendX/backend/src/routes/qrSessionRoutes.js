const express = require('express');
const router = express.Router();
const qrSessionController = require('../controllers/qrSessionController');
const authorizeRoles = require('../middleware/authorizeRoles');

router.get(
  '/requests/pending',
  authorizeRoles('TEACHER'),
  qrSessionController.getPendingRequests
);

router.put(
  '/requests/:requestId',
  authorizeRoles('TEACHER'),
  qrSessionController.decideRequest
);

router.post(
  '/',
  authorizeRoles('TEACHER'),
  qrSessionController.createSession
);

router.get(
  '/',
  authorizeRoles('TEACHER', 'ADMIN'),
  qrSessionController.getSessionHistory
);

router.post(
  '/:sessionId/refresh',
  authorizeRoles('TEACHER'),
  qrSessionController.refreshQR
);

router.post(
  '/:sessionId/close',
  authorizeRoles('TEACHER'),
  qrSessionController.closeSession
);

router.get(
  '/:sessionId',
  authorizeRoles('TEACHER', 'ADMIN'),
  qrSessionController.getSession
);

router.post(
  '/scan',
  authorizeRoles('STUDENT'),
  qrSessionController.scanAttendance
);

router.post(
  '/:sessionId/late-request',
  authorizeRoles('STUDENT'),
  qrSessionController.submitLateRequest
);

module.exports = router;
