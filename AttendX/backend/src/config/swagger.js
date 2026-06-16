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
            status: { type: 'string', enum: ['Present', 'Absent', 'Late'], example: 'Present' },
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
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Sheet contains invalid date headers in row 7' },
            details: {
              type: 'array',
              items: { type: 'string' },
              example: ['Column 2: Oct 5', 'Column 5: Invalid Date']
            }
          }
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
        SyncJob: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            sheetId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174003' },
            syncType: { type: 'string', enum: ['AUTO', 'MANUAL'], example: 'AUTO' },
            scheduledTime: { type: 'string', format: 'date-time', example: '2026-05-13T06:00:00.000Z' },
            startTime: { type: 'string', format: 'date-time', nullable: true },
            endTime: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'], example: 'PENDING' },
            retryCount: { type: 'integer', example: 0 },
            failureDetails: { type: 'string', nullable: true },
            lastAttemptTime: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        QueueStatus: {
          type: 'object',
          properties: {
            totalJobs: { type: 'integer', example: 5 },
            waiting: { type: 'integer', example: 2 },
            active: { type: 'integer', example: 1 },
            completed: { type: 'integer', example: 1 },
            failed: { type: 'integer', example: 1 },
          },
        },
        SchedulerStatus: {
          type: 'object',
          properties: {
            running: { type: 'boolean', example: true },
            timezone: { type: 'string', example: 'Asia/Kathmandu' },
            syncTime: { type: 'string', example: '06:00' },
            nextRun: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Lecturer: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Dr. Smith' },
            email: { type: 'string', example: 'smith@university.edu' },
            contact: { type: 'string', example: '+9779800000000' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        StudentInfo: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            studentId: { type: 'string', example: 'REG2024001' },
            department: { type: 'string', example: 'Engineering' },
            batch: { type: 'string', example: 'November 2025', nullable: true },
            section: { type: 'string', example: 'L2', nullable: true },
          },
        },
        SubjectAttendanceStat: {
          type: 'object',
          properties: {
            subject: { type: 'string', example: 'Data Structures and Algorithms' },
            code: { type: 'string', example: 'DSA001' },
            total: { type: 'integer', example: 20 },
            attended: { type: 'integer', example: 18 },
            absents: { type: 'integer', example: 1 },
            lates: { type: 'integer', example: 1 },
            percentage: { type: 'number', example: 90.0 },
            isOnTrack: { type: 'boolean', example: true },
          },
        },
        StudentScheduleEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            subject: { type: 'string', example: 'Data Structures and Algorithms' },
            subjectCode: { type: 'string', example: 'DSA001' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '10:00' },
            room: { type: 'string', example: 'A25' },
            teacher: { type: 'string', example: '' },
            type: { type: 'string', example: 'Lecture' },
            status: { type: 'string', enum: ['UPCOMING', 'ONGOING', 'COMPLETED'] },
          },
        },
        AttendanceLogItem: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            subject: { type: 'string', example: 'Data Structures and Algorithms' },
            code: { type: 'string', example: 'DSA001' },
            status: { type: 'string', enum: ['Present', 'Absent', 'Late'] },
            date: { type: 'string', format: 'date', example: '2025-01-15' },
            time: { type: 'string', format: 'date-time' },
            room: { type: 'string', example: 'A25' },
          },
        },
        StudentDashboardResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                student: { $ref: '#/components/schemas/StudentInfo' },
                attendance: {
                  type: 'object',
                  properties: {
                    overallPercentage: { type: 'number', example: 85.5 },
                    subjectWise: { type: 'array', items: { $ref: '#/components/schemas/SubjectAttendanceStat' } },
                    totalSubjects: { type: 'integer', example: 6 },
                    atRiskCount: { type: 'integer', example: 1 },
                  },
                },
                todaySchedule: {
                  type: 'object',
                  properties: {
                    classes: { type: 'array', items: { $ref: '#/components/schemas/StudentScheduleEntry' } },
                    totalToday: { type: 'integer', example: 4 },
                    nextClass: { oneOf: [{ $ref: '#/components/schemas/StudentScheduleEntry' }, { type: 'null' }] },
                  },
                },
                recentLogs: { type: 'array', items: { $ref: '#/components/schemas/AttendanceLogItem' } },
                notifications: {
                  type: 'object',
                  properties: { unreadCount: { type: 'integer', example: 3 } },
                },
                weeklyOverview: {
                  type: 'object',
                  properties: {
                    days: { type: 'array', items: { type: 'string' } },
                    heights: { type: 'array', items: { type: 'integer' } },
                  },
                },
              },
            },
          },
        },
        AttendanceSummaryOverall: {
          type: 'object',
          properties: {
            percentage: { type: 'number', example: 85.5 },
            attended: { type: 'integer', example: 80 },
            total: { type: 'integer', example: 95 },
            absents: { type: 'integer', example: 10 },
            lates: { type: 'integer', example: 5 },
          },
        },
        AttendanceSummaryResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                overall: { $ref: '#/components/schemas/AttendanceSummaryOverall' },
                subjects: { type: 'array', items: { $ref: '#/components/schemas/SubjectAttendanceStat' } },
                atRisk: { type: 'integer', example: 1 },
              },
            },
          },
        },
        AttendanceLogsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/AttendanceLogItem' } },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 50 },
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                totalPages: { type: 'integer', example: 3 },
              },
            },
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
