import 'package:flutter/foundation.dart';
import 'api_client.dart';

class ScheduleProvider extends ChangeNotifier {
  List<dynamic> _todaySchedule = [];
  List<dynamic> _weeklySchedule = [];
  bool _isLoading = false;
  String? _error;

  List<dynamic> get todaySchedule => _todaySchedule;
  List<dynamic> get weeklySchedule => _weeklySchedule;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadTodaySchedule() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiClient.get('/api/schedule/today');
      _todaySchedule = response['data'] as List<dynamic>? ?? [];
    } catch (e) {
      if (e.toString().contains('404')) {
        _todaySchedule = [];
      } else {
        _error = e.toString();
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> loadWeeklySchedule() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiClient.get('/api/schedule/week');
      _weeklySchedule = response['data'] as List<dynamic>? ?? [];
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }
}
