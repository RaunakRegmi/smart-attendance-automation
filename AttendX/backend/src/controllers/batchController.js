const Batch = require('../models/Batch');
const Section = require('../models/Section');
const Sheets = require('../models/Sheets');
const { Op } = require('sequelize');

exports.createBatch = async (req, res, next) => {
  try {
    const { name, abbreviation } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Batch name is required' });
    }
    if (!abbreviation) {
      return res.status(400).json({ success: false, message: 'Batch abbreviation is required' });
    }

    // Validate abbreviation format (uppercase, alphanumeric only)
    const abbrevRegex = /^[A-Z0-9]+$/;
    if (!abbrevRegex.test(abbreviation)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Use uppercase letters and numbers only (e.g., A25)' 
      });
    }

    const batch = await Batch.create({ name, abbreviation: abbreviation.toUpperCase() });
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

exports.getBatches = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { abbreviation: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = parseInt(limit, 10);
      const offset = (p - 1) * l;
      const { count, rows } = await Batch.findAndCountAll({
        where,
        include: [{ model: Section }],
        order: [['createdAt', 'DESC']],
        limit: l,
        offset,
      });
      return res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: p, limit: l, totalPages: Math.ceil(count / l) },
      });
    }
    const batches = await Batch.findAll({
      where,
      include: [{ model: Section }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
};

exports.getBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findByPk(id, { include: [{ model: Section }] });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

exports.updateBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, abbreviation } = req.body;
    const batch = await Batch.findByPk(id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    
    if (abbreviation) {
      // Validate abbreviation format (uppercase, alphanumeric only)
      const abbrevRegex = /^[A-Z0-9]+$/;
      if (!abbrevRegex.test(abbreviation)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Use uppercase letters and numbers only (e.g., A25)' 
        });
      }
      updateData.abbreviation = abbreviation.toUpperCase();
    }

    await batch.update(updateData);
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

exports.deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findByPk(id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Check blocking conditions: sections OR sheets exist
    const sectionCount = await Section.count({ where: { batchId: id } });
    if (sectionCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Delete sections under "${batch.name}" first`,
      });
    }

    const sheetCount = await Sheets.count({ where: { batchId: id } });
    if (sheetCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Unlink sheets from "${batch.name}" first`,
      });
    }

    await batch.destroy();
    res.json({ success: true, message: 'Batch deleted' });
  } catch (error) {
    next(error);
  }
};
