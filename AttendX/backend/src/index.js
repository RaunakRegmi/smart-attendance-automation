const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const sequelize = require('./config/database');
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
const schedulerService = require('./services/schedulerService');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User');
const Student = require('./models/Student');
const authMiddleware = require('./middleware/authMiddleware');
const Batch = require('./models/Batch');
const Section = require('./models/Section');
const Routine = require('./models/Routine');
const Subject = require('./models/Subject');
const Lecturer = require('./models/Lecturer');
const Faculty = require('./models/Faculty');
const Sheets = require('./models/Sheets');

const Attendance = require('./models/Attendance');
const AuditLog = require('./models/AuditLog');
const Notification = require('./models/Notification');
const Setting = require('./models/Setting');
const Conversation = require('./models/Conversation');
const ChatMessage = require('./models/ChatMessage');
const TeacherAssignment = require('./models/TeacherAssignment');
const MessageThread = require('./models/MessageThread');
const MessageThreadParticipant = require('./models/MessageThreadParticipant');
const ThreadMessage = require('./models/ThreadMessage');

const app = express();

// Initialize Admin User on startup
const bcrypt = require('bcryptjs');
const ensureAdminUser = async () => {
  try {
    const adminUser = await User.findOne({ where: { email: 'admin@example.com' } });
    if (!adminUser) {
      await User.create({
        email: 'admin@example.com',
        password: 'admin@123',
        role: 'ADMIN',
        isActive: true
      });
    } else {
      // Ensure password is hashed; if not, rehash
      if (!adminUser.password.startsWith('$2')) {
        adminUser.password = 'admin@123';
        await adminUser.save(); // triggers beforeUpdate hook
        console.log('Admin password hashed on startup');
      }
    }
  } catch (error) {
    console.error('Failed to ensure admin user:', error);
  }
};

ensureAdminUser();

// Middleware for authentication
// app.use(authMiddleware); // moved after Swagger routes

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

Batch.hasMany(Section, { foreignKey: 'batchId' });
Section.belongsTo(Batch, { foreignKey: 'batchId' });

Batch.hasMany(Student, { foreignKey: 'batchId' });
Student.belongsTo(Batch, { foreignKey: 'batchId' });

Section.hasMany(Student, { foreignKey: 'sectionId' });
Student.belongsTo(Section, { foreignKey: 'sectionId' });

// Link User and Student (userId on Student)
User.hasOne(Student, { foreignKey: 'userId' });
Student.belongsTo(User, { foreignKey: 'userId' });

Section.hasMany(Routine, { foreignKey: 'sectionId' });
Routine.belongsTo(Section, { foreignKey: 'sectionId' });

// Faculty associations
Faculty.hasMany(Student, { foreignKey: 'facultyId' });
Student.belongsTo(Faculty, { foreignKey: 'facultyId' });

// Subject-Lecturer associations
Lecturer.hasMany(Subject, { foreignKey: 'lecturerId' });
Subject.belongsTo(Lecturer, { foreignKey: 'lecturerId' });

// Sheets associations
Batch.hasMany(Sheets, { foreignKey: 'batchId' });
Sheets.belongsTo(Batch, { foreignKey: 'batchId' });
Section.hasMany(Sheets, { foreignKey: 'sectionId' });
Sheets.belongsTo(Section, { foreignKey: 'sectionId' });

// Chat memory associations
User.hasMany(Conversation, { foreignKey: 'userId' });
Conversation.belongsTo(User, { foreignKey: 'userId' });
Conversation.hasMany(ChatMessage, { foreignKey: 'conversationId' });
ChatMessage.belongsTo(Conversation, { foreignKey: 'conversationId' });

// Lecturer → optional login user (role TEACHER); manual admin "promote" only
User.hasOne(Lecturer, { foreignKey: 'userId' });
Lecturer.belongsTo(User, { foreignKey: 'userId' });

// Teacher assignment associations (row-level scoping backbone)
User.hasMany(TeacherAssignment, { foreignKey: 'teacherUserId', as: 'teacherAssignments' });
TeacherAssignment.belongsTo(User, { foreignKey: 'teacherUserId', as: 'teacher' });
Section.hasMany(TeacherAssignment, { foreignKey: 'sectionId' });
TeacherAssignment.belongsTo(Section, { foreignKey: 'sectionId' });
Subject.hasMany(TeacherAssignment, { foreignKey: 'subjectId' });
TeacherAssignment.belongsTo(Subject, { foreignKey: 'subjectId' });

// Messaging associations (async threads; distinct from the chatbot's Conversation)
MessageThread.hasMany(MessageThreadParticipant, { foreignKey: 'threadId', as: 'participants' });
MessageThreadParticipant.belongsTo(MessageThread, { foreignKey: 'threadId' });
User.hasMany(MessageThreadParticipant, { foreignKey: 'userId' });
MessageThreadParticipant.belongsTo(User, { foreignKey: 'userId' });
MessageThread.hasMany(ThreadMessage, { foreignKey: 'threadId', as: 'messages' });
ThreadMessage.belongsTo(MessageThread, { foreignKey: 'threadId' });
User.hasMany(ThreadMessage, { foreignKey: 'senderId', as: 'sentThreadMessages' });
ThreadMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
MessageThread.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
// For STUDENT_TEACHER_SUBJECT threads, contextId points at subjects.id
// (constraints: false — contextId is polymorphic-by-contextType, null for admin threads).
MessageThread.belongsTo(Subject, { foreignKey: 'contextId', as: 'contextSubject', constraints: false });

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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    // In Docker, migrations are applied on startup; avoid alter sync wiping/changing schema unexpectedly
    if (process.env.DB_SYNC_ALTER === 'true') {
      await sequelize.sync({ alter: true });
      console.log('Database schema synced (alter mode)');
    }
    // Start the attendance sync scheduler (auto sync)
    schedulerService.start();
    // Start BullMQ worker to process sheet sync jobs
    require('./workers/sheetSyncWorker');
    // Start BullMQ worker to process sheet append jobs
    require('./workers/sheetAppendWorker');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown for scheduler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received: stopping scheduler service');
  await schedulerService.stop();
  process.exit(0);
});
