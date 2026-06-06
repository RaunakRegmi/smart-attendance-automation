const { Op } = require('sequelize');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Section = require('../models/Section');
const User = require('../models/User');

exports.getStudents = async (req, res, next) => {
  try {
    const { search, batchId, sectionId, page = 1, limit = 10 } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (sectionId) {
      where.sectionId = sectionId;
    } else if (batchId) {
      const sectionsInBatch = await Section.findAll({ where: { batchId }, attributes: ['id'] });
      const sectionIds = sectionsInBatch.map(s => s.id);
      const batchConditions = [{ batchId }];
      if (sectionIds.length > 0) batchConditions.push({ sectionId: { [Op.in]: sectionIds } });
      where[Op.or] = batchConditions;
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const { count, rows } = await Student.findAndCountAll({
      where,
      include: [{ model: Batch }, { model: Section }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createStudent = async (req, res, next) => {
  try {
    const { name, email, batchId, sectionId, password, ...profile } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existing = await Student.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Student with this email already exists' });
    }

    let userId = null;
    if (password) {
      const [user] = await User.findOrCreate({
        where: { email },
        defaults: { password, role: 'STUDENT', isActive: true },
      });
      userId = user.id;
    }

    const student = await Student.create({
      name,
      email,
      batchId: batchId || null,
      sectionId: sectionId || null,
      userId,
      ...profile,
    });

    const created = await Student.findByPk(student.id, {
      include: [{ model: Batch }, { model: Section }],
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const updateData = { ...req.body };
    if ('batchId' in updateData) updateData.batchId = updateData.batchId || null;
    if ('sectionId' in updateData) updateData.sectionId = updateData.sectionId || null;
    await student.update(updateData);
    const updated = await Student.findByPk(student.id, {
      include: [{ model: Batch }, { model: Section }],
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (student.userId) {
      await User.destroy({ where: { id: student.userId } });
    }
    await student.destroy();
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter is required' });
    }

    const student = await Student.findOne({
      where: { email },
      include: [
        { model: Batch },
        { model: Section },
      ],
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter is required' });
    }

    const updateData = req.body;
    const student = await Student.findOne({ where: { email } });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await student.update(updateData);

    const updatedStudent = await Student.findOne({
      where: { id: student.id },
      include: [
        { model: Batch },
        { model: Section },
      ],
    });

    res.json({ success: true, message: 'Profile updated successfully', data: updatedStudent });
  } catch (error) {
    next(error);
  }
};
