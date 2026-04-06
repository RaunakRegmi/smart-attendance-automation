const swaggerJSDoc = require('swagger-jsdoc');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'QR Attendance API',
    version: '1.0.0',
    description: 'QR-Based Attendance Management System (Node.js/Express + PostgreSQL)',
  },
  servers: [{ url: `http://localhost:${PORT}` }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
    },
  },
};

const swaggerSpec = swaggerJSDoc({
  swaggerDefinition,
  apis: ['./src/routes/**/*.js'],
});

module.exports = { swaggerSpec };

