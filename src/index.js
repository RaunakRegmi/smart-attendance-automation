const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const sequelize = require('./config/database');
const swaggerSpecs = require('./config/swagger');
const attendanceRoutes = require('./routes/attendanceRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const batchRoutes = require('./routes/batchRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const routineRoutes = require('./routes/routineRoutes');
const sheetsRoutes = require('./routes/sheetsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const attendanceController = require('./controllers/attendanceController');
const errorHandler = require('./middleware/errorHandler');
const Student = require('./models/Student');
const User = require('./models/User');
const authMiddleware = require('./middleware/authMiddleware');
const Batch = require('./models/Batch');
const Section = require('./models/Section');
const Routine = require('./models/Routine');
const Sheets = require('./models/Sheets');
const AuditLog = require('./models/AuditLog');

const app = express();

// Initialize Admin User on startup
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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

Section.hasMany(Routine, { foreignKey: 'sectionId' });
Routine.belongsTo(Section, { foreignKey: 'sectionId' });

// Sheets associations
Batch.hasMany(Sheets, { foreignKey: 'batchId' });
Sheets.belongsTo(Batch, { foreignKey: 'batchId' });
Section.hasMany(Sheets, { foreignKey: 'sectionId' });
Sheets.belongsTo(Section, { foreignKey: 'sectionId' });

app.use('/api/attendance', attendanceRoutes);
app.post('/add-sheet', attendanceController.addSheet);
app.use('/api/students', studentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/routine', routineRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/auth', authRoutes);

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
    await sequelize.sync({ alter: true });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
