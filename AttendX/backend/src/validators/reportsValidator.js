const Joi = require('joi');

const studentDailySchema = Joi.object({
  studentId: Joi.number().integer().required(),
  date: Joi.date().iso().required(),
});

const studentSubjectTimeSchema = Joi.object({
  studentId: Joi.number().integer().required(),
  subjectId: Joi.number().integer().required(),
  date: Joi.date().iso().required(),
});

const studentSubjectWiseSchema = Joi.object({
  studentId: Joi.number().integer().required(),
  subjectId: Joi.number().integer().optional(),
});

const studentAggregateSchema = Joi.object({
  studentId: Joi.number().integer().required(),
});

const sectionWiseSchema = Joi.object({
  sectionId: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().allow('').optional(),
});

const batchWiseSchema = Joi.object({
  batchId: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().allow('').optional(),
});

const subjectWiseSchema = Joi.object({
  subjectId: Joi.number().integer().optional(),
  subjectCode: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
}).xor('subjectId', 'subjectCode');

const facultyWiseSchema = Joi.object({
  faculty: Joi.string().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const dailySummarySchema = Joi.object({
  date: Joi.date().iso().required(),
});

const monthlySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
});

const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  sectionId: Joi.string().uuid().optional(),
  batchId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const lowAttendanceSchema = Joi.object({
  threshold: Joi.number().min(0).max(100).default(75),
  batchId: Joi.string().uuid().optional(),
  sectionId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const topPerformersSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  batchId: Joi.string().uuid().optional(),
  sectionId: Joi.string().uuid().optional(),
});

const absentStudentsSchema = Joi.object({
  date: Joi.date().iso().required(),
  subjectId: Joi.number().integer().optional(),
  sectionId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const leaderboardSchema = Joi.object({
  batchId: Joi.string().uuid().optional(),
  sectionId: Joi.string().uuid().optional(),
});

const sectionComparisonSchema = Joi.object({
  batchId: Joi.string().uuid().required(),
});

const trendAnalyticsSchema = Joi.object({
  months: Joi.number().integer().min(1).max(24).default(6),
  batchId: Joi.string().uuid().optional(),
  sectionId: Joi.string().uuid().optional(),
});

module.exports = {
  studentDailySchema,
  studentSubjectTimeSchema,
  studentSubjectWiseSchema,
  studentAggregateSchema,
  sectionWiseSchema,
  batchWiseSchema,
  subjectWiseSchema,
  facultyWiseSchema,
  dailySummarySchema,
  monthlySchema,
  dateRangeSchema,
  lowAttendanceSchema,
  topPerformersSchema,
  absentStudentsSchema,
  leaderboardSchema,
  sectionComparisonSchema,
  trendAnalyticsSchema,
};
