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

    // Extract batch and section from filename
    const filename = path.basename(req.file.originalname);
    const { batchAbbreviation, sectionName } = extractBatchAndSectionFromFilename(filename);

    // Find batch by abbreviation
    const batch = await Batch.findOne({ where: { abbreviation: batchAbbreviation } });
    if (!batch) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: `Batch with abbreviation "${batchAbbreviation}" not found. Please create the batch first.`,
      });
    }

    // Find section for this batch
    const section = await Section.findOne({
      where: { name: sectionName, batchId: batch.id },
    });
    if (!section) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: `Section "${sectionName}" not found for batch "${batchAbbreviation}". Please create the section first.`,
      });
    }

    // Parse the file (handles both Excel and CSV)
    const routineRecords = await parseRoutineFile(req.file.path);
    const createdRecords = [];
    
    // Create routine records (use sectionId from filename, not from file content)
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
    // Clean up file on error
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
