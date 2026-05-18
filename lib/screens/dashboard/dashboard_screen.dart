// 
// lib/screens/dashboard/dashboard_screen.dart
//
// CHANGES:
//  1. StatelessWidget → StatefulWidget to track notification state
//  2. Notification bell shows red badge with unread count
//  3. Tapping bell opens bottom sheet notification panel
//  4. Each notification tappable → marks as read
//  5. "Mark all read" button clears all + badge

import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../theme/app_theme.dart';
import '../../utils/mock_data.dart';
import '../../models/attendance.dart';

// ── Notification data model ───────────────────────────────────
class _Notif {
  final String id, title, body, type;
  final DateTime time;
  bool isRead;
  _Notif({required this.id, required this.title, required this.body,
      required this.type, required this.time, this.isRead = false});
}

List<_Notif> _sampleNotifs() {
  final n = DateTime.now();
  return [
    _Notif(id:'1', title:'Attendance Warning',
        body:'World History (HIS101) attendance dropped to 70%. Attend next 3 classes to avoid being barred from exams.',
        type:'attendance', time: n.subtract(const Duration(minutes: 30))),
    _Notif(id:'2', title:'Class Reminder',
        body:'Maths - Calculus II starts in 15 minutes. Room 402 • Dr. Sarah Wilson.',
        type:'class', time: n.subtract(const Duration(hours: 1))),
    _Notif(id:'3', title:'Attendance Marked',
        body:'Your attendance for Physics Lab has been marked as Present.',
        type:'attendance', time: n.subtract(const Duration(hours: 3)), isRead: true),
    _Notif(id:'4', title:'Class Reminder',
        body:'World History starts in 10 minutes. Room 201 • Dr. Emma Brown.',
        type:'class', time: n.subtract(const Duration(hours: 5)), isRead: true),
    _Notif(id:'5', title:'Exam Eligibility',
        body:'You are eligible for all upcoming exams. Overall attendance: 85%. Keep it up!',
        type:'system', time: n.subtract(const Duration(days: 1)), isRead: true),
    _Notif(id:'6', title:'Attendance Warning',
        body:'Database Systems (CS302) attendance is at 70%. Minimum required is 75%.',
        type:'attendance', time: n.subtract(const Duration(days: 1, hours: 2))),
    _Notif(id:'7', title:'Weekly Summary',
        body:'This week you attended 8 out of 10 classes. Attendance improved by 4% from last week.',
        type:'system', time: n.subtract(const Duration(days: 2)), isRead: true),
  ];
}

