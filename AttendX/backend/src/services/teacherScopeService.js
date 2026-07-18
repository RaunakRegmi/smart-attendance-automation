const { Op } = require('sequelize');
const TeacherAssignment = require('../models/TeacherAssignment');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Routine = require('../models/Routine');

const AT_RISK_THRESHOLD = 80;

const pairKey = (sectionId, subjectId) => `${sectionId}::${Number(subjectId)}`;

// The single reusable scoping helper: every teacher-facing read/write must
// filter through the (sectionId, subjectId) pairs returned here. Never rely on
// the frontend to scope.
const getAssignedScope = async (teacherUserId) => {
  const assignments = await TeacherAssignment.findAll({
    where: { teacherUserId, isActive: true },
    include: [
      { model: Section, include: [{ model: Batch }] },
      { model: Subject },
    ],
    order: [['createdAt', 'ASC']],
  });
  const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];
  const subjectIds = [...new Set(assignments.map((a) => a.subjectId))];
  const pairs = new Set(assignments.map((a) => pairKey(a.sectionId, a.subjectId)));
  return {
    assignments,
    sectionIds,
    subjectIds,
    isEmpty: assignments.length === 0,
    hasPair: (sectionId, subjectId) => pairs.has(pairKey(sectionId, subjectId)),
    hasSection: (sectionId) => sectionIds.includes(sectionId),
    hasSubject: (subjectId) => subjectIds.includes(Number(subjectId)),
  };
};

// Routines have no subjectId FK — subjectCode is free text. Match it against
// the subjects table; when a code in an assigned section resolves to no
// subject, warn and surface the row instead of silently dropping it (a typo
// there would otherwise hide a teacher's class).
const resolveRoutinesForScope = async (scope, dayOfWeek = null) => {
  if (scope.isEmpty) return { classes: [], unresolvedRoutines: [] };
  const where = { sectionId: { [Op.in]: scope.sectionIds } };
  if (dayOfWeek) where.dayOfWeek = dayOfWeek;
  const routines = await Routine.findAll({ where, order: [['startTime', 'ASC']] });
  const subjects = await Subject.findAll();
  const byCode = new Map(subjects.map((s) => [s.subjectCode, s]));
  const sectionsById = new Map(scope.assignments.map((a) => [a.sectionId, a.Section]));

  const classes = [];
  const unresolvedRoutines = [];
  for (const r of routines) {
    const subject = byCode.get(r.subjectCode);
    if (!subject) {
      console.warn(
        `[teacherScope] routine ${r.id} (section ${r.sectionId}, ${r.dayOfWeek}) has subjectCode "${r.subjectCode}" that resolves to no subject — surfacing as unresolved`
      );
      unresolvedRoutines.push({
        routineId: r.id,
        sectionId: r.sectionId,
        sectionName: sectionsById.get(r.sectionId)?.name || null,
        dayOfWeek: r.dayOfWeek,
        subjectCode: r.subjectCode,
        subjectName: r.subjectName,
        startTime: r.startTime,
        endTime: r.endTime,
        reason: 'SUBJECT_CODE_UNRESOLVED',
      });
      continue;
    }
    if (!scope.hasPair(r.sectionId, subject.id)) continue; // another teacher's class
    const section = sectionsById.get(r.sectionId);
    classes.push({
      routineId: r.id,
      sectionId: r.sectionId,
      sectionName: section?.name || null,
      batchName: section?.Batch?.name || null,
      subjectId: subject.id,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName || r.subjectName,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      room: r.room,
      block: r.block,
    });
  }
  return { classes, unresolvedRoutines };
};

// Per-student attendance stats for one (section, subject) pair.
// attended = Present + Late, at-risk below threshold — same math the student
// portal uses.
const getRosterWithStats = async (sectionId, subjectId, threshold = AT_RISK_THRESHOLD) => {
  const students = await Student.findAll({
    where: { sectionId },
    attributes: ['id', 'name', 'email', 'regNum', 'univId', 'avatarUrl', 'userId'],
    order: [['name', 'ASC']],
  });
  const studentIds = students.map((s) => s.id);
  const records = studentIds.length
    ? await Attendance.findAll({
        where: { studentId: { [Op.in]: studentIds }, subjectId },
        attributes: ['studentId', 'status'],
      })
    : [];
  const byStudent = new Map();
  for (const r of records) {
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, { total: 0, present: 0, absent: 0, late: 0 });
    const s = byStudent.get(r.studentId);
    s.total++;
    if (r.status === 'Present') s.present++;
    else if (r.status === 'Absent') s.absent++;
    else if (r.status === 'Late') s.late++;
  }
  return students.map((student) => {
    const s = byStudent.get(student.id) || { total: 0, present: 0, absent: 0, late: 0 };
    const attended = s.present + s.late;
    const percentage = s.total > 0 ? parseFloat(((attended / s.total) * 100).toFixed(1)) : 0;
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      regNum: student.regNum,
      univId: student.univId,
      avatarUrl: student.avatarUrl,
      userId: student.userId,
      attendance: {
        total: s.total,
        present: s.present,
        absent: s.absent,
        late: s.late,
        percentage,
        atRisk: s.total > 0 && percentage < threshold,
      },
    };
  });
};

// At-risk rows across every assigned (section, subject) pair. One row per
// (student, subject) under the threshold, sorted worst-first.
const getAtRiskStudents = async (scope, threshold = AT_RISK_THRESHOLD) => {
  const rows = [];
  for (const assignment of scope.assignments) {
    const roster = await getRosterWithStats(assignment.sectionId, assignment.subjectId, threshold);
    for (const student of roster) {
      if (!student.attendance.atRisk) continue;
      rows.push({
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          regNum: student.regNum,
          avatarUrl: student.avatarUrl,
          userId: student.userId,
        },
        sectionId: assignment.sectionId,
        sectionName: assignment.Section?.name || null,
        batchName: assignment.Section?.Batch?.name || null,
        subjectId: assignment.subjectId,
        subjectCode: assignment.Subject?.subjectCode || null,
        subjectName: assignment.Subject?.subjectName || null,
        attendance: student.attendance,
      });
    }
  }
  return rows.sort((a, b) => a.attendance.percentage - b.attendance.percentage);
};

module.exports = {
  AT_RISK_THRESHOLD,
  getAssignedScope,
  resolveRoutinesForScope,
  getRosterWithStats,
  getAtRiskStudents,
};
