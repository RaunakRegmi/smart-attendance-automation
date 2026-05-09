// lib/screens/dashboard/main_navigation.dart
//
// CHANGE FROM ORIGINAL:
//   Added ChatbotScreen as a 5th tab in the bottom navigation bar.

import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'dashboard_screen.dart';
import '../routine/routine_screen.dart';
import '../attendance/attendance_screen.dart';
import '../chatbot/chatbot_screen.dart'; // ← NEW
import '../profile/profile_screen.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  // 5 screens total — order matches nav bar items below
  final List<Widget> _screens = const [
    DashboardScreen(),
    RoutineScreen(),
    AttendanceScreen(),
    ChatbotScreen(), // ← NEW at index 3
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
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