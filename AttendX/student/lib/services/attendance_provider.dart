import 'package:flutter/foundation.dart';
import 'api_client.dart';

class AttendanceSummary {
  final double percentage;
  final int attended;
  final int total;
  final int absents;
  final int lates;
  final List<SubjectAttData> subjects;
  final int atRisk;

  AttendanceSummary({
    required this.percentage,
    required this.attended,
    required this.total,
    required this.absents,
    required this.lates,
    required this.subjects,
    required this.atRisk,
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> json) {
    final overall = json['overall'] as Map<String, dynamic>;
    final subs = (json['subjects'] as List<dynamic>?)?.map((e) => SubjectAttData.fromJson(e as Map<String, dynamic>)).toList() ?? [];
    return AttendanceSummary(
      percentage: (overall['percentage'] as num?)?.toDouble() ?? 0,
      attended: overall['attended'] as int? ?? 0,
      total: overall['total'] as int? ?? 0,
      absents: overall['absents'] as int? ?? 0,
      lates: overall['lates'] as int? ?? 0,
      subjects: subs,
      atRisk: json['atRisk'] as int? ?? 0,
    );
  }
}

class SubjectAttData {
  final String subject;
  final String code;
  final int total;
  final int attended;
  final int absents;
  final int lates;
  final double percentage;
  final bool isOnTrack;

  SubjectAttData({
    required this.subject,
    required this.code,
    required this.total,
    required this.attended,
    required this.absents,
    required this.lates,
    required this.percentage,
    required this.isOnTrack,
  });

  factory SubjectAttData.fromJson(Map<String, dynamic> json) {
    return SubjectAttData(
      subject: json['subject'] as String? ?? '',
      code: json['code'] as String? ?? '',
      total: json['total'] as int? ?? 0,
      attended: json['attended'] as int? ?? 0,
      absents: json['absents'] as int? ?? 0,
      lates: json['lates'] as int? ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0,
      isOnTrack: json['isOnTrack'] as bool? ?? false,
    );
  }
}

class AttendanceProvider extends ChangeNotifier {
  AttendanceSummary? _summary;
  List<dynamic> _logs = [];
  bool _isLoading = false;
  String? _error;

  AttendanceSummary? get summary => _summary;
  List<dynamic> get logs => _logs;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadSummary() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiClient.get('/api/student/attendance/summary');
      _summary = AttendanceSummary.fromJson(response['data'] as Map<String, dynamic>);
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> loadLogs({int page = 1, int limit = 50}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiClient.get('/api/student/attendance/logs', queryParams: {
        'page': page.toString(),
        'limit': limit.toString(),
      });
      _logs = response['data'] as List<dynamic>? ?? [];
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }
}
