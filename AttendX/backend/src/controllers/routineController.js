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
    throw new Error('Invalid filename. Use format: "A25(L2)_Class_Schedule.xlsx"');
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
    const destroyWhere = { sectionId: section.id };
    await Routine.destroy({ where: destroyWhere });

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
        block: normalizeBlock(record.block),
        room: record.room,
        teacher: record.teacher,
      });
      createdRecords.push(routine);
    }

    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
        message: `Routine uploaded for ${batchAbbreviation}/${sectionName}`,
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

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const VALID_BLOCK_VALUES = ['Block A', 'Block B', 'Block C', 'Block D'];
const SHORT_BLOCKS = ['A', 'B', 'C', 'D'];

const normalizeBlock = (b) => {
  if (!b) return null;
  const idx = SHORT_BLOCKS.indexOf(b);
  if (idx !== -1) return VALID_BLOCK_VALUES[idx];
  return VALID_BLOCK_VALUES.includes(b) ? b : null;
};

const timeToMinutes = (t) => {
  if (!t || typeof t !== 'string') return null;
  const parts = t.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

exports.updateRoutine = async (req, res, next) => {
  try {
    const { id } = req.params;

    const routine = await Routine.findByPk(id);
    if (!routine) {
      return res.status(404).json({ success: false, message: 'Routine entry not found' });
    }

    const errors = [];

    const dayOfWeek = req.body.dayOfWeek !== undefined ? req.body.dayOfWeek : routine.dayOfWeek;
    const subjectCode = req.body.subjectCode !== undefined ? req.body.subjectCode : routine.subjectCode;
    const subjectName = req.body.subjectName !== undefined ? req.body.subjectName : routine.subjectName;
    const startTime = req.body.startTime !== undefined ? req.body.startTime : routine.startTime;
    const endTime = req.body.endTime !== undefined ? req.body.endTime : routine.endTime;
    const block = req.body.block !== undefined ? req.body.block : routine.block;
    const room = req.body.room !== undefined ? req.body.room : routine.room;
    const teacher = req.body.teacher !== undefined ? req.body.teacher : routine.teacher;

    if (!dayOfWeek) errors.push('Day of week is required');
    else if (!VALID_DAYS.includes(dayOfWeek)) errors.push('Day of week must be one of: ' + VALID_DAYS.join(', '));

    if (!subjectCode) errors.push('Subject code is required');
    if (!subjectName) errors.push('Subject name is required');

    if (!startTime) errors.push('Start time is required');
    else if (timeToMinutes(startTime) === null) errors.push('Start time must be in HH:MM format (e.g. 09:00)');

    if (!endTime) errors.push('End time is required');
    else if (timeToMinutes(endTime) === null) errors.push('End time must be in HH:MM format (e.g. 10:00)');

    if (startTime && endTime && timeToMinutes(startTime) !== null && timeToMinutes(endTime) !== null) {
      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        errors.push('End time must be later than start time');
      }
    }

    if (block) {
      const normalized = normalizeBlock(block);
      if (!normalized) {
        errors.push('Block must be one of: ' + VALID_BLOCK_VALUES.join(', '));
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const updates = {};
    if (req.body.dayOfWeek !== undefined) updates.dayOfWeek = dayOfWeek;
    if (req.body.subjectCode !== undefined) updates.subjectCode = subjectCode;
    if (req.body.subjectName !== undefined) updates.subjectName = subjectName;
    if (req.body.startTime !== undefined) updates.startTime = startTime;
    if (req.body.endTime !== undefined) updates.endTime = endTime;
    if (req.body.block !== undefined) updates.block = normalizeBlock(block) || null;
    if (req.body.room !== undefined) updates.room = room;
    if (req.body.teacher !== undefined) updates.teacher = teacher;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    await routine.update(updates);
    res.json({ success: true, message: 'Routine entry updated', data: routine });
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
        message: 'Delete the section first to remove its routines',
      });
    }

    // Soft-delete routines for this section (cascade cleanup)
    await Routine.update({ deletedAt: new Date() }, { where: { sectionId } });
    res.json({ success: true, message: 'Routine deleted' });
  } catch (error) {
    next(error);
  }
};

// One-time data migration: normalize short block values ("A" → "Block A")
(async () => {
  try {
    const { Op } = require('sequelize');
    const count = await Routine.count({ where: { block: { [Op.in]: SHORT_BLOCKS } } });
    if (count > 0) {
      for (const short of SHORT_BLOCKS) {
        await Routine.update({ block: `Block ${short}` }, { where: { block: short } });
      }
      console.log(`Migrated ${count} routine entries: short block values → Block X format`);
    }
  } catch (e) {
    // silent fail — migration is non-critical
  }
})();
