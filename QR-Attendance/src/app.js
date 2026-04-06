const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const { notFoundHandler, errorHandler } = require('./middleware/errorHandlers');
const { swaggerSpec } = require('./swagger');
const { authRoutes } = require('./routes/authRoutes');
const { adminRoutes } = require('./routes/adminRoutes');
const { classRoutes } = require('./routes/classRoutes');
const { attendanceRoutes } = require('./routes/attendanceRoutes');
const { reportRoutes } = require('./routes/reportRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };

