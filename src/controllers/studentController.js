const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Section = require('../models/Section');

exports.getProfile = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter is required' });
    }

    const student = await Student.findOne({
      where: { email },
      include: [
        { model: Batch },
        { model: Section },
      ],
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter is required' });
    }

    const updateData = req.body;
    const student = await Student.findOne({ where: { email } });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await student.update(updateData);

    const updatedStudent = await Student.findOne({
      where: { id: student.id },
      include: [
        { model: Batch },
        { model: Section },
      ],
    });

    res.json({ success: true, message: 'Profile updated successfully', data: updatedStudent });
  } catch (error) {
    next(error);
  }
};
