const Lecturer = require('../models/Lecturer');
const Subject = require('../models/Subject');
const { Op } = require('sequelize');

exports.getLecturers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const { count, rows } = await Lecturer.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });
    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(count / parseInt(limit, 10)) },
    });
  } catch (error) {
    next(error);
  }
};

exports.createLecturer = async (req, res, next) => {
  try {
    const { name, email, contact } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    const lecturer = await Lecturer.create({ name, email, contact });
    res.status(201).json({ success: true, data: lecturer });
  } catch (error) {
    next(error);
  }
};

exports.updateLecturer = async (req, res, next) => {
  try {
    const lecturer = await Lecturer.findByPk(req.params.id);
    if (!lecturer) {
      return res.status(404).json({ success: false, message: 'Lecturer not found' });
    }
    await lecturer.update(req.body);
    res.json({ success: true, data: lecturer });
  } catch (error) {
    next(error);
  }
};

exports.deleteLecturer = async (req, res, next) => {
  try {
    const lecturer = await Lecturer.findByPk(req.params.id);
    if (!lecturer) {
      return res.status(404).json({ success: false, message: 'Lecturer not found' });
    }

    // Check blocking condition: subjects linked to this lecturer
    const subjectCount = await Subject.count({ where: { lecturerId: lecturer.id } });
    if (subjectCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Unlink subjects from "${lecturer.name}" first`,
      });
    }

    await lecturer.destroy();
    res.json({ success: true, message: 'Lecturer deleted' });
  } catch (error) {
    next(error);
  }
};
