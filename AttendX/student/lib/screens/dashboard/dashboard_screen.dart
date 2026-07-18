import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'dart:ui' as ui;
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/dashboard_provider.dart';
import '../../services/schedule_provider.dart';
import '../../services/notification_provider.dart';
import '../../services/messages_provider.dart';
import '../../services/notification_scheduler.dart';
import '../../services/api_client.dart';
import '../report/report_screen.dart';
import '../messages/inbox_screen.dart';
import '../../widgets/skeletons.dart';

double _rs(BuildContext c, double v) {
  final width = MediaQuery.of(c).size.shortestSide;
  return v * (width / 375).clamp(0.75, 1.3);
}
double _rf(double base, double scale) => base * scale.clamp(0.75, 1.3);


// ═════════════════════════════════════════════════════════════
// DASHBOARD SCREEN
// ═════════════════════════════════════════════════════════════
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String? _avatarUrl;
  int _beforeMinutes = 15;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<DashboardProvider>().loadDashboard();
      context.read<NotificationProvider>().loadNotifications();
      context.read<MessagesProvider>().loadThreads();
      _loadAvatar();
      _loadAlertConfig();
    });
  }

  Future<void> _loadAlertConfig() async {
    final before = await NotificationScheduler.getLeadMinutes();
    if (mounted) setState(() { _beforeMinutes = before; });
    // Ensure the weekly schedule is loaded for the Day-at-a-Glance card
    final scheduleProv = context.read<ScheduleProvider>();
    if (scheduleProv.weeklySchedule.isEmpty) {
      scheduleProv.loadWeeklySchedule();
    }
  }

  List<dynamic> _routineClassesFrom(List<dynamic> weekly) {
    if (weekly.isEmpty) return [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    final todayName = dayNames[DateTime.now().weekday % 7];
    for (final dayBlock in weekly) {
      if (dayBlock is Map && dayBlock['day'] == todayName) {
        final classes = (dayBlock['classes'] as List<dynamic>?) ?? [];
        return classes.map((c) {
          final m = Map<String, dynamic>.from(c as Map);
          if (m.containsKey('subjectName') && !m.containsKey('subject')) m['subject'] = m['subjectName'];
          if (m.containsKey('block') && !m.containsKey('type')) m['type'] = m['block'];
          return m;
        }).toList();
      }
    }
    return [];
  }

  Map<String, dynamic>? _routineTomorrowFrom(List<dynamic> weekly) {
    if (weekly.isEmpty) return null;
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    final tomorrowName = dayNames[tomorrow.weekday % 7];
    for (final dayBlock in weekly) {
      if (dayBlock is Map && dayBlock['day'] == tomorrowName) {
        final classes = (dayBlock['classes'] as List<dynamic>?) ?? [];
        if (classes.isNotEmpty) {
          final first = Map<String, dynamic>.from(classes.first as Map);
          if (first.containsKey('subjectName') && !first.containsKey('subject')) first['subject'] = first['subjectName'];
          first['dayName'] = tomorrowName;
          return first;
        }
      }
    }
    return null;
  }

  Future<void> _loadAvatar() async {
    final data = context.read<DashboardProvider>().data;
    if (data?.avatarUrl != null) {
      final full = await ApiClient.getFullImageUrl(data!.avatarUrl);
      if (mounted && full.isNotEmpty) setState(() => _avatarUrl = full);
    }
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

  String _getInitials(String fullName) {
    if (fullName.isEmpty) return '?';
    return fullName.split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase();
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
    final unreadMessages = context.watch<MessagesProvider>().unreadCount;

    if (dashboard.isLoading && dashboard.data == null) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: SafeArea(child: dashboardSkeleton()),
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
                Icon(Icons.cloud_off, size: _rs(context,64), color: Colors.grey.shade300),
                SizedBox(height: _rs(context,16)),
                Text('Could not connect to server',
                    style: TextStyle(fontSize: _rs(context,16), fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                SizedBox(height: _rs(context,8)),
                Text('Pull down to retry', style: TextStyle(fontSize: _rs(context,13), color: Colors.grey.shade500)),
                SizedBox(height: _rs(context,24)),
                ElevatedButton(onPressed: () {
                  context.read<DashboardProvider>().loadDashboard();
                  context.read<NotificationProvider>().loadNotifications();
                }, child: Text('Retry', style: TextStyle(fontSize: _rs(context,14)))),
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

    // Derive today's classes from the client-side routine schedule
    final scheduleProv = context.watch<ScheduleProvider>();
    final weeklySchedule = scheduleProv.weeklySchedule;
    final routineClasses = _routineClassesFrom(weeklySchedule);
    final todayClasses = routineClasses.isNotEmpty ? routineClasses : data.todayClasses;
    final tomorrowPrev = _routineTomorrowFrom(weeklySchedule) ?? data.tomorrowPreview;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await context.read<DashboardProvider>().loadDashboard();
            await context.read<NotificationProvider>().loadNotifications();
            await context.read<ScheduleProvider>().loadWeeklySchedule();
            await _loadAvatar();
          },
          child: CustomScrollView(slivers: [

              // ── App Bar ──────────────────────────────────────────
            SliverToBoxAdapter(child: Padding(
              padding: EdgeInsets.fromLTRB(_rs(context,20), _rs(context,10), _rs(context,20), 0),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Row(children: [
                  _avatarUrl != null
                      ? CircleAvatar(radius: _rs(context,18), backgroundImage: NetworkImage(_avatarUrl!))
                      : Container(width: _rs(context,36), height: _rs(context,36),
                          decoration: BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle),
                          child: Center(child: Text(_getInitials(data.name),
                              style: TextStyle(fontSize: _rs(context,14), fontWeight: FontWeight.w700, color: Colors.white)))),
                  SizedBox(width: _rs(context,8)),
                  Text('AttendX', style: TextStyle(fontSize: _rs(context,18), fontWeight: FontWeight.w700, color: AppTheme.primary)),
                ]),

                Row(mainAxisSize: MainAxisSize.min, children: [
                // Messages inbox with unread badge
                GestureDetector(
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const InboxScreen()));
                  },
                  child: Stack(clipBehavior: Clip.none, children: [
                    Container(width: _rs(context,40), height: _rs(context,40),
                      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(_rs(context,10)), border: Border.all(color: AppTheme.border)),
                      child: Icon(Icons.chat_bubble_outline, size: _rs(context,18), color: AppTheme.textPrimary)),
                    if (unreadMessages > 0)
                      Positioned(top: _rs(context,-4), right: _rs(context,-4),
                        child: Container(width: _rs(context,18), height: _rs(context,18),
                          decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                          child: Center(child: Text(unreadMessages > 9 ? '9+' : '$unreadMessages',
                            style: TextStyle(fontSize: _rs(context,9), fontWeight: FontWeight.w700, color: Colors.white))))),
                  ]),
                ),
                SizedBox(width: _rs(context,8)),
                // Bell with badge (long-press to demo a class reminder)
                GestureDetector(
                  onTap: () => _openNotifications(context),
                  onLongPress: () {
                    _demoClassReminder(context);
                  },
                  child: Stack(clipBehavior: Clip.none, children: [
                    Container(width: _rs(context,40), height: _rs(context,40),
                      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(_rs(context,10)), border: Border.all(color: AppTheme.border)),
                      child: Icon(Icons.notifications_outlined, size: _rs(context,20), color: AppTheme.textPrimary)),
                    if (unread > 0)
                      Positioned(top: _rs(context,-4), right: _rs(context,-4),
                        child: Container(width: _rs(context,18), height: _rs(context,18),
                          decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                          child: Center(child: Text(unread > 9 ? '9+' : '$unread',
                            style: TextStyle(fontSize: _rs(context,9), fontWeight: FontWeight.w700, color: Colors.white))))),
                  ]),
                ),
                ]),
              ]),
            )),

            // ── Body ─────────────────────────────────────────────
            SliverToBoxAdapter(child: Padding(
              padding: EdgeInsets.fromLTRB(_rs(context,20), _rs(context,6), _rs(context,20), 0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('$greeting, ${firstName.toUpperCase()}',
                    style: TextStyle(fontSize: _rs(context,10), fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1.0)),
                SizedBox(height: _rs(context,1)),
                Text('AttendX', style: TextStyle(fontSize: _rs(context,22), fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                SizedBox(height: _rs(context,10)),

                // Attendance Card
                Container(padding: EdgeInsets.all(_rs(context,12)),
                  decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(_rs(context,14)), border: Border.all(color: AppTheme.border)),
                  child: Column(children: [
                    Text('Personal Attendance', style: TextStyle(fontSize: _rs(context,14), fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                    SizedBox(height: _rs(context,1)),
                    Text(data.overallPercentage >= 80
                        ? 'Above 80% requirement'
                        : 'Needs improvement',
                        style: TextStyle(fontSize: _rs(context,10), color: AppTheme.textSecondary)),
                    SizedBox(height: _rs(context,8)),
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
                      SizedBox(width: _rs(context,6)),
                      _StatusChip('${data.totalSubjects} SUBJECTS', AppTheme.accent),
                    ]),
                    SizedBox(height: _rs(context,10)),
                    SizedBox(width: _rs(context,100), height: _rs(context,100),
                      child: CustomPaint(
                        painter: _CircularProgressPainter(data.overallPercentage / 100),
                        child: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Text('${data.overallPercentage.toInt()}%',
                            style: TextStyle(fontSize: _rs(context,24), fontWeight: FontWeight.w800, color: AppTheme.primary)),
                          Text('PRESENT', style: TextStyle(fontSize: _rs(context,8), fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1)),
                        ])),
                      )),
                  ])),
                SizedBox(height: _rs(context,10)),

                // Day at a Glance
                _DayAtAGlance(
                  classes: todayClasses,
                  tomorrowPreview: tomorrowPrev,
                  beforeMinutes: _beforeMinutes,
                ),
                SizedBox(height: _rs(context,10)),

                // Weekly Overview
                GestureDetector(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ReportScreen(isWeekly: true)),
                  ),
                  child: Container(padding: EdgeInsets.all(_rs(context,14)),
                    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(_rs(context,14)), border: Border.all(color: AppTheme.border)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('Weekly Attendance', style: TextStyle(fontSize: _rs(context,13), fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                          Text('Daily % (Sun – Fri)',
                              style: TextStyle(fontSize: _rs(context,9), color: Colors.grey.shade500)),
                        ]),
                        Builder(builder: (_) {
                          final nonZero = data.weekHeights.where((h) => h > 0).toList();
                          final avg = nonZero.isEmpty
                              ? 0.0
                              : nonZero.reduce((a, b) => a + b) / nonZero.length;
                          final color = avg >= 80 ? AppTheme.success : avg >= 60 ? AppTheme.warning : AppTheme.error;
                          return Container(
                            padding: EdgeInsets.symmetric(horizontal: _rs(context,8), vertical: _rs(context,3)),
                            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(_rs(context,6))),
                            child: Text('Avg ${avg.toStringAsFixed(0)}%',
                                style: TextStyle(fontSize: _rs(context,9), color: color, fontWeight: FontWeight.w600)),
                          );
                        }),
                      ]),
                      SizedBox(height: _rs(context,8)),
                      LayoutBuilder(builder: (context, constraints) {
                        final dayCount = data.weekDays.length;
                        final gap = constraints.maxWidth * 0.015;
                        final maxBarWidth = (constraints.maxWidth - (dayCount - 1) * gap) / dayCount;
                        final barWidth = maxBarWidth.clamp(12.0, 36.0);
                        final pctFont = _rs(context,9);
                        final labelFont = _rs(context,9);
                        final barMaxH = (constraints.maxWidth * 0.22).clamp(40.0, 80.0);
                        return Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: List.generate(dayCount, (i) {
                              final pct = data.weekHeights.length > i ? data.weekHeights[i] : 0.0;
                              final h = pct == 0 ? 4.0 : 4.0 + (pct / 100 * barMaxH);
                              final tier = pct >= 80 ? AppTheme.primary : pct >= 60 ? AppTheme.warning : pct > 0 ? AppTheme.error : AppTheme.border;
                              final int todayIdx = now.weekday % 7;
                              return Column(
                                mainAxisSize: MainAxisSize.min,
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  if (pct > 0)
                                    Text('${pct.toStringAsFixed(0)}',
                                        style: TextStyle(fontSize: pctFont, color: AppTheme.textSecondary)),
                                  SizedBox(height: _rs(context,2)),
                                  Container(
                                    width: barWidth,
                                    height: h.clamp(4.0, barMaxH),
                                    decoration: BoxDecoration(
                                      color: i == todayIdx && pct > 0 ? AppTheme.primary : tier,
                                      borderRadius: BorderRadius.circular(barWidth * 0.3),
                                    ),
                                  ),
                                  SizedBox(height: _rs(context,4)),
                                  Text(data.weekDays[i],
                                      style: TextStyle(
                                          fontSize: labelFont,
                                          color: i == todayIdx ? AppTheme.primary : AppTheme.textSecondary,
                                          fontWeight: i == todayIdx ? FontWeight.w700 : FontWeight.w400)),
                                ],
                              );
                            }),
                        );
                        }),
                    ])),
                ),
                SizedBox(height: _rs(context,12)),

                Text('RECENT LOGS', style: TextStyle(fontSize: _rs(context,10), fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1.0)),
                SizedBox(height: _rs(context,8)),
                ...data.recentLogs.take(4).map((log) => _LogItem.fromJson(log)),
                SizedBox(height: _rs(context,16)),
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
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
      ),
      child: Column(children: [
        SizedBox(height: _rs(context,12)),
        Container(width: _rs(context,40), height: _rs(context,4), decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(2))),
        SizedBox(height: _rs(context,16)),

        // Header
        Padding(padding: EdgeInsets.symmetric(horizontal: _rs(context,20)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Notifications', style: TextStyle(fontSize: _rs(context,20), fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              if (unread > 0) Text('$unread unread', style: TextStyle(fontSize: _rs(context,12), color: AppTheme.textSecondary)),
            ]),
            if (unread > 0)
              TextButton(onPressed: onReadAll,
                child: Text('Mark all read', style: TextStyle(fontSize: _rs(context,13), color: AppTheme.primary, fontWeight: FontWeight.w600))),
          ])),
        SizedBox(height: _rs(context,12)),

        // Filter chips
        Padding(padding: EdgeInsets.symmetric(horizontal: _rs(context,20)),
          child: Row(children: [
            _FilterChip('All', selectedCategory == 'All', () => onCategoryChanged('All')),
            SizedBox(width: _rs(context,8)),
            _FilterChip('Attendance', selectedCategory == 'Attendance', () => onCategoryChanged('Attendance')),
            SizedBox(width: _rs(context,8)),
            _FilterChip('Classes', selectedCategory == 'Classes', () => onCategoryChanged('Classes')),
          ])),
        SizedBox(height: _rs(context,12)),
        Divider(height: 1, color: AppTheme.border),

        // List
        Expanded(child: ListView.separated(
          padding: EdgeInsets.symmetric(vertical: _rs(context,8)),
          itemCount: notifs.length,
          separatorBuilder: (_, __) => Divider(height: 1, indent: _rs(context,70), color: AppTheme.border),
          itemBuilder: (_, i) {
            final n = notifs[i];
            return GestureDetector(
              onTap: () => onRead(n.id),
              child: Container(
                color: n.isRead ? Colors.transparent : AppTheme.primary.withOpacity(0.04),
                padding: EdgeInsets.symmetric(horizontal: _rs(context,20), vertical: _rs(context,14)),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(width: _rs(context,42), height: _rs(context,42),
                    decoration: BoxDecoration(color: _color(n.type).withOpacity(0.1), borderRadius: BorderRadius.circular(_rs(context,12))),
                    child: Icon(_icon(n.type), color: _color(n.type), size: _rs(context,20))),
                  SizedBox(width: _rs(context,14)),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(n.title, style: TextStyle(fontSize: _rs(context,14),
                        fontWeight: n.isRead ? FontWeight.w500 : FontWeight.w700, color: AppTheme.textPrimary))),
                      Text(_ago(n.time), style: TextStyle(fontSize: _rs(context,11), color: AppTheme.textSecondary)),
                    ]),
                    SizedBox(height: _rs(context,4)),
                    Text(n.body, style: TextStyle(fontSize: _rs(context,12), height: 1.5,
                      color: n.isRead ? AppTheme.textSecondary : AppTheme.textPrimary)),
                  ])),
                  if (!n.isRead)
                    Padding(padding: EdgeInsets.only(left: _rs(context,8), top: _rs(context,4)),
                      child: Container(width: _rs(context,8), height: _rs(context,8),
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
      padding: EdgeInsets.symmetric(horizontal: _rs(context,14), vertical: _rs(context,6)),
      decoration: BoxDecoration(
        color: active ? AppTheme.primary : AppTheme.surface,
        borderRadius: BorderRadius.circular(_rs(context,20)),
        border: Border.all(color: active ? AppTheme.primary : AppTheme.border)),
      child: Text(label, style: TextStyle(fontSize: _rs(context,12), fontWeight: FontWeight.w600,
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
    padding: EdgeInsets.symmetric(horizontal: _rs(context,8), vertical: _rs(context,3)),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(_rs(context,20)), border: Border.all(color: color.withOpacity(0.3))),
    child: Text(label, style: TextStyle(fontSize: _rs(context,10), fontWeight: FontWeight.w700, color: color)));
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
      margin: EdgeInsets.only(bottom: _rs(context,8)),
      padding: EdgeInsets.all(_rs(context,12)),
      decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(_rs(context,12)), border: Border.all(color: AppTheme.border)),
      child: Row(children: [
        Container(width: _rs(context,30), height: _rs(context,30), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(_rs(context,8))), child: Icon(icon, color: color, size: _rs(context,16))),
        SizedBox(width: _rs(context,10)),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(subject, style: TextStyle(fontSize: _rs(context,13), fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
          Text(timeStr, style: TextStyle(fontSize: _rs(context,11), color: AppTheme.textSecondary)),
        ])),
        Container(padding: EdgeInsets.symmetric(horizontal: _rs(context,6), vertical: _rs(context,2)),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(_rs(context,6))),
          child: Text(statusText, style: TextStyle(fontSize: _rs(context,10), fontWeight: FontWeight.w700, color: color))),
      ]));
  }
}

