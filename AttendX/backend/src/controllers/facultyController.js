const { Op } = require('sequelize');
const Faculty = require('../models/Faculty');
const Student = require('../models/Student');

exports.createFaculty = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Faculty name is required' });
    }
    const faculty = await Faculty.create({ name });
    res.status(201).json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

exports.getFaculties = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const where = {};
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = parseInt(limit, 10);
      const offset = (p - 1) * l;
      const { count, rows } = await Faculty.findAndCountAll({
        where,
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
    const faculties = await Faculty.findAll({ where, order: [['name', 'ASC']] });
    res.json({ success: true, data: faculties });
  } catch (error) {
    next(error);
  }
};

exports.getAllFaculties = async (req, res, next) => {
  try {
    const faculties = await Faculty.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: faculties });
  } catch (error) {
    next(error);
  }
};

exports.getFacultyById = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    res.json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

exports.updateFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Faculty name is required' });
    }
    await faculty.update({ name });
    res.json({ success: true, data: faculty });
  } catch (error) {
    next(error);
  }
};

exports.deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const studentCount = await Student.count({ where: { facultyId: faculty.id } });
    if (studentCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Remove students from "${faculty.name}" first`,
      });
    }

    await faculty.destroy();
    res.json({ success: true, message: 'Faculty deleted' });
  } catch (error) {
    next(error);
  }
};
