enum AttendanceStatus {
  present,
  absent,
  late,
}

class AttendanceLog {
  final String id;
  final String subject;
  final DateTime dateTime;
  final AttendanceStatus status;
  final String room;

  const AttendanceLog({
    required this.id,
    required this.subject,
    required this.dateTime,
    required this.status,
    required this.room,
  });
}

class SubjectAttendance {
  final String subject;
  final String code;
  final int totalClasses;
  final int attended;
  final int absents;
  final int lates;

  const SubjectAttendance({
    required this.subject,
    required this.code,
    required this.totalClasses,
    required this.attended,
    required this.absents,
    required this.lates,
  });

  double get percentage => totalClasses > 0 ? attended / totalClasses * 100 : 0;
  bool get isOnTrack => percentage >= 75;
}

class ClassSchedule {
  final String id;
  final String subject;
  final String subjectCode;
  final String teacher;
  final String room;
  final TimeOfDayModel startTime;
  final TimeOfDayModel endTime;
  final String day;
  final String type;

  const ClassSchedule({
    required this.id,
    required this.subject,
    required this.subjectCode,
    required this.teacher,
    required this.room,
    required this.startTime,
    required this.endTime,
    required this.day,
    required this.type,
  });
}

class TimeOfDayModel {
  final int hour;
  final int minute;

  const TimeOfDayModel(this.hour, this.minute);

  String format() {
    final hour12 = hour == 0 || hour == 12 ? 12 : hour % 12;
    final period = hour < 12 ? 'AM' : 'PM';
    final minuteString = minute.toString().padLeft(2, '0');
    return '$hour12:$minuteString $period';
  }
}