class _DayAtAGlance extends StatelessWidget {
  final List<dynamic> classes;
  final Map<String, dynamic>? tomorrowPreview;
  final int beforeMinutes;
  const _DayAtAGlance({
    required this.classes,
    this.tomorrowPreview,
    this.beforeMinutes = 15,
  });

  String _timeStr(String? t) {
    if (t == null || t.length < 5) return '';
    return t.length >= 5 ? t.substring(0, 5) : t;
  }

  DateTime _parseTime(String? timeStr) {
    if (timeStr == null) return DateTime.now();
    final parts = timeStr.split(':');
    final h = int.tryParse(parts[0]) ?? 0;
    final m = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day, h, m);
  }

  List<Map<String, dynamic>> _filteredClasses({bool allFilter = false, bool done = false, bool left = false}) {
    final now = DateTime.now();
    return classes.where((c) {
      if (allFilter) return true;
      final end = _parseTime(c['endTime'] as String?);
      final isPast = now.isAfter(end);
      return done ? isPast : left ? !isPast : true;
    }).map((c) => c as Map<String, dynamic>).toList();
  }

  void _showClassDialog(BuildContext context, List<Map<String, dynamic>> items, String title, String badge) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Stack(children: [
        BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: 4, sigmaY: 4),
          child: Container(color: Colors.black.withOpacity(0.3)),
        ),
        Center(child: _ClassListSheet(
          title: title, badge: badge, classes: items,
          timeStr: _timeStr, onClose: () => Navigator.of(ctx).pop(),
        )),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (classes.isEmpty) return const SizedBox.shrink();

    final now = DateTime.now();
    final window = Duration(minutes: beforeMinutes);

    Map<String, dynamic>? activeClass;
    Map<String, dynamic>? upcomingClass;
    bool isLive = false;
    int? activeIdx;
    int? upcomingIdx;

    for (int i = 0; i < classes.length; i++) {
      final cls = classes[i] as Map<String, dynamic>;
      final start = _parseTime(cls['startTime'] as String?);
      final end = _parseTime(cls['endTime'] as String?);
      final windowStart = start.subtract(window);

      if (now.isAfter(windowStart) && now.isBefore(end)) {
        activeClass = cls;
        isLive = now.isAfter(start) || now.isAtSameMomentAs(start);
        activeIdx = i;
        break;
      }

      if (upcomingClass == null && now.isBefore(windowStart)) {
        upcomingClass = cls;
        upcomingIdx = i;
      }
    }

    if (activeClass == null && upcomingClass == null) {
      // ALL DONE
      final todayCompleted = classes.where((c) {
        final end = _parseTime(c['endTime'] as String?);
        return now.isAfter(end);
      }).length;

      return Container(
        padding: EdgeInsets.all(_rs(context,16)),
        decoration: BoxDecoration(
          color: AppTheme.primary,
          borderRadius: BorderRadius.circular(_rs(context,16)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.check_circle_outline, color: Colors.white70, size: _rs(context,12)),
            SizedBox(width: _rs(context,5)),
            Text('ALL DONE',
                style: TextStyle(fontSize: _rs(context,10), color: Colors.white70, letterSpacing: 1.0, fontWeight: FontWeight.w600)),
            const Spacer(),
            Text('$todayCompleted/${classes.length} completed',
                style: TextStyle(fontSize: _rs(context,10), color: Colors.white70)),
          ]),
          SizedBox(height: _rs(context,10)),

          Row(children: [
            Container(
              width: _rs(context,32), height: _rs(context,32),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(_rs(context,10))),
              child: Icon(Icons.check_circle, color: Colors.white, size: _rs(context,18)),
            ),
            SizedBox(width: _rs(context,12)),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Great work today!',
                  style: TextStyle(fontSize: _rs(context,14), fontWeight: FontWeight.w700, color: Colors.white)),
              Text('$todayCompleted of ${classes.length} classes completed',
                  style: TextStyle(fontSize: _rs(context,11), color: Colors.white70)),
            ])),
          ]),
          SizedBox(height: _rs(context,10)),
          Container(
            padding: EdgeInsets.all(_rs(context,10)),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: BorderRadius.circular(_rs(context,12))),
            child: Row(children: [
              _MiniStat(
                label: 'TOTAL', value: '${classes.length}', icon: Icons.calendar_today,
                onTap: () => _showClassDialog(context, _filteredClasses(allFilter: true), 'All Classes', 'TOTAL'),
              ),
              Container(width: 1, height: _rs(context,24), color: Colors.white12, margin: EdgeInsets.symmetric(horizontal: _rs(context,12))),
              _MiniStat(
                label: 'DONE', value: '$todayCompleted', icon: Icons.check_circle_outline,
                onTap: () => _showClassDialog(context, _filteredClasses(done: true), 'Completed Classes', 'DONE'),
              ),
              Container(width: 1, height: _rs(context,24), color: Colors.white12, margin: EdgeInsets.symmetric(horizontal: _rs(context,12))),
              _MiniStat(
                label: 'LEFT', value: '${classes.length - todayCompleted}', icon: Icons.pending_outlined,
                onTap: () => _showClassDialog(context, _filteredClasses(left: true), 'Remaining Classes', 'LEFT'),
              ),
            ]),
          ),

          if (tomorrowPreview != null) ...[
            SizedBox(height: _rs(context,10)),
            Container(height: 1, color: Colors.white12),
            SizedBox(height: _rs(context,10)),
            Row(children: [
              Icon(Icons.light_mode_outlined, color: Colors.white.withOpacity(0.6), size: _rs(context,12)),
              SizedBox(width: _rs(context,5)),
              Text('TOMORROW — ${(tomorrowPreview!['dayName'] as String?)?.toUpperCase() ?? ''}',
                  style: TextStyle(fontSize: _rs(context,9), color: Colors.white60, letterSpacing: 0.8, fontWeight: FontWeight.w600)),
            ]),
            SizedBox(height: _rs(context,8)),
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(tomorrowPreview!['subject'] as String? ?? '',
                    style: TextStyle(fontSize: _rs(context,13), fontWeight: FontWeight.w700, color: Colors.white)),
                SizedBox(height: _rs(context,1)),
                Text(
                  '${_timeStr(tomorrowPreview!['startTime'] as String?)}'
                  '${(tomorrowPreview!['room'] as String?)?.isNotEmpty == true ? '  •  ${tomorrowPreview!['room']}' : ''}'
                  '${(tomorrowPreview!['teacher'] as String?)?.isNotEmpty == true ? '  •  ${tomorrowPreview!['teacher']}' : ''}',
                  style: TextStyle(fontSize: _rs(context,11), color: Colors.white70),
                ),
              ])),
              Container(
                padding: EdgeInsets.symmetric(horizontal: _rs(context,8), vertical: _rs(context,4)),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(_rs(context,8))),
                child: Text('UP NEXT', style: TextStyle(fontSize: _rs(context,8), color: Colors.white70, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
              ),
            ]),
          ],
        ]),
      );
    }

    final hero = activeClass ?? upcomingClass!;
    final isActiveWindow = activeClass != null;
    final heroStart = _parseTime(hero['startTime'] as String?);
    final heroEnd = _parseTime(hero['endTime'] as String?);
    final heroIdx = activeIdx ?? upcomingIdx!;

    return Container(
      padding: EdgeInsets.all(_rs(context,16)),
      decoration: BoxDecoration(
        color: isLive ? AppTheme.accent : AppTheme.primary,
        borderRadius: BorderRadius.circular(_rs(context,16)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(isLive ? Icons.play_circle_outline : Icons.schedule, color: Colors.white70, size: _rs(context,12)),
          SizedBox(width: _rs(context,5)),
          Text(
            isActiveWindow ? (isLive ? 'IN PROGRESS' : 'NEXT UP') : 'UPCOMING',
            style: TextStyle(fontSize: _rs(context,10), color: Colors.white70, letterSpacing: 1.0, fontWeight: FontWeight.w600),
          ),
          const Spacer(),
          Text('${classes.length} class${classes.length > 1 ? 'es' : ''}',
              style: TextStyle(fontSize: _rs(context,10), color: Colors.white70)),
        ]),
        SizedBox(height: _rs(context,10)),

        _HeroLabel(
          icon: isLive ? Icons.play_circle_filled : Icons.schedule,
          label: isLive ? 'LIVE NOW' : 'STARTS IN',
        ),
        SizedBox(height: _rs(context,6)),
        Text(hero['subject'] as String? ?? '',
            style: TextStyle(fontSize: _rs(context,18), fontWeight: FontWeight.w700, color: Colors.white)),
        SizedBox(height: _rs(context,3)),
        Text(
          '${_timeStr(hero['startTime'] as String?)} - ${_timeStr(hero['endTime'] as String?)}'
          '${(hero['room'] as String?)?.isNotEmpty == true ? '  •  ${hero['room']}' : ''}'
          '${(hero['teacher'] as String?)?.isNotEmpty == true ? '  •  ${hero['teacher']}' : ''}',
          style: TextStyle(fontSize: _rs(context,12), color: Colors.white70),
        ),
        SizedBox(height: _rs(context,12)),

        Container(height: 1, color: Colors.white12),
        SizedBox(height: _rs(context,10)),
        ...List.generate(classes.length, (i) {
          final cls = classes[i] as Map<String, dynamic>;
          final end = _parseTime(cls['endTime'] as String?);
          final isPast = now.isAfter(end);
          final isCurrent = i == heroIdx && isActiveWindow;
          final isNext = i == heroIdx && !isActiveWindow;

          Widget leading;
          if (isCurrent) {
            leading = Container(width: _rs(context,24), height: _rs(context,24),
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: Icon(isLive ? Icons.play_arrow : Icons.schedule, size: _rs(context,14), color: isLive ? AppTheme.accent : AppTheme.primary));
          } else if (isPast) {
            leading = Container(width: _rs(context,24), height: _rs(context,24),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
              child: Icon(Icons.check, size: _rs(context,12), color: Colors.white70));
          } else {
            leading = Container(width: _rs(context,24), height: _rs(context,24),
              child: Center(child: Container(width: _rs(context,8), height: _rs(context,8),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.5), shape: BoxShape.circle))));
          }

          return Padding(
            padding: EdgeInsets.only(bottom: _rs(context,6)),
            child: Row(children: [
              leading,
              SizedBox(width: _rs(context,8)),
              SizedBox(
                width: _rs(context,48),
                child: Text(
                  _timeStr(cls['startTime'] as String?),
                  style: TextStyle(
                    fontSize: _rs(context,11),
                    fontWeight: isCurrent || isNext ? FontWeight.w700 : FontWeight.w500,
                    color: Colors.white,
                  ),
                ),
              ),
              SizedBox(width: _rs(context,6)),
              Expanded(
                child: Text(
                  cls['subject'] as String? ?? '',
                  style: TextStyle(
                    fontSize: _rs(context,12),
                    fontWeight: isCurrent || isNext ? FontWeight.w700 : FontWeight.w500,
                    color: isCurrent ? Colors.white : Colors.white70,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if ((cls['room'] as String?)?.isNotEmpty == true)
                Text(cls['room'] as String,
                    style: TextStyle(fontSize: _rs(context,10), color: Colors.white54)),
            ]),
          );
        }),
      ]),
    );
  }
}

