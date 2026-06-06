import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/dashboard_provider.dart';
import '../../services/notification_provider.dart';
import '../../services/notification_scheduler.dart';


// ═════════════════════════════════════════════════════════════
// DASHBOARD SCREEN
// ═════════════════════════════════════════════════════════════
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadDashboard();
      context.read<NotificationProvider>().loadNotifications();
    });
  }

  void _openNotifications(BuildContext context) {
    final notifProvider = context.read<NotificationProvider>();
    String selectedCategory = 'All';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final allNotifs = notifProvider.notifications
              .map((n) => _NotifData(
                    id: n.id,
                    title: n.title,
                    body: n.body,
                    type: n.type,
                    time: n.time,
                    isRead: n.isRead,
                  ))
              .toList();
          final filteredNotifs = selectedCategory == 'All'
              ? allNotifs
              : allNotifs.where((n) {
                  final t = n.type.toUpperCase();
                  if (selectedCategory == 'Attendance') return t == 'ATTENDANCE';
                  if (selectedCategory == 'Classes') return t == 'SCHEDULE' || t == 'REMINDER' || t == 'CLASS';
                  return true;
                }).toList();
          return _NotifSheet(
            notifs: filteredNotifs,
            selectedCategory: selectedCategory,
            onCategoryChanged: (cat) => setSheetState(() => selectedCategory = cat),
            onRead: (id) {
              notifProvider.markAsRead(id);
              Navigator.pop(ctx);
              _openNotifications(context);
            },
            onReadAll: () {
              notifProvider.markAllAsRead();
              Navigator.pop(ctx);
            },
          );
        },
      ),
    );
  }

  void _demoClassReminder(BuildContext context) {
    // Pull the next class (if known) and show a styled in-app banner. On
    // mobile, also schedule a real OS notification in 3 s.
    final next = context.read<DashboardProvider>().data?.nextClass;
    String title;
    String body;
    if (next != null) {
      final subject = (next['subject'] as String?) ?? 'Upcoming class';
      final code = (next['subjectCode'] as String?) ?? '';
      final time = (next['startTime'] as String?) ?? '';
      final room = (next['room'] as String?) ?? '';
      final teacher = (next['teacher'] as String?) ?? '';
      title = code.isNotEmpty && subject != code ? '$subject ($code)' : subject;
      final parts = <String>[];
      if (time.isNotEmpty) parts.add('Starts at $time');
      if (room.isNotEmpty) parts.add('Room $room');
      if (teacher.isNotEmpty) parts.add('with $teacher');
      parts.add('Heads-up: starts in 15 min');
      body = parts.join(' • ');
    } else {
      title = 'No upcoming class';
      body = 'Once your routine is uploaded, you\'ll get a heads-up 15 minutes before every class.';
    }
    NotificationScheduler.showInAppBanner(context, title: title, body: body);
    NotificationScheduler.testNow();
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardProvider>();
    final notifProvider = context.watch<NotificationProvider>();
    final unread = notifProvider.unreadCount;

    if (dashboard.isLoading && dashboard.data == null) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (dashboard.error != null && dashboard.data == null) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.cloud_off, size: 64, color: Colors.grey.shade300),
                const SizedBox(height: 16),
                const Text('Could not connect to server',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                const SizedBox(height: 8),
                Text('Pull down to retry', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                const SizedBox(height: 24),
                ElevatedButton(onPressed: () {
                  context.read<DashboardProvider>().loadDashboard();
                  context.read<NotificationProvider>().loadNotifications();
                }, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      );
    }

    final data = dashboard.data!;
    final now = DateTime.now();
    final firstName = data.name.split(' ').first;
    final greeting = _getGreeting();

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await context.read<DashboardProvider>().loadDashboard();
            await context.read<NotificationProvider>().loadNotifications();
          },
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

                // Bell with badge (long-press to demo a class reminder)
                GestureDetector(
                  onTap: () => _openNotifications(context),
                  onLongPress: () {
                    _demoClassReminder(context);
                  },
                  child: Stack(clipBehavior: Clip.none, children: [
                    Container(width: 40, height: 40,
                      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppTheme.border)),
                      child: const Icon(Icons.notifications_outlined, size: 20, color: AppTheme.textPrimary)),
                    if (unread > 0)
                      Positioned(top: -4, right: -4,
                        child: Container(width: 18, height: 18,
                          decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                          child: Center(child: Text(unread > 9 ? '9+' : '$unread',
                            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white))))),
                  ]),
                ),
              ]),
            )),

            // ── Body ─────────────────────────────────────────────
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('$greeting, ${firstName.toUpperCase()}',
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
                    Text(data.overallPercentage >= 80
                        ? 'You are above the 80% requirement.'
                        : 'Your attendance needs improvement.',
                        style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                    const SizedBox(height: 12),
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      _StatusChip(
                        data.overallPercentage >= 90
                          ? 'EXCELLENT'
                          : data.overallPercentage >= 80
                              ? 'ON TRACK'
                              : data.overallPercentage >= 60 ? 'AT RISK' : 'CRITICAL',
                        data.overallPercentage >= 90
                          ? AppTheme.success
                          : data.overallPercentage >= 80
                              ? AppTheme.primary
                              : data.overallPercentage >= 60 ? AppTheme.warning : AppTheme.error,
                      ),
                      const SizedBox(width: 8),
                      _StatusChip('${data.totalSubjects} SUBJECTS', AppTheme.accent),
                    ]),
                    const SizedBox(height: 20),
                    SizedBox(width: 140, height: 140,
                      child: CustomPaint(
                        painter: _CircularProgressPainter(data.overallPercentage / 100),
                        child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Text('${data.overallPercentage.toInt()}%',
                            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppTheme.primary)),
                          const Text('PRESENT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1)),
                        ])),
                      )),
                  ])),
                const SizedBox(height: 16),

                // Routine Alert
                if (data.nextClass != null)
                  Container(padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(16)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        const Icon(Icons.schedule, color: Colors.white70, size: 14),
                        const SizedBox(width: 6),
                        const Text('ROUTINE ALERT', style: TextStyle(fontSize: 11, color: Colors.white70, letterSpacing: 1.0, fontWeight: FontWeight.w600)),
                      ]),
                      const SizedBox(height: 10),
                      Text(data.nextClass!['subject'] as String? ?? 'Class',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text(
                        '${data.nextClass!['startTime'] as String? ?? ''}'
                        '${(data.nextClass!['room'] as String?)?.isNotEmpty == true ? ' • ${data.nextClass!['room']}' : ''}'
                        '${(data.nextClass!['teacher'] as String?)?.isNotEmpty == true ? ' • ${data.nextClass!['teacher']}' : ''}',
                        style: const TextStyle(fontSize: 13, color: Colors.white70),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                              content: Text('You\'ll get a notification 15 minutes before this class.'),
                              duration: Duration(seconds: 2),
                            ));
                          },
                          icon: const Icon(Icons.notifications_active_outlined, size: 16),
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                          label: const Text('Reminder set', style: TextStyle(fontWeight: FontWeight.w600)))),
                    ])),
                const SizedBox(height: 16),

                // Weekly Overview
                Container(padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('Weekly Attendance', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                        Text('Daily attendance % (Sun – Fri)',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                      ]),
                      Builder(builder: (_) {
                        final avg = data.weekHeights.isEmpty
                            ? 0.0
                            : data.weekHeights.reduce((a, b) => a + b) / data.weekHeights.length;
                        final color = avg >= 80 ? AppTheme.success : avg >= 60 ? AppTheme.warning : AppTheme.error;
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                          child: Text('Avg ${avg.toStringAsFixed(0)}%',
                              style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
                        );
                      }),
                    ]),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 120,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: List.generate(data.weekDays.length, (i) {
                          // Heights are 0-100 (attendance %); scale to 6-80dp.
                          final pct = data.weekHeights.length > i ? data.weekHeights[i] : 0.0;
                          final h = pct == 0 ? 6.0 : 6.0 + (pct * 0.74);
                          final tier = pct >= 80 ? AppTheme.primary : pct >= 60 ? AppTheme.warning : pct > 0 ? AppTheme.error : AppTheme.border;
                          return Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (pct > 0)
                                Text('${pct.toStringAsFixed(0)}', style: const TextStyle(fontSize: 9, color: AppTheme.textSecondary)),
                              const SizedBox(height: 4),
                              Container(
                                width: 28,
                                height: h,
                                decoration: BoxDecoration(
                                  color: i == now.weekday - 1 && pct > 0 ? AppTheme.primary : tier,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(data.weekDays[i],
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: i == now.weekday - 1 ? AppTheme.primary : AppTheme.textSecondary,
                                      fontWeight: i == now.weekday - 1 ? FontWeight.w700 : FontWeight.w400)),
                            ],
                          );
                        }),
                      ),
                    ),
                  ])),
                const SizedBox(height: 20),

                const SizedBox(height: 20),

                const Text('RECENT LOGS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1.0)),
                const SizedBox(height: 12),
                ...data.recentLogs.take(4).map((log) => _LogItem.fromJson(log)),
                const SizedBox(height: 24),
              ]),
            )),
          ]),
        ),
      ),
    );
  }
}

