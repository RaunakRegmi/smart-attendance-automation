import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../theme/app_theme.dart';
import '../../utils/mock_data.dart';
import '../../models/attendance.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = MockData.currentUser;
    final logs = MockData.getRecentLogs();
    final routine = MockData.getRoutine();
    final now = DateTime.now();
    final todayClasses = routine.where((c) => c.day == MockData.days[now.weekday - 1]).toList();
    final nextClass = todayClasses.isNotEmpty ? todayClasses.first : null;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // App Bar
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 36, height: 36,
                          decoration: BoxDecoration(
                            color: AppTheme.primary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.school, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 8),
                        const Text('AttendX', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                      ],
                    ),
                    Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Icon(Icons.notifications_outlined, size: 20, color: AppTheme.textPrimary),
                    ),
                  ],
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('GOOD MORNING, ${user.name.split(' ').first.toUpperCase()}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1.0)),
                    const SizedBox(height: 2),
                    const Text('AttendX', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                    const SizedBox(height: 20),

                    // Attendance Card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        children: [
                          const Text('Personal Attendance',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                          const SizedBox(height: 4),
                          const Text('You are above the 75% requirement.',
                              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _StatusChip('ON TRACK', AppTheme.success),
                              const SizedBox(width: 8),
                              _StatusChip('TOP 10%', AppTheme.accent),
                            ],
                          ),
                          const SizedBox(height: 20),
                          SizedBox(
                            width: 140, height: 140,
                            child: CustomPaint(
                              painter: _CircularProgressPainter(user.attendancePercentage / 100),
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text('${user.attendancePercentage.toInt()}%',
                                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppTheme.primary)),
                                    const Text('PRESENT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Routine Alert
                    if (nextClass != null)
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.schedule, color: Colors.white70, size: 14),
                                const SizedBox(width: 6),
                                const Text('ROUTINE ALERT', style: TextStyle(fontSize: 11, color: Colors.white70, letterSpacing: 1.0, fontWeight: FontWeight.w600)),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(nextClass.subject, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                            const SizedBox(height: 4),
                            Text('${nextClass.startTime.format()} • ${nextClass.room}',
                                style: const TextStyle(fontSize: 13, color: Colors.white70)),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () {},
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: AppTheme.primary,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text('Mark Attendance Now', style: TextStyle(fontWeight: FontWeight.w600)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 16),

                    // Weekly Overview
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Weekly Overview', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                                  Text('Activity from Oct 23 - Oct 29', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(color: AppTheme.success.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                                child: const Text('+4% vs last week', style: TextStyle(fontSize: 11, color: AppTheme.success, fontWeight: FontWeight.w600)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: List.generate(MockData.days.length, (i) {
                              final heights = [60.0, 45.0, 72.0, 55.0, 80.0, 20.0];
                              return Column(
                                children: [
                                  Container(
                                    width: 32, height: heights[i],
                                    decoration: BoxDecoration(
                                      color: i == 4 ? AppTheme.primary : AppTheme.primary.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(MockData.days[i], style: TextStyle(fontSize: 10, color: i == 4 ? AppTheme.primary : AppTheme.textSecondary, fontWeight: i == 4 ? FontWeight.w700 : FontWeight.w400)),
                                ],
                              );
                            }),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Recent Logs
                    const Text('RECENT LOGS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 1.0)),
                    const SizedBox(height: 12),
                    ...logs.take(4).map((log) => _LogItem(log)),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  const _StatusChip(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

class _LogItem extends StatelessWidget {
  final AttendanceLog log;
  const _LogItem(this.log);

  @override
  Widget build(BuildContext context) {
    Color color;
    IconData icon;
    String statusText;

    switch (log.status) {
      case AttendanceStatus.present:
        color = AppTheme.success;
        icon = Icons.check;
        statusText = 'PRESENT';
        break;
      case AttendanceStatus.absent:
        color = AppTheme.error;
        icon = Icons.close;
        statusText = 'ABSENT';
        break;
      case AttendanceStatus.late:
        color = AppTheme.warning;
        icon = Icons.access_time;
        statusText = 'LATE';
        break;
    }

    final isYesterday = DateTime.now().difference(log.dateTime).inDays == 1;
    final timeStr = isYesterday
        ? 'Yesterday, ${log.dateTime.hour}:${log.dateTime.minute.toString().padLeft(2, '0')} ${log.dateTime.hour >= 12 ? "PM" : "AM"}'
        : 'Oct ${log.dateTime.day}, ${log.dateTime.hour}:${log.dateTime.minute.toString().padLeft(2, '0')} ${log.dateTime.hour >= 12 ? "PM" : "AM"}';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(log.subject, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                Text(timeStr, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
            child: Text(statusText, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
          ),
        ],
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
    final bgPaint = Paint()
      ..color = AppTheme.border
      ..strokeWidth = 10
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fgPaint = Paint()
      ..color = AppTheme.primary
      ..strokeWidth = 10
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      fgPaint,
    );
  }

  @override
  bool shouldRepaint(_CircularProgressPainter old) => old.progress != progress;
}
