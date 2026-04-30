import '../models/user.dart';
import '../models/attendance.dart';

class MockData {
  static const User currentUser = User(
    id: '001',
    name: 'Julian Carter',
    email: 'julian@university.edu',
    studentId: 'STU-2024-001',
    department: 'Computer Science',
    semester: '5th Semester',
    attendancePercentage: 85,
  );

  static const List<String> days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  static List<ClassSchedule> getRoutine() {
    return [
      ClassSchedule(
        id: '1', subject: 'Maths - Calculus II', subjectCode: 'MATH201',
        teacher: 'Dr. Sarah Wilson', room: 'Room 402',
        startTime: TimeOfDayModel(10, 0), endTime: TimeOfDayModel(11, 0),
        day: 'MON', type: 'Lecture',
      ),
      ClassSchedule(
        id: '2', subject: 'Physics Lab', subjectCode: 'PHY101L',
        teacher: 'Prof. James Reed', room: 'Lab 102',
        startTime: TimeOfDayModel(11, 30), endTime: TimeOfDayModel(13, 0),
        day: 'MON', type: 'Lab',
      ),
      ClassSchedule(
        id: '3', subject: 'World History', subjectCode: 'HIS101',
        teacher: 'Dr. Emma Brown', room: 'Room 201',
        startTime: TimeOfDayModel(14, 0), endTime: TimeOfDayModel(15, 0),
        day: 'MON', type: 'Lecture',
      ),
      ClassSchedule(
        id: '4', subject: 'Literature', subjectCode: 'ENG202',
        teacher: 'Prof. Mark Davis', room: 'Room 305',
        startTime: TimeOfDayModel(9, 0), endTime: TimeOfDayModel(10, 0),
        day: 'TUE', type: 'Tutorial',
      ),
      ClassSchedule(
        id: '5', subject: 'Algorithms', subjectCode: 'CS301',
        teacher: 'Dr. Lisa Chen', room: 'Room 410',
        startTime: TimeOfDayModel(10, 30), endTime: TimeOfDayModel(12, 0),
        day: 'TUE', type: 'Lecture',
      ),
      ClassSchedule(
        id: '6', subject: 'Database Systems', subjectCode: 'CS302',
        teacher: 'Prof. Tom Harris', room: 'Lab 201',
        startTime: TimeOfDayModel(13, 0), endTime: TimeOfDayModel(14, 30),
        day: 'WED', type: 'Lab',
      ),
      ClassSchedule(
        id: '7', subject: 'Maths - Calculus II', subjectCode: 'MATH201',
        teacher: 'Dr. Sarah Wilson', room: 'Room 402',
        startTime: TimeOfDayModel(10, 0), endTime: TimeOfDayModel(11, 0),
        day: 'THU', type: 'Lecture',
      ),
      ClassSchedule(
        id: '8', subject: 'Software Engineering', subjectCode: 'CS401',
        teacher: 'Dr. Alex Morgan', room: 'Room 501',
        startTime: TimeOfDayModel(15, 0), endTime: TimeOfDayModel(16, 0),
        day: 'FRI', type: 'Lecture',
      ),
    ];
  }

  static List<AttendanceLog> getRecentLogs() {
    final now = DateTime.now();
    return [
      AttendanceLog(id: '1', subject: 'Physics Lab', dateTime: now.subtract(const Duration(days: 1, hours: 3)), status: AttendanceStatus.present, room: 'Lab 102'),
      AttendanceLog(id: '2', subject: 'World History', dateTime: now.subtract(const Duration(days: 1, hours: 2)), status: AttendanceStatus.absent, room: 'Room 201'),
      AttendanceLog(id: '3', subject: 'Literature', dateTime: now.subtract(const Duration(days: 2)), status: AttendanceStatus.late, room: 'Room 305'),
      AttendanceLog(id: '4', subject: 'Maths - Calculus II', dateTime: now.subtract(const Duration(days: 3)), status: AttendanceStatus.present, room: 'Room 402'),
      AttendanceLog(id: '5', subject: 'Algorithms', dateTime: now.subtract(const Duration(days: 4)), status: AttendanceStatus.present, room: 'Room 410'),
      AttendanceLog(id: '6', subject: 'Database Systems', dateTime: now.subtract(const Duration(days: 5)), status: AttendanceStatus.absent, room: 'Lab 201'),
      AttendanceLog(id: '7', subject: 'Software Engineering', dateTime: now.subtract(const Duration(days: 6)), status: AttendanceStatus.present, room: 'Room 501'),
    ];
  }

  static List<SubjectAttendance> getSubjectAttendance() {
    return const [
      SubjectAttendance(subject: 'Maths - Calculus II', code: 'MATH201', totalClasses: 24, attended: 22, absents: 2, lates: 0),
      SubjectAttendance(subject: 'Physics Lab', code: 'PHY101L', totalClasses: 12, attended: 11, absents: 1, lates: 0),
      SubjectAttendance(subject: 'World History', code: 'HIS101', totalClasses: 20, attended: 14, absents: 5, lates: 1),
      SubjectAttendance(subject: 'Literature', code: 'ENG202', totalClasses: 18, attended: 13, absents: 3, lates: 2),
      SubjectAttendance(subject: 'Algorithms', code: 'CS301', totalClasses: 22, attended: 20, absents: 2, lates: 0),
      SubjectAttendance(subject: 'Database Systems', code: 'CS302', totalClasses: 10, attended: 7, absents: 3, lates: 0),
      SubjectAttendance(subject: 'Software Engineering', code: 'CS401', totalClasses: 16, attended: 15, absents: 1, lates: 0),
    ];
  }
}
