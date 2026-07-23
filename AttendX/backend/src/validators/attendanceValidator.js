const Joi = require('joi');

const searchByEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const filterAttendanceSchema = Joi.object({
  subjectCode: Joi.string(),
  date: Joi.date(),
  status: Joi.string().valid('Present', 'Absent', 'Late'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

const getSubjectAttendanceSchema = Joi.object({
  subjectCode: Joi.string().required(),
});

module.exports = {
  searchByEmailSchema,
  filterAttendanceSchema,
  getSubjectAttendanceSchema,
};
