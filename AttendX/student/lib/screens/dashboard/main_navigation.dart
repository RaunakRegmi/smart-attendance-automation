// lib/screens/dashboard/main_navigation.dart
//
// CHANGE FROM ORIGINAL:
//   Added ChatbotScreen as a 5th tab in the bottom navigation bar.

import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../services/api_client.dart';
import '../../services/notification_scheduler.dart';
import 'dashboard_screen.dart';
import '../routine/routine_screen.dart';
import '../attendance/attendance_screen.dart';
import '../attendance/qr_scan_screen.dart';
import '../chatbot/chatbot_screen.dart';
import '../profile/profile_screen.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    // Fetch weekly routine and schedule daily class notifications once logged in.
    WidgetsBinding.instance.addPostFrameCallback((_) => _scheduleClassReminders());
  }

  Widget _buildPage() {
    switch (_currentIndex) {
      case 0: return const DashboardScreen();
      case 1: return const RoutineScreen();
      case 2: return const AttendanceScreen();
      case 3: return const ChatbotScreen();
      case 4: return const ProfileScreen();
      default: return const DashboardScreen();
    }
  }

  Future<void> _scheduleClassReminders() async {
    try {
      final response = await ApiClient.get('/api/schedule/week');
      final weekly = response['data'] as List<dynamic>?;
      if (weekly == null) return;
      final count = await NotificationScheduler.scheduleFromWeekly(weekly);
      debugPrint('AttendX: scheduled $count class reminders');
    } catch (e) {
      debugPrint('AttendX: failed to schedule reminders → $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _buildPage(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const QrScanScreen()),
          );
        },
        backgroundColor: AppTheme.accent,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.qr_code_scanner_rounded, size: 20),
        label: const Text('Scan QR', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppTheme.border, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Dashboard',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calendar_today_outlined),
              activeIcon: Icon(Icons.calendar_today),
              label: 'Routine',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.fact_check_outlined),
              activeIcon: Icon(Icons.fact_check),
              label: 'Attendance',
            ),
            // ── NEW ──────────────────────────────────────────────
            BottomNavigationBarItem(
              icon: Icon(Icons.school_outlined), // matches AttendX logo icon
              activeIcon: Icon(Icons.school),
              label: 'Ask AI',
            ),
            // ────────────────────────────────────────────────────
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}