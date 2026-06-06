import 'package:flutter/foundation.dart';
import 'api_client.dart';

class DashboardData {
  final String name;
  final String email;
  final String studentId;
  final String department;
  final String semester;
  final double overallPercentage;
  final int totalSubjects;
  final int atRiskCount;
  final List<dynamic> subjectWise;
  final List<dynamic> todayClasses;
  final int totalToday;
  final Map<String, dynamic>? nextClass;
  final List<dynamic> recentLogs;
  final int unreadNotifications;
  final List<String> weekDays;
  final List<double> weekHeights;

  DashboardData({
    required this.name,
    required this.email,
    required this.studentId,
    required this.department,
    required this.semester,
    required this.overallPercentage,
    required this.totalSubjects,
    required this.atRiskCount,
    required this.subjectWise,
    required this.todayClasses,
    required this.totalToday,
    required this.nextClass,
    required this.recentLogs,
    required this.unreadNotifications,
    required this.weekDays,
    required this.weekHeights,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final student = json['student'] as Map<String, dynamic>;
    final attendance = json['attendance'] as Map<String, dynamic>;
    final schedule = json['todaySchedule'] as Map<String, dynamic>;
    final notifs = json['notifications'] as Map<String, dynamic>;
    final overview = json['weeklyOverview'] as Map<String, dynamic>;

    return DashboardData(
      name: student['name'] as String? ?? '',
      email: student['email'] as String? ?? '',
      studentId: student['studentId'] as String? ?? '',
      department: student['department'] as String? ?? '',
      semester: student['semester'] as String? ?? '',
      overallPercentage: (attendance['overallPercentage'] as num?)?.toDouble() ?? 0,
      totalSubjects: attendance['totalSubjects'] as int? ?? 0,
      atRiskCount: attendance['atRiskCount'] as int? ?? 0,
      subjectWise: attendance['subjectWise'] as List<dynamic>? ?? [],
      todayClasses: schedule['classes'] as List<dynamic>? ?? [],
      totalToday: schedule['totalToday'] as int? ?? 0,
      nextClass: schedule['nextClass'] as Map<String, dynamic>?,
      recentLogs: json['recentLogs'] as List<dynamic>? ?? [],
      unreadNotifications: notifs['unreadCount'] as int? ?? 0,
      weekDays: (overview['days'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      weekHeights: (overview['heights'] as List<dynamic>?)?.map((e) => (e as num).toDouble()).toList() ?? [],
    );
  }
}

class DashboardProvider extends ChangeNotifier {
  DashboardData? _data;
  bool _isLoading = false;
  String? _error;

  DashboardData? get data => _data;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadDashboard() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiClient.get('/api/student/dashboard');
      _data = DashboardData.fromJson(response['data'] as Map<String, dynamic>);
      _error = null;
    } catch (e) {
      _error = e.toString();
      _data = null;
    }

    _isLoading = false;
    notifyListeners();
  }
}
