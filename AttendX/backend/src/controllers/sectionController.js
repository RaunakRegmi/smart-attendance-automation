const Section = require('../models/Section');
const Batch = require('../models/Batch');

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
    const { batchId } = req.query;
    const where = {};
    if (batchId) where.batchId = batchId;

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
    await section.destroy();
    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    next(error);
  }
};