// ═════════════════════════════════════════════════════════════
// DASHBOARD SCREEN
// ═════════════════════════════════════════════════════════════
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final List<_Notif> _notifs = _sampleNotifs();
  int get _unread => _notifs.where((n) => !n.isRead).length;

  void _markRead(String id) =>
      setState(() => _notifs.firstWhere((n) => n.id == id).isRead = true);

  void _markAllRead() =>
      setState(() { for (final n in _notifs) n.isRead = true; });

  void _openNotifications() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NotifSheet(
        notifs: _notifs,
        onRead: (id) { _markRead(id); Navigator.pop(context); _openNotifications(); },
        onReadAll: () { _markAllRead(); Navigator.pop(context); },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user    = MockData.currentUser;
    final logs    = MockData.getRecentLogs();
    final routine = MockData.getRoutine();
    final now     = DateTime.now();
    final todayClasses = routine.where((c) => c.day == MockData.days[now.weekday - 1]).toList();
    final nextClass = todayClasses.isNotEmpty ? todayClasses.first : null;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: CustomScrollView(slivers: [

          // ── App Bar ──────────────────────────────────────────
          SliverToBoxAdapter(child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Row(children: [
                Container(width: 36, height: 36,
                  decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.school, color: Colors.white, size: 20)),
                const SizedBox(width: 8),
                const Text('AttendX', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.primary)),
              ]),

              // Bell with badge
              GestureDetector(
                onTap: _openNotifications,
                child: Stack(clipBehavior: Clip.none, children: [
                  Container(width: 40, height: 40,
                    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppTheme.border)),
                    child: const Icon(Icons.notifications_outlined, size: 20, color: AppTheme.textPrimary)),
                  if (_unread > 0)
                    Positioned(top: -4, right: -4,
                      child: Container(width: 18, height: 18,
                        decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                        child: Center(child: Text(_unread > 9 ? '9+' : '$_unread',
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white))))),
                ]),
              ),
            ]),
          )),

          // ── Body ─────────────────────────────────────────────
          SliverToBoxAdapter(child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('GOOD MORNING, ${user.name.split(' ').first.toUpperCase()}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1.0)),
              const SizedBox(height: 2),
              const Text('AttendX', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              const SizedBox(height: 20),

              // Attendance Card
              Container(padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Column(children: [
                  const Text('Personal Attendance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                  const SizedBox(height: 4),
                  const Text('You are above the 75% requirement.', style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                  const SizedBox(height: 12),
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    _StatusChip('ON TRACK', AppTheme.success),
                    const SizedBox(width: 8),
                    _StatusChip('TOP 10%', AppTheme.accent),
                  ]),
                  const SizedBox(height: 20),
                  SizedBox(width: 140, height: 140,
                    child: CustomPaint(
                      painter: _CircularProgressPainter(user.attendancePercentage / 100),
                      child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Text('${user.attendancePercentage.toInt()}%',
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppTheme.primary)),
                        const Text('PRESENT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1)),
                      ])),
                    )),
                ])),
              const SizedBox(height: 16),

              // Routine Alert
              if (nextClass != null)
                Container(padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(16)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      const Icon(Icons.schedule, color: Colors.white70, size: 14),
                      const SizedBox(width: 6),
                      const Text('ROUTINE ALERT', style: TextStyle(fontSize: 11, color: Colors.white70, letterSpacing: 1.0, fontWeight: FontWeight.w600)),
                    ]),
                    const SizedBox(height: 10),
                    Text(nextClass.subject, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text('${nextClass.startTime.format()} • ${nextClass.room}', style: const TextStyle(fontSize: 13, color: Colors.white70)),
                    const SizedBox(height: 16),
                    SizedBox(width: double.infinity,
                      child: ElevatedButton(onPressed: () {},
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppTheme.primary,
                          padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                        child: const Text('Mark Attendance Now', style: TextStyle(fontWeight: FontWeight.w600)))),
                  ])),
              const SizedBox(height: 16),

              // Weekly Overview
              Container(padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Weekly Overview', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                      Text('Activity from Oct 23 - Oct 29', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    ]),
                    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppTheme.success.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                      child: const Text('+4% vs last week', style: TextStyle(fontSize: 11, color: AppTheme.success, fontWeight: FontWeight.w600))),
                  ]),
                  const SizedBox(height: 16),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(MockData.days.length, (i) {
                      final h = [60.0, 45.0, 72.0, 55.0, 80.0, 20.0];
                      return Column(children: [
                        Container(width: 32, height: h[i],
                          decoration: BoxDecoration(
                            color: i == 4 ? AppTheme.primary : AppTheme.primary.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8))),
                        const SizedBox(height: 6),
                        Text(MockData.days[i], style: TextStyle(fontSize: 10,
                          color: i == 4 ? AppTheme.primary : AppTheme.textSecondary,
                          fontWeight: i == 4 ? FontWeight.w700 : FontWeight.w400)),
                      ]);
                    })),
                ])),
              const SizedBox(height: 20),

              // const _AskAICard(),
              const SizedBox(height: 20),

              const Text('RECENT LOGS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1.0)),
              const SizedBox(height: 12),
              ...logs.take(4).map((log) => _LogItem(log)),
              const SizedBox(height: 24),
            ]),
          )),
        ]),
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════
// NOTIFICATION BOTTOM SHEET
// ═════════════════════════════════════════════════════════════
class _NotifSheet extends StatelessWidget {
  final List<_Notif> notifs;
  final void Function(String) onRead;
  final VoidCallback onReadAll;
  const _NotifSheet({required this.notifs, required this.onRead, required this.onReadAll});

  IconData _icon(String t) => t == 'attendance' ? Icons.fact_check_outlined : t == 'class' ? Icons.schedule_outlined : Icons.info_outline;
  Color    _color(String t) => t == 'attendance' ? AppTheme.error : t == 'class' ? AppTheme.primary : AppTheme.accent;

