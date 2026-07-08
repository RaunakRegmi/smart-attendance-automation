class User {
  final String id;
  final String name;
  final String email;
  final String studentId;
  final String department;
  final int attendancePercentage;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.studentId,
    required this.department,
    required this.attendancePercentage,
  });
}