class _NotifData {
  final String id, title, body, type;
  final DateTime time;
  bool isRead;
  _NotifData({required this.id, required this.title, required this.body,
      required this.type, required this.time, this.isRead = false});
}

// ═════════════════════════════════════════════════════════════
// NOTIFICATION BOTTOM SHEET
// ═════════════════════════════════════════════════════════════
class _NotifSheet extends StatelessWidget {
  final List<_NotifData> notifs;
  final void Function(String) onRead;
  final VoidCallback onReadAll;
  final String selectedCategory;
  final void Function(String) onCategoryChanged;
  const _NotifSheet({
    required this.notifs,
    required this.onRead,
    required this.onReadAll,
    required this.selectedCategory,
    required this.onCategoryChanged,
  });

  IconData _icon(String t) {
    final s = t.toLowerCase();
    if (s == 'attendance') return Icons.fact_check_outlined;
    if (s == 'schedule' || s == 'class' || s == 'reminder') return Icons.schedule_outlined;
    return Icons.info_outline;
  }
  Color _color(String t) {
    final s = t.toLowerCase();
    if (s == 'attendance') return AppTheme.error;
    if (s == 'schedule' || s == 'class') return AppTheme.primary;
    if (s == 'reminder') return AppTheme.accent;
    return AppTheme.textSecondary;
  }

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

