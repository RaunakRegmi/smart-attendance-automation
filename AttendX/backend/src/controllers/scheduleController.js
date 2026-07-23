const Routine = require('../models/Routine');
const Section = require('../models/Section');
const Student = require('../models/Student');
const User = require('../models/User');

const getTodaySchedule = async (req, res, next) => {
  try {
    const { id: userId } = req.user; // User ID from auth token

    // Find student profile associated with user
    const student = await Student.findOne({
      where: { userId },
      include: [{ model: Section }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Get current date and day of week
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

    // Query routines for today's schedule
    const routines = await Routine.findAll({
      where: {
        sectionId: student.sectionId,
        dayOfWeek: dayOfWeek
      },
      order: [['startTime', 'ASC']]
    });

    // Calculate status and format response for mobile UI
    const currentTime = today.toTimeString().split(' ')[0];
    const scheduleCards = routines.map(routine => {
      const startTime = routine.startTime;
      const endTime = routine.endTime;

      // Determine status based on current time
      let status = 'UPCOMING';
      if (currentTime >= startTime && currentTime <= endTime) {
        status = 'ONGOING';
      } else if (currentTime > endTime) {
        status = 'COMPLETED';
      }

      return {
        id: routine.id,
        subjectCode: routine.subjectCode,
        subjectName: routine.subjectName,
        startTime: routine.startTime,
        endTime: routine.endTime,
        dayOfWeek: routine.dayOfWeek,
        room: routine.room,
        block: routine.block,
        status: status
      };
    });

    res.json({
      success: true,
      data: scheduleCards
    });
  } catch (error) {
    next(error);
  }
};

const getWeeklySchedule = async (req, res, next) => {
  try {
    const { id: userId } = req.user; // User ID from auth token

    // Find student profile associated with user
    const student = await Student.findOne({
      where: { userId },
      include: [{ model: Section }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Get all days of week
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Query routines for the student's section
    const routines = await Routine.findAll({
      where: { sectionId: student.sectionId },
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });

    // Group routines by day of week
    const weeklySchedule = daysOfWeek.map(day => {
      const dayRoutines = routines.filter(routine => routine.dayOfWeek === day);

      const classes = dayRoutines.map(routine => ({
        id: routine.id,
        subjectCode: routine.subjectCode,
        subjectName: routine.subjectName,
        startTime: routine.startTime,
        endTime: routine.endTime,
        room: routine.room,
        block: routine.block,
        teacher: routine.teacher || '',
      }));

      return {
        day: day,
        classes: classes
      };
    });

    res.json({
      success: true,
      data: weeklySchedule
    });
  } catch (error) {
    next(error);
  }
};

const getFullSchedule = async (req, res, next) => {
  try {
    const { id: userId } = req.user; // User ID from auth token

    // Find student profile associated with user
    const student = await Student.findOne({
      where: { userId },
      include: [{ model: Section }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Query all routines for the student's section
    const routines = await Routine.findAll({
      where: { sectionId: student.sectionId },
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });

    // Group routines by day of week
    const scheduleByDay = {};
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    daysOfWeek.forEach(day => {
      scheduleByDay[day] = routines
        .filter(routine => routine.dayOfWeek === day)
        .map(routine => ({
          id: routine.id,
          subjectCode: routine.subjectCode,
          subjectName: routine.subjectName,
          startTime: routine.startTime,
          endTime: routine.endTime,
          room: routine.room,
          block: routine.block
        }));
    });

    const fullSchedule = Object.entries(scheduleByDay).map(([day, classes]) => ({
      day: day,
      classes: classes
    }));

    res.json({
      success: true,
      data: fullSchedule
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodaySchedule,
  getWeeklySchedule,
  getFullSchedule
};