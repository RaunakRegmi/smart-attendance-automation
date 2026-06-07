const Batch = require('../models/Batch');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Lecturer = require('../models/Lecturer');
const Student = require('../models/Student');
const Sheets = require('../models/Sheets');
const User = require('../models/User');
const Routine = require('../models/Routine');

async function restoreBatch(req, res, next) {
  try {
    const batch = await Batch.findByPk(req.params.id, { paranoid: false });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!batch.deletedAt) return res.status(409).json({ success: false, message: 'Batch is not deleted' });
    await batch.restore();
    res.json({ success: true, message: 'Batch restored successfully' });
  } catch (error) { next(error); }
}

async function restoreSection(req, res, next) {
  try {
    const section = await Section.findByPk(req.params.id, { paranoid: false });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    if (!section.deletedAt) return res.status(409).json({ success: false, message: 'Section is not deleted' });

    // Cascade restore routines
    await Routine.restore({ where: { sectionId: section.id } });
    await section.restore();
    res.json({ success: true, message: 'Section and its routines restored successfully' });
  } catch (error) { next(error); }
}

async function restoreSubject(req, res, next) {
  try {
    const subject = await Subject.findByPk(req.params.id, { paranoid: false });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    if (!subject.deletedAt) return res.status(409).json({ success: false, message: 'Subject is not deleted' });
    await subject.restore();
    res.json({ success: true, message: 'Subject restored successfully' });
  } catch (error) { next(error); }
}

async function restoreLecturer(req, res, next) {
  try {
    const lecturer = await Lecturer.findByPk(req.params.id, { paranoid: false });
    if (!lecturer) return res.status(404).json({ success: false, message: 'Lecturer not found' });
    if (!lecturer.deletedAt) return res.status(409).json({ success: false, message: 'Lecturer is not deleted' });
    await lecturer.restore();
    res.json({ success: true, message: 'Lecturer restored successfully' });
  } catch (error) { next(error); }
}

async function restoreStudent(req, res, next) {
  try {
    const student = await Student.findByPk(req.params.id, { paranoid: false });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!student.deletedAt) return res.status(409).json({ success: false, message: 'Student is not deleted' });

    // Reactivate user account
    if (student.userId) {
      await User.update({ isActive: true }, { where: { id: student.userId } });
    }
    await student.restore();
    res.json({ success: true, message: 'Student restored and login re-activated successfully' });
  } catch (error) { next(error); }
}

module.exports = {
  restoreBatch,
  restoreSection,
  restoreSubject,
  restoreLecturer,
  restoreStudent,
};
