const Joi = require('joi');

// Profile update schema – Admin can update only email, Student can update profile fields
const profileUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  gender: Joi.string().optional(),
  bloodGroup: Joi.string().optional(),
  regNum: Joi.string().optional(),
  univId: Joi.string().optional(),
  admissionDate: Joi.date().optional(),
  dob: Joi.date().optional(),
  faculty: Joi.string().optional(),
  guardianName: Joi.string().optional(),
  guardianContact: Joi.string().optional(),
  batchId: Joi.number().integer().optional(),
  sectionId: Joi.number().integer().optional(),
});

// Password update schema – requires current, new, and confirmation
const passwordUpdateSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
    'any.only': 'Passwords do not match',
  }),
});

module.exports = {
  profileUpdateSchema,
  passwordUpdateSchema,
};