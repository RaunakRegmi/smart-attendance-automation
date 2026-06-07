const { Op, fn, col, literal } = require('sequelize');
const Routine = require('../models/Routine');
const Section = require('../models/Section');
const Batch = require('../models/Batch');
const { parseRoutineFile } = require('../utils/excelHandler');
const fs = require('fs');
const path = require('path');

// Helper function to extract batch abbreviation and section from filename
const extractBatchAndSectionFromFilename = (filename) => {
  // Pattern: A25(L2)_Class_Schedule.xlsx
  const match = filename.match(/^([A-Z0-9]+)\(([^)]+)\)_/);
  if (!match) {
    throw new Error('Invalid filename format. Expected format: "A25(L2)_Class_Schedule.xlsx" where A25 is batch abbreviation and L2 is section name.');
  }
  return {
    batchAbbreviation: match[1],
    sectionName: match[2],
  };
};

exports.uploadRoutine = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let batch, section, batchAbbreviation, sectionName;

    // Prefer explicit batchId/sectionId from form fields over filename parsing
    if (req.body.batchId && req.body.sectionId) {
      batch = await Batch.findByPk(req.body.batchId);
      if (!batch) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: 'Batch not found' });
      }
      section = await Section.findByPk(req.body.sectionId);
      if (!section) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: 'Section not found' });
      }
      batchAbbreviation = batch.abbreviation;
      sectionName = section.name;
    } else {
      // Fallback: parse batch abbreviation and section from filename
      const filename = path.basename(req.file.originalname);
      const parsed = extractBatchAndSectionFromFilename(filename);

      batch = await Batch.findOne({ where: { abbreviation: parsed.batchAbbreviation } });
      if (!batch) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: `Batch with abbreviation "${parsed.batchAbbreviation}" not found.` });
      }

      section = await Section.findOne({ where: { name: parsed.sectionName, batchId: batch.id } });
      if (!section) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ success: false, message: `Section "${parsed.sectionName}" not found for batch "${parsed.batchAbbreviation}".` });
      }
      batchAbbreviation = parsed.batchAbbreviation;
      sectionName = parsed.sectionName;
    }

    // Replace existing routine entries for this section
    await Routine.destroy({ where: { sectionId: section.id } });

    // Parse the file (handles both Excel and CSV)
    const routineRecords = await parseRoutineFile(req.file.path);
    const createdRecords = [];

    for (const record of routineRecords) {
      const routine = await Routine.create({
        sectionId: section.id,
        dayOfWeek: record.dayOfWeek,
        subjectCode: record.subjectCode,
        subjectName: record.subjectName,
        startTime: record.startTime,
        endTime: record.endTime,
        block: record.block,
        room: record.room,
        teacher: record.teacher,
      });
      createdRecords.push(routine);
    }

    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      message: `Routine uploaded successfully for batch "${batchAbbreviation}" section "${sectionName}"`,
      data: {
        batchAbbreviation,
        sectionName,
        recordsCreated: createdRecords.length,
        records: createdRecords,
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
};

exports.getRoutine = async (req, res, next) => {
  try {
    const { sectionId, sectionName, dayOfWeek, batchAbbreviation } = req.query;
    const where = {};

    if (sectionId) where.sectionId = sectionId;
    if (dayOfWeek) where.dayOfWeek = dayOfWeek;

    const queryOptions = {
      where,
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']],
      include: [
        {
          model: Section,
          include: [{ model: Batch }],
        },
      ],
    };

    if (batchAbbreviation) {
      const batch = await Batch.findOne({ where: { abbreviation: batchAbbreviation } });
      if (!batch) {
        return res.status(404).json({ success: false, message: 'Batch not found' });
      }
      const sections = await Section.findAll({ where: { batchId: batch.id } });
      const sectionIds = sections.map((s) => s.id);
      queryOptions.where.sectionId = { [require('sequelize').Op.in]: sectionIds };
    } else if (sectionName) {
      const section = await Section.findOne({ where: { name: sectionName } });
      if (!section) {
        return res.status(404).json({ success: false, message: 'Section not found' });
      }
      queryOptions.where.sectionId = section.id;
    }

    const routines = await Routine.findAll(queryOptions);
    res.json({ success: true, data: routines });
  } catch (error) {
    next(error);
  }
};

exports.listRoutines = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(120, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const countResult = await Routine.findAll({
      attributes: [fn('DISTINCT', col('sectionId')), 'sectionId'],
      raw: true,
    });
    const total = countResult.length;

    const routines = await Routine.findAll({
      attributes: [
        'sectionId',
        [fn('COUNT', col('Routine.id')), 'entryCount'],
        [fn('MAX', col('Routine.createdAt')), 'lastUploadedAt'],
      ],
      include: [{
        model: Section,
        attributes: ['id', 'name'],
        include: [{ model: Batch, attributes: ['id', 'name', 'abbreviation'] }],
      }],
      group: ['sectionId', 'Section.id', 'Section.name', 'Section.Batch.id', 'Section.Batch.name', 'Section.Batch.abbreviation'],
      order: [[fn('MAX', col('Routine.createdAt')), 'DESC']],
      limit,
      offset,
      raw: true,
      nest: true,
    });

    const data = routines.map(r => ({
      sectionId: r.sectionId,
      section: r.Section,
      batch: r.Section.Batch,
      entryCount: parseInt(r.entryCount, 10),
      lastUploadedAt: r.lastUploadedAt,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteRoutine = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    if (!sectionId) {
      return res.status(400).json({ success: false, message: 'sectionId is required' });
    }

    // Check if section exists and is soft-deleted
    const section = await Section.findByPk(sectionId, { paranoid: false });
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    if (!section.deletedAt) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete routines — the section must be deleted first. Delete the section to cascade-delete its routines.',
      });
    }

    // Soft-delete routines for this section (cascade cleanup)
    await Routine.update({ deletedAt: new Date() }, { where: { sectionId } });
    res.json({ success: true, message: 'Routine entries deleted successfully' });
  } catch (error) {
    next(error);
  }
};