class _HeroLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  const _HeroLabel({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: _rs(context,8), vertical: _rs(context,3)),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(_rs(context,6)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: _rs(context,10), color: Colors.white70),
        SizedBox(width: _rs(context,4)),
        Text(label, style: TextStyle(fontSize: _rs(context,9), color: Colors.white70, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
      ]),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final VoidCallback? onTap;
  const _MiniStat({required this.label, required this.value, required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(child: GestureDetector(
      onTap: onTap,
      child: Column(children: [
        Text(value, style: TextStyle(fontSize: _rs(context,16), fontWeight: FontWeight.w800, color: Colors.white)),
        SizedBox(height: _rs(context,1)),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: _rs(context,8), color: Colors.white54),
          SizedBox(width: _rs(context,2)),
          Text(label, style: TextStyle(fontSize: _rs(context,8), color: Colors.white54, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
        ]),
      ]),
    ));
  }
}

class _ClassListSheet extends StatelessWidget {
  final String title, badge;
  final List<Map<String, dynamic>> classes;
  final String Function(String?) timeStr;
  final VoidCallback onClose;

  const _ClassListSheet({
    required this.title, required this.badge,
    required this.classes, required this.timeStr, required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    return Material(
      color: Colors.transparent,
      child: Container(
        margin: EdgeInsets.symmetric(horizontal: _rs(context,32)),
        constraints: BoxConstraints(maxHeight: mq.size.height * 0.55),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(_rs(context,20)),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          // Header
          Container(
            padding: EdgeInsets.fromLTRB(_rs(context,20), _rs(context,16), _rs(context,12), _rs(context,12)),
            child: Row(children: [
              Container(
                padding: EdgeInsets.symmetric(horizontal: _rs(context,8), vertical: _rs(context,3)),
                decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(_rs(context,6))),
                child: Text(badge, style: TextStyle(fontSize: _rs(context,9), fontWeight: FontWeight.w700, color: AppTheme.primary, letterSpacing: 0.5)),
              ),
              SizedBox(width: _rs(context,10)),
              Text(title, style: TextStyle(fontSize: _rs(context,16), fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              const Spacer(),
              IconButton(
                icon: Icon(Icons.close, size: _rs(context,20)), color: AppTheme.textSecondary,
                onPressed: onClose, visualDensity: VisualDensity.compact,
              ),
            ]),
          ),
          Container(height: 1, color: AppTheme.border, margin: EdgeInsets.symmetric(horizontal: _rs(context,20))),
          // List
          if (classes.isEmpty)
            Padding(padding: EdgeInsets.all(_rs(context,32)), child: Text('No classes', style: TextStyle(color: AppTheme.textSecondary)))
          else
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: EdgeInsets.all(_rs(context,16)),
                itemCount: classes.length,
                separatorBuilder: (_, __) => SizedBox(height: _rs(context,8)),
                itemBuilder: (_, i) {
                  final cls = classes[i];
                  final start = cls['startTime'] as String?;
                  final end = cls['endTime'] as String?;
                  final room = cls['room'] as String?;
                  final teacher = cls['teacher'] as String?;
                  return Container(
                    padding: EdgeInsets.all(_rs(context,14)),
                    decoration: BoxDecoration(
                      color: AppTheme.background,
                      borderRadius: BorderRadius.circular(_rs(context,12)),
                    ),
                    child: Row(children: [
                      Container(
                        width: _rs(context,36), height: _rs(context,36),
                        decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(_rs(context,10))),
                        child: Icon(Icons.school_outlined, color: AppTheme.primary, size: _rs(context,18)),
                      ),
                      SizedBox(width: _rs(context,12)),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(cls['subject'] as String? ?? '',
                            style: TextStyle(fontSize: _rs(context,14), fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                        Text(
                          '${timeStr(start)} - ${timeStr(end)}'
                          '${(room)?.isNotEmpty == true ? '  •  $room' : ''}'
                          '${(teacher)?.isNotEmpty == true ? '  •  $teacher' : ''}',
                          style: TextStyle(fontSize: _rs(context,11), color: AppTheme.textSecondary),
                        ),
                      ])),
                    ]),
                  );
                },
              ),
            ),
        ]),
      ),
    );
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
