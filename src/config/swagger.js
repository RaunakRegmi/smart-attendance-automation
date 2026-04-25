const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

// Use PUBLIC_URL env var if set, otherwise fall back to localhost with the configured PORT
const serverUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Student Attendance Management System API',
      version: '1.0.0',
      description: 'Complete API for managing student attendance with Excel import/export',
      contact: {
        name: 'Support',
        email: 'support@attendance.com',
      },
    },
    servers: [
      {
        url: serverUrl,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Student: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@gmail.com' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', example: 'admin@example.com' },
            role: { type: 'string', enum: ['ADMIN', 'STUDENT'], example: 'ADMIN' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Subject: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            subjectCode: { type: 'string', example: 'CS101' },
            subjectName: { type: 'string', example: 'Introduction to Computer Science' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Attendance: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            studentId: { type: 'integer', example: 1 },
            subjectId: { type: 'integer', example: 1 },
            date: { type: 'string', format: 'date', example: '2024-01-15' },
            status: { type: 'string', enum: ['Present', 'Absent'], example: 'Present' },
            Student: { $ref: '#/components/schemas/Student' },
            Subject: { $ref: '#/components/schemas/Subject' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
          },
        },
        UploadResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Excel file processed' },
            data: {
              type: 'object',
              properties: {
                success: { type: 'integer', example: 10 },
                failed: { type: 'integer', example: 0 },
                errors: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        StudentProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@gmail.com' },
            gender: { type: 'string', example: 'Male' },
            bloodGroup: { type: 'string', example: 'O+' },
            regNum: { type: 'string', example: 'REG2025' },
            univId: { type: 'string', example: 'UNI12345' },
            admissionDate: { type: 'string', format: 'date', example: '2025-08-01' },
            dob: { type: 'string', format: 'date', example: '2005-05-10' },
            faculty: { type: 'string', example: 'Engineering' },
            guardianName: { type: 'string', example: 'Jane Doe' },
            guardianContact: { type: 'string', example: '+911234567890' },
            batchId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174001' },
            sectionId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174002' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        StudentProfileUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            gender: { type: 'string' },
            bloodGroup: { type: 'string' },
            regNum: { type: 'string' },
            univId: { type: 'string' },
            admissionDate: { type: 'string', format: 'date' },
            dob: { type: 'string', format: 'date' },
            faculty: { type: 'string' },
            guardianName: { type: 'string' },
            guardianContact: { type: 'string' },
            batchId: { type: 'string', format: 'uuid' },
            sectionId: { type: 'string', format: 'uuid' },
          },
        },
        BatchCreate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174001' },
            name: { type: 'string', example: 'November 2025' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Batch: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174001' },
            name: { type: 'string', example: 'November 2025' },
            Sections: { type: 'array', items: { $ref: '#/components/schemas/Section' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SectionCreate: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174002' },
            name: { type: 'string', example: 'L2' },
            batchId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174001' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Section: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174002' },
            name: { type: 'string', example: 'L2' },
            batchId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174001' },
            Batch: { $ref: '#/components/schemas/Batch' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Routine: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174003' },
            sectionId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174002' },
            dayOfWeek: { type: 'string', example: 'Monday' },
            subjectCode: { type: 'string', example: 'DSA001' },
            subjectName: { type: 'string', example: 'Data Structures and Algorithms' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '10:00' },
            room: { type: 'string', example: 'A25' },
            Section: { $ref: '#/components/schemas/Section' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    // Apply security globally to all endpoints
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
