const Section = require('../models/Section');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Sheets = require('../models/Sheets');
const Routine = require('../models/Routine');
const { Op } = require('sequelize');

exports.createSection = async (req, res, next) => {
  try {
    const { name, batchId } = req.body;
    if (!name || !batchId) {
      return res.status(400).json({ success: false, message: 'Section name and batchId are required' });
    }

    const section = await Section.create({ name, batchId });
    res.status(201).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

exports.getSections = async (req, res, next) => {
  try {
    const { batchId, search, page, limit } = req.query;
    const where = {};
    if (batchId) where.batchId = batchId;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = parseInt(limit, 10);
      const offset = (p - 1) * l;
      const { count, rows } = await Section.findAndCountAll({
        where,
        include: [{ model: Batch }],
        order: [['name', 'ASC']],
        limit: l,
        offset,
      });
      return res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
      });
    }
    const sections = await Section.findAll({
      where,
      include: [{ model: Batch }],
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: sections });
  } catch (error) {
    next(error);
  }
};

exports.getSectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const section = await Section.findByPk(id, { include: [{ model: Batch }] });

    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    res.json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

exports.updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, batchId } = req.body;
    const section = await Section.findByPk(id);

    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    await section.update({ name, batchId });
    res.json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

exports.deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findByPk(req.params.id);
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    // Check blocking conditions: students OR sheets exist
    const studentCount = await Student.count({ where: { sectionId: section.id } });
    if (studentCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete section "${section.name}" — ${studentCount} student(s) are assigned to it. Remove all students first.`,
      });
    }

    const sheetCount = await Sheets.count({ where: { sectionId: section.id } });
    if (sheetCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete section "${section.name}" — ${sheetCount} sheet(s) are linked to it. Remove all sheets first.`,
      });
    }

    // Cascade soft-delete to routines
    await Routine.update({ deletedAt: new Date() }, { where: { sectionId: section.id } });

    await section.destroy();
    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    next(error);
  }
};
