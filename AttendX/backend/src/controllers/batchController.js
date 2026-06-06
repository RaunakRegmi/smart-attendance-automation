const Batch = require('../models/Batch');
const Section = require('../models/Section');

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
        message: 'Abbreviation must be uppercase alphanumeric (e.g., A25)' 
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
    const batches = await Batch.findAll({
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
          message: 'Abbreviation must be uppercase alphanumeric (e.g., A25)' 
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

    await batch.destroy();
    res.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error) {
    next(error);
  }
};
