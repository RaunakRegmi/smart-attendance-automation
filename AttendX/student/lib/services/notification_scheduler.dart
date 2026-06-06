// lib/services/notification_scheduler.dart
//
// Schedules a local notification 15 minutes before each scheduled class in
// the student's weekly routine. Runs entirely on-device, no FCM/APNs needed —
// notifications fire even when the app is closed (within OS limits).
//
// On web, OS notifications aren't available — instead we surface in-app
// banner overlays via `showInAppBanner()` so the feature can still be demoed.

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import '../theme/app_theme.dart';

class NotificationScheduler {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  /// SharedPreferences key and default for configurable lead time.
  static const String _leadTimeKey = 'notif_lead_time_minutes';
  static const int _defaultLeadMinutes = 15;

  /// Returns the current lead time in minutes (default: 15).
  static Future<int> getLeadMinutes() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_leadTimeKey) ?? _defaultLeadMinutes;
  }

  /// Persists the user's preferred lead time in minutes.
  static Future<void> setLeadMinutes(int minutes) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_leadTimeKey, minutes);
  }

  /// Channel for grouping all class reminders on Android.
  static const String _channelId = 'class_reminders';
  static const String _channelName = 'Class Reminders';
  static const String _channelDesc = 'Notifies you 15 minutes before each class';

  /// SharedPreferences key for the user's enable/disable toggle.
  static const String _enabledKey = 'notif_class_reminders_enabled';

  /// Returns whether class reminders are currently enabled (default: true).
  static Future<bool> isEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_enabledKey) ?? true;
  }

  /// Toggle class reminders on/off. When turning off we also cancel all
  /// previously scheduled reminders so the OS doesn't fire them.
  static Future<void> setEnabled(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_enabledKey, value);
    if (!value) await cancelAll();
  }

  /// Number of class reminders currently queued in the OS notification center.
  /// Returns 0 on web.
  static Future<int> pendingCount() async {
    if (kIsWeb) return 0;
    await init();
    final pending = await _plugin.pendingNotificationRequests();
    return pending.length;
  }

  /// Initialize the plugin and request permissions. Safe to call multiple times.
  static Future<void> init() async {
    if (_initialized || kIsWeb) return;

    tzdata.initializeTimeZones();
    final localName = tz.local.name; // already set after init; just touching it
    debugPrint('Notification timezone: $localName');

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _plugin.initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
    );

    // Android 13+ explicit runtime permission.
    final androidImpl = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await androidImpl?.requestNotificationsPermission();
    await androidImpl?.requestExactAlarmsPermission();

    _initialized = true;
  }

  /// Cancel everything previously scheduled. Used before a full reschedule.
  static Future<void> cancelAll() async {
    if (kIsWeb) return;
    await init();
    await _plugin.cancelAll();
  }

  /// Convenience: pull the latest weekly routine from the backend and reschedule
  /// all reminders. Returns the number of reminders scheduled. Designed to be
  /// called after the settings toggle flips on, or after a routine upload.
  static Future<int> reschedule({required Future<List<dynamic>?> Function() fetcher}) async {
    if (kIsWeb) return 0;
    if (!await isEnabled()) {
      await cancelAll();
      return 0;
    }
    final weekly = await fetcher();
    if (weekly == null) return 0;
    return scheduleFromWeekly(weekly);
  }

  /// Schedule notifications for the entire week's routine.
  /// `weekly` matches the shape from /api/schedule/week:
  ///   [{ day: 'Monday', classes: [{ subjectName, subjectCode, startTime, endTime, room, block, teacher? }] }, ...]
  static Future<int> scheduleFromWeekly(List<dynamic> weekly) async {
    if (kIsWeb) return 0;
    // Respect the user's preference — don't schedule if they've disabled reminders.
    if (!await isEnabled()) return 0;
    await init();
    await _plugin.cancelAll();

    int scheduled = 0;
    final now = tz.TZDateTime.now(tz.local);
    final leadMinutes = await getLeadMinutes();
    final leadTime = Duration(minutes: leadMinutes);

    for (final dayBlock in weekly) {
      if (dayBlock is! Map) continue;
      final day = dayBlock['day'] as String?;
      final classes = (dayBlock['classes'] as List?) ?? const [];
      if (day == null || classes.isEmpty) continue;

      final weekday = _weekdayFromName(day);
      if (weekday == null) continue;

      for (final cls in classes) {
        if (cls is! Map) continue;
        final start = cls['startTime'] as String?;
        if (start == null) continue;

        final notifyAt = _nextOccurrenceMinusLead(weekday, start, now, leadTime: leadTime);
        if (notifyAt == null) continue;

        await _schedule(
          id: _stableId(day, start, cls['subjectCode'] ?? ''),
          when: notifyAt,
          title: _buildTitle(cls),
          body: _buildBody(cls, start),
        );
        scheduled++;
      }
    }
    return scheduled;
  }

  /// Fires one notification ~5 seconds from now. Useful for demoing.
  static Future<void> testNow() async {
    if (kIsWeb) return;
    await init();
    final when = tz.TZDateTime.now(tz.local).add(const Duration(seconds: 3));
    await _schedule(
      id: 999999,
      when: when,
      title: 'AttendX • Test Reminder',
      body: 'Notifications are working! You\'ll get one 15 min before each class.',
    );
  }

  // ── internals ──────────────────────────────────────────────────

  static Future<void> _schedule({
    required int id,
    required tz.TZDateTime when,
    required String title,
    required String body,
  }) async {
    await _plugin.zonedSchedule(
      id,
      title,
      body,
      when,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: _channelDesc,
          importance: Importance.high,
          priority: Priority.high,
          ticker: 'Class reminder',
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentSound: true,
          presentBadge: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  static String _buildTitle(Map cls) {
    final code = (cls['subjectCode'] as String?)?.trim() ?? '';
    final name = (cls['subjectName'] as String?)?.trim() ?? code;
    if (name.isEmpty && code.isEmpty) return 'Upcoming class';
    return '${name.isNotEmpty ? name : code}${code.isNotEmpty && name != code ? ' ($code)' : ''}';
  }

  static String _buildBody(Map cls, String startTime) {
    final room = (cls['room'] as String?)?.trim();
    final block = (cls['block'] as String?)?.trim();
    final teacher = (cls['teacher'] as String?)?.trim();
    final parts = <String>['Starts at $startTime'];
    if (room != null && room.isNotEmpty) parts.add('Room $room');
    if (block != null && block.isNotEmpty) parts.add(block);
    if (teacher != null && teacher.isNotEmpty) parts.add('with $teacher');
    return parts.join(' • ');
  }

  /// Find the next time `weekday` occurs at `HH:MM` and subtract the lead time.
  /// Returns null if the resulting moment is in the past *and* in the past for
  /// this week (we still schedule for next week, so this only returns null when
  /// the time string is malformed).
  static tz.TZDateTime? _nextOccurrenceMinusLead(
      int weekday, String hhmm, tz.TZDateTime now, {Duration leadTime = const Duration(minutes: 15)}) {
    final parts = hhmm.split(':');
    if (parts.length < 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (h == null || m == null) return null;

    // weekday in DateTime: 1 = Monday ... 7 = Sunday
    int daysUntil = (weekday - now.weekday) % 7;
    var candidate = tz.TZDateTime(tz.local, now.year, now.month,
        now.day + daysUntil, h, m).subtract(leadTime);

    // If the candidate (after lead-time subtraction) has already passed, push
    // to the next week so the notification still fires reliably.
    if (!candidate.isAfter(now)) {
      candidate = candidate.add(const Duration(days: 7));
    }
    return candidate;
  }

  static int? _weekdayFromName(String name) {
    switch (name.toLowerCase()) {
      case 'monday':    return DateTime.monday;
      case 'tuesday':   return DateTime.tuesday;
      case 'wednesday': return DateTime.wednesday;
      case 'thursday':  return DateTime.thursday;
      case 'friday':    return DateTime.friday;
      case 'saturday':  return DateTime.saturday;
      case 'sunday':    return DateTime.sunday;
    }
    return null;
  }

  /// Deterministic id so re-scheduling the same class slot replaces the prior
  /// notification instead of stacking duplicates.
  static int _stableId(String day, String hhmm, String code) {
    final s = '$day|$hhmm|$code';
    return s.hashCode & 0x7fffffff;
  }

  /// Shows a beautiful in-app banner that mimics an OS notification.
  /// Works everywhere including web. Use this for demos or for in-app
  /// reminders that should always appear regardless of permission state.
  static void showInAppBanner(BuildContext context, {
    required String title,
    required String body,
  }) {
    final overlay = Overlay.of(context, rootOverlay: true);
    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _ClassReminderBanner(
        title: title,
        body: body,
        onDismiss: () {
          if (entry.mounted) entry.remove();
        },
      ),
    );
    overlay.insert(entry);
  }

  /// Format a class map into title + body lines like the OS notification would.
  static ({String title, String body}) formatClass(Map cls) {
    final time = (cls['startTime'] as String?)?.trim() ?? '';
    final title = _buildTitle(cls);
    final body = _buildBody(cls, time);
    return (title: title, body: body);
  }
}

class _ClassReminderBanner extends StatefulWidget {
  final String title;
  final String body;
  final VoidCallback onDismiss;

  const _ClassReminderBanner({
    required this.title,
    required this.body,
    required this.onDismiss,
  });

  @override
  State<_ClassReminderBanner> createState() => _ClassReminderBannerState();
}

class _ClassReminderBannerState extends State<_ClassReminderBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slide;
  late final Animation<double> _fade;
  Timer? _autoDismiss;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );
    _slide = Tween<Offset>(begin: const Offset(0, -1.5), end: Offset.zero)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _fade = Tween<double>(begin: 0, end: 1)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _controller.forward();
    _autoDismiss = Timer(const Duration(seconds: 6), _close);
  }

  Future<void> _close() async {
    _autoDismiss?.cancel();
    if (!mounted) return;
    await _controller.reverse();
    widget.onDismiss();
  }

  @override
  void dispose() {
    _autoDismiss?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    return Positioned(
      top: mq.padding.top + 8,
      left: 12,
      right: 12,
      child: FadeTransition(
        opacity: _fade,
        child: SlideTransition(
          position: _slide,
          child: Material(
            color: Colors.transparent,
            child: GestureDetector(
              onTap: _close,
              child: Container(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.18),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.school,
                          color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'ATTENDX',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.primary,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'now',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: AppTheme.textSecondary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.body,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                              height: 1.4,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      color: AppTheme.textSecondary,
                      onPressed: _close,
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints:
                          const BoxConstraints(minWidth: 32, minHeight: 32),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