  String _ago(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 60) return '${d.inMinutes}m ago';
    if (d.inHours < 24)   return '${d.inHours}h ago';
    return '${d.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    final unread = notifs.where((n) => !n.isRead).length;
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
      ),
      child: Column(children: [
        const SizedBox(height: 12),
        Container(width: 40, height: 4, decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),

        // Header
        Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Notifications', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              if (unread > 0) Text('$unread unread', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            ]),
            if (unread > 0)
              TextButton(onPressed: onReadAll,
                child: const Text('Mark all read', style: TextStyle(fontSize: 13, color: AppTheme.primary, fontWeight: FontWeight.w600))),
          ])),
        const SizedBox(height: 12),

        // Filter chips (visual)
        Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(children: [
            _Chip('All', true), const SizedBox(width: 8),
            _Chip('Attendance', false), const SizedBox(width: 8),
            _Chip('Classes', false),
          ])),
        const SizedBox(height: 12),
        const Divider(height: 1, color: AppTheme.border),

        // List
        Expanded(child: ListView.separated(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: notifs.length,
          separatorBuilder: (_, __) => const Divider(height: 1, indent: 70, color: AppTheme.border),
          itemBuilder: (_, i) {
            final n = notifs[i];
            return GestureDetector(
              onTap: () => onRead(n.id),
              child: Container(
                color: n.isRead ? Colors.transparent : AppTheme.primary.withOpacity(0.04),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(width: 42, height: 42,
                    decoration: BoxDecoration(color: _color(n.type).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                    child: Icon(_icon(n.type), color: _color(n.type), size: 20)),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(n.title, style: TextStyle(fontSize: 14,
                        fontWeight: n.isRead ? FontWeight.w500 : FontWeight.w700, color: AppTheme.textPrimary))),
                      Text(_ago(n.time), style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                    ]),
                    const SizedBox(height: 4),
                    Text(n.body, style: TextStyle(fontSize: 12, height: 1.5,
                      color: n.isRead ? AppTheme.textSecondary : AppTheme.textPrimary)),
                  ])),
                  if (!n.isRead)
                    Padding(padding: const EdgeInsets.only(left: 8, top: 4),
                      child: Container(width: 8, height: 8,
                        decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle))),
                ]),
              ),
            );
          },
        )),
      ]),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label; final bool active;
  const _Chip(this.label, this.active);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
    decoration: BoxDecoration(
      color: active ? AppTheme.primary : AppTheme.surface,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: active ? AppTheme.primary : AppTheme.border)),
    child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
      color: active ? Colors.white : AppTheme.textSecondary)));
}

// ═════════════════════════════════════════════════════════════
// EXISTING WIDGETS (unchanged)
// ═════════════════════════════════════════════════════════════
class _StatusChip extends StatelessWidget {
  final String label; final Color color;
  const _StatusChip(this.label, this.color);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withOpacity(0.3))),
    child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)));
}

class _LogItem extends StatelessWidget {
  final AttendanceLog log;
  const _LogItem(this.log);
  @override
  Widget build(BuildContext context) {
    Color color; IconData icon; String statusText;
    switch (log.status) {
      case AttendanceStatus.present: color = AppTheme.success; icon = Icons.check;       statusText = 'PRESENT'; break;
      case AttendanceStatus.absent:  color = AppTheme.error;   icon = Icons.close;       statusText = 'ABSENT';  break;
      case AttendanceStatus.late:    color = AppTheme.warning;  icon = Icons.access_time; statusText = 'LATE';    break;
    }
    final isYesterday = DateTime.now().difference(log.dateTime).inDays == 1;
    final timeStr = isYesterday
        ? 'Yesterday, ${log.dateTime.hour}:${log.dateTime.minute.toString().padLeft(2, '0')} ${log.dateTime.hour >= 12 ? "PM" : "AM"}'
        : 'Oct ${log.dateTime.day}, ${log.dateTime.hour}:${log.dateTime.minute.toString().padLeft(2, '0')} ${log.dateTime.hour >= 12 ? "PM" : "AM"}';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 18)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(log.subject, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
          Text(timeStr, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ])),
        Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
          child: Text(statusText, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color))),
      ]));
  }
}

class _CircularProgressPainter extends CustomPainter {
  final double progress;
  _CircularProgressPainter(this.progress);
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;
    canvas.drawCircle(center, radius, Paint()..color = AppTheme.border..strokeWidth = 10..style = PaintingStyle.stroke..strokeCap = StrokeCap.round);
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -math.pi / 2, 2 * math.pi * progress, false,
      Paint()..color = AppTheme.primary..strokeWidth = 10..style = PaintingStyle.stroke..strokeCap = StrokeCap.round);
  }
  @override
  bool shouldRepaint(_CircularProgressPainter old) => old.progress != progress;
}

// class _AskAICard extends StatelessWidget {
//   const _AskAICard();
//   @override
//   Widget build(BuildContext context) => GestureDetector(
//     onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
//       content: Text('Tap "Ask AI" in the bottom bar to open Campus AI'),
//       behavior: SnackBarBehavior.floating, duration: Duration(seconds: 2))),
//     child: Container(
//       padding: const EdgeInsets.all(18),
//       decoration: BoxDecoration(
//         gradient: const LinearGradient(colors: [AppTheme.accent, Color(0xFF0F766E)], begin: Alignment.topLeft, end: Alignment.bottomRight),
//         borderRadius: BorderRadius.circular(16),
//         boxShadow: [BoxShadow(color: AppTheme.accent.withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 6))]),
//       child: Row(children: [
//         Container(width: 48, height: 48,
//           decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(14)),
//           child: const Icon(Icons.auto_awesome, color: Colors.white, size: 26)),
//         const SizedBox(width: 16),
//         const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
//           Text('Ask Campus AI', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
//           SizedBox(height: 3),
//           Text('Am I eligible for exams? Ask now →', style: TextStyle(fontSize: 12, color: Colors.white70)),
//         ])),
//         const Icon(Icons.chevron_right, color: Colors.white70),
//       ])));
// }
