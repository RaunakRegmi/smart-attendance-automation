const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const swaggerSpecs = require('./config/swagger');
const attendanceRoutes = require('./routes/attendanceRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const batchRoutes = require('./routes/batchRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const routineRoutes = require('./routes/routineRoutes');
const sheetsRoutes = require('./routes/sheetsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const syncRoutes = require('./routes/syncRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const lecturerRoutes = require('./routes/lecturerRoutes');
const facultyRoutes = require('./routes/facultyRoutes');

const reportsRoutes = require('./routes/reportsRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const agentToolRoutes = require('./routes/agentToolRoutes');
const restoreRoutes = require('./routes/restoreRoutes');
const sampleRoutes = require('./routes/sampleRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const messagesRoutes = require('./routes/messagesRoutes');
const adminTeacherRoutes = require('./routes/adminTeacherRoutes');
const qrSessionRoutes = require('./routes/qrSessionRoutes');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/authMiddleware');
const defineAssociations = require('./associations');

const app = express();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const avatarsDir = path.join(uploadDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  swaggerOptions: {
    url: '/api-docs/swagger.json',
  },
}),);

app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

const auditApiLogs = require('./middleware/loggingMiddleware').auditApiLogs;
const auditResponseLogger = require('./middleware/loggingMiddleware').auditResponseLogger;

// Apply audit logging middleware
app.use(auditApiLogs);
app.use(auditResponseLogger);

app.use(authMiddleware);

// After the routers above have loaded their models, so these declarations win over the
// duplicates a few models declare for themselves.
defineAssociations();

app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/routine', routineRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/lecturers', lecturerRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/student', studentPortalRoutes);
app.use('/api', notificationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/agent-tools', agentToolRoutes);
app.use('/api/admin', restoreRoutes);
app.use('/api/samples', sampleRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminTeacherRoutes);
app.use('/api/qr-sessions', qrSessionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Student Attendance Management System API',
    documentation: 'http://localhost:5000/api-docs',
    health: 'http://localhost:5000/api/health',
  });
});

app.use(errorHandler);

module.exports = app;
