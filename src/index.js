const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const sequelize = require('./config/database');
const swaggerSpecs = require('./config/swagger');
const attendanceRoutes = require('./routes/attendanceRoutes');
const studentRoutes = require('./routes/studentRoutes');
const batchRoutes = require('./routes/batchRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const routineRoutes = require('./routes/routineRoutes');
const errorHandler = require('./middleware/errorHandler');
const Student = require('./models/Student');
const Subject = require('./models/Subject');
const Attendance = require('./models/Attendance');
const Batch = require('./models/Batch');
const Section = require('./models/Section');
const Routine = require('./models/Routine');

const app = express();

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
}));

app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

Batch.hasMany(Section, { foreignKey: 'batchId' });
Section.belongsTo(Batch, { foreignKey: 'batchId' });

Batch.hasMany(Student, { foreignKey: 'batchId' });
Student.belongsTo(Batch, { foreignKey: 'batchId' });

Section.hasMany(Student, { foreignKey: 'sectionId' });
Student.belongsTo(Section, { foreignKey: 'sectionId' });

Section.hasMany(Routine, { foreignKey: 'sectionId' });
Routine.belongsTo(Section, { foreignKey: 'sectionId' });

app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/routine', routineRoutes);

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

// const startServer = async () => {
//   try {
//     await sequelize.authenticate();
//     console.log('Database connected');

    // await sequelize.sync({ alter: true });
    // console.log('Database synchronized');

//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//   } catch (error) {
//     console.error('Failed to start server:', error);
//     process.exit(1);
//   }
// };

//Wait for DB to be ready before starting server
const startServer = async () => {
  let retries = 5;

  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('Database connected');
      break;
    } catch (error) {
      console.log(`DB not ready, retries left: ${retries}`);
      retries -= 1;
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  // await sequelize.sync(); // safe sync
  await sequelize.sync({ alter: true }); // updated schema automatically

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};


startServer();
