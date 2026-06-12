const Joi = require('joi');

const regNumPattern = /^[a-zA-Z0-9-]+$/;
const contactPattern = /^[0-9+\-]+$/;

// Profile update schema – Admin can update only email, Student can update profile fields
const profileUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  gender: Joi.string().valid('Male', 'Female', 'Others').optional(),
  bloodGroup: Joi.string().optional(),
  regNum: Joi.string().max(15).regex(regNumPattern).optional().messages({
    'string.max': 'Registration number must be at most 15 characters',
    'string.pattern.base': 'Only alphanumeric characters and hyphens allowed',
  }),
  univId: Joi.string().optional(),
  admissionDate: Joi.date().optional(),
  dob: Joi.date().optional(),
  faculty: Joi.string().optional(),
  facultyId: Joi.string().uuid().optional(),
  guardianName: Joi.string().max(50).optional().messages({
    'string.max': 'Guardian name must be at most 50 characters',
  }),
  guardianContact: Joi.string().regex(contactPattern).optional().messages({
    'string.pattern.base': 'Only numbers, + and - allowed',
  }),
  batchId: Joi.number().integer().optional(),
  sectionId: Joi.number().integer().optional(),
});

// Password update schema – requires current, new, and confirmation
const passwordUpdateSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Confirm your new password',
  }),
});

module.exports = {
  profileUpdateSchema,
  passwordUpdateSchema,
};