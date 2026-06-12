const { Op } = require('sequelize');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Section = require('../models/Section');
const User = require('../models/User');
const sheetAppendQueue = require('../queues/sheetAppendQueue');

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
    const { name, email, batchId, sectionId, password, facultyId, ...profile } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existing = await Student.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
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
      facultyId: facultyId || null,
      userId,
      ...profile,
    });

    const created = await Student.findByPk(student.id, {
      include: [{ model: Batch }, { model: Section }],
    });

    sheetAppendQueue.add('append-student', { student: { id: student.id, name, email, batchId: batchId || null, sectionId: sectionId || null } })
      .catch((err) => console.error('Failed to enqueue sheet append job:', err.message));

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
    if ('facultyId' in updateData) updateData.facultyId = updateData.facultyId || null;
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

    // Block if already deleted
    if (student.deletedAt) {
      return res.status(409).json({ success: false, message: 'Student already deleted' });
    }

    // Deactivate user account (soft-delete login)
    if (student.userId) {
      await User.update({ isActive: false }, { where: { id: student.userId } });
    }

    // Soft-delete the student
    await student.destroy();
    res.json({ success: true, message: 'Student deleted' });
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

    res.json({ success: true, message: 'Profile updated', data: updatedStudent });
  } catch (error) {
    next(error);
  }
};