        // Filter chips
        Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(children: [
            _FilterChip('All', selectedCategory == 'All', () => onCategoryChanged('All')),
            const SizedBox(width: 8),
            _FilterChip('Attendance', selectedCategory == 'Attendance', () => onCategoryChanged('Attendance')),
            const SizedBox(width: 8),
            _FilterChip('Classes', selectedCategory == 'Classes', () => onCategoryChanged('Classes')),
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

class _FilterChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _FilterChip(this.label, this.active, this.onTap);
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: active ? AppTheme.primary : AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: active ? AppTheme.primary : AppTheme.border)),
      child: Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
        color: active ? Colors.white : AppTheme.textSecondary))));
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

String _monthAbbr(int m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];

class _LogItem extends StatelessWidget {
  final String subject;
  final String status;
  final String date;
  final String? time;
  final String? room;

  const _LogItem({
    required this.subject,
    required this.status,
    required this.date,
    this.time,
    this.room,
  });

  factory _LogItem.fromJson(Map<String, dynamic> json) {
    return _LogItem(
      subject: json['subject'] as String? ?? '',
      status: json['status'] as String? ?? 'Absent',
      date: json['date'] as String? ?? '',
      time: json['time'] as String?,
      room: json['room'] as String?,
    );
  }

  @override
  Widget build(BuildContext context) {
    Color color; IconData icon; String statusText;
    final upperStatus = status.toUpperCase();
    if (upperStatus == 'PRESENT') { color = AppTheme.success; icon = Icons.check;       statusText = 'PRESENT'; }
    else if (upperStatus == 'LATE') { color = AppTheme.warning;  icon = Icons.access_time; statusText = 'LATE';    }
    else { color = AppTheme.error;   icon = Icons.close;       statusText = 'ABSENT';  }

    final dt = DateTime.tryParse(date);
    final isYesterday = dt != null && DateTime.now().difference(dt).inDays == 1;
    final timeStr = dt != null
        ? (isYesterday
            ? 'Yesterday, ${dt.hour > 12 ? dt.hour - 12 : dt.hour}:${dt.minute.toString().padLeft(2, '0')} ${dt.hour >= 12 ? "PM" : "AM"}'
            : '${_monthAbbr(dt.month)} ${dt.day}, ${dt.hour > 12 ? dt.hour - 12 : dt.hour}:${dt.minute.toString().padLeft(2, '0')} ${dt.hour >= 12 ? "PM" : "AM"}')
        : date;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color, size: 18)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(subject, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
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
