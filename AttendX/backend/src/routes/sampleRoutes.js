const express = require('express');
const path = require('path');
const router = express.Router();

const sampleDir = path.join(__dirname, '..', '..');

router.get('/attendance', (req, res) => {
  const filePath = path.join(sampleDir, 'Sample Attendance Format of WEB_L2(Atumn 2025).xlsx');
  res.download(filePath, 'Sample Attendance Format of WEB_L2(Atumn 2025).xlsx');
});

router.get('/routine', (req, res) => {
  const filePath = path.join(sampleDir, 'A25(L2)ClassSchedule.xlsx');
  res.download(filePath, 'A25(L2)ClassSchedule.xlsx');
});

module.exports = router;
