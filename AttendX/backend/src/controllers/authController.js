const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Section = require('../models/Section');
const { validationResult } = require('express-validator');

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Invalid input', errors: errors.array() });
    }

    const { email, password, rememberMe } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated' });
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token with tokenVersion for invalidation on logout
    const token = jwt.sign(
      { id: user.id, role: user.role, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '24h' }
    );

    // Return user info (without password) and token
    const userWithoutPassword = user.get();
    delete userWithoutPassword.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { name, email, password, gender, bloodGroup, regNum, univId, admissionDate, dob, faculty, facultyId, guardianName, guardianContact, batchId, sectionId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user with STUDENT role
    const user = await User.create({
      email,
      password,
      role: 'STUDENT',
      isActive: true
    });

    // Create student profile linked to user
    const student = await Student.create({
      name,
      email,
      gender,
      bloodGroup,
      regNum,
      univId,
      admissionDate,
      dob,
      faculty: faculty,
      facultyId: facultyId || null,
      guardianName,
      guardianContact,
      batchId,
      sectionId,
      userId: user.id
    });

    // Remove password from response
    const userResponse = user.get();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Student registered',
      data: {
        user: userResponse,
        student
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If user is STUDENT, include student data
    let studentData = null;
    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ where: { userId: user.id } });
      studentData = student;
    }

    res.json({
      success: true,
      data: {
        user,
        student: studentData
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, gender, bloodGroup, regNum, univId, admissionDate, dob, faculty, facultyId, guardianName, guardianContact, batchId, sectionId } = req.body;

    // Find the user
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user fields if needed (email, etc.)
    if (email && email !== user.email) {
      // Check if email already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      await user.update({ email });
    }

    // For STUDENTS: update student profile
    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ where: { userId: user.id } });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }

      // Only allow specific fields for student profile update
      const studentUpdates = {
        name,
        gender,
        bloodGroup,
        regNum,
        univId,
        admissionDate,
        dob,
        faculty,
        facultyId,
        guardianName,
        guardianContact,
        batchId,
        sectionId,
      };

      // Only include fields that are provided
      Object.keys(studentUpdates).forEach(key => {
        if (studentUpdates[key] === undefined) {
          delete studentUpdates[key];
        }
      });

      await student.update(studentUpdates);

      const updatedStudent = await Student.findByPk(student.id, {
        include: [{ model: Batch }, { model: Section }]
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user,
          student: updatedStudent
        }
      });
    } else {
      // For ADMIN: just return user info
      const userWithoutPassword = user.get();
      delete userWithoutPassword.password;

      res.json({
        success: true,
        message: 'Profile updated',
        data: {
          user: userWithoutPassword
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Password strength validation
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Find the user
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validate current password
    const isPasswordValid = await user.validatePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is wrong' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    const userResponse = user.get();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Password updated',
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    // Only ADMIN can access this
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [{
        model: Student,
        required: false
      }]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { email, password, role, isActive } = req.body;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    const user = await User.create({
      email,
      password,
      role: role || 'STUDENT',
      isActive: isActive !== undefined ? isActive : true
    });
    const userResponse = user.get();
    delete userResponse.password;
    res.status(201).json({ success: true, message: 'User created', data: userResponse });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, password, role, isActive } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const updates = {};
    if (email !== undefined) updates.email = email;
    if (password !== undefined) updates.password = password;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    await user.update(updates);
    const userResponse = user.get();
    delete userResponse.password;
    res.json({ success: true, message: 'User updated', data: userResponse });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Soft-deactivate user instead of hard-delete
    await user.update({ isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    // Increment tokenVersion to invalidate all existing tokens for this user
    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.increment('tokenVersion');
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;