// lib/screens/report/report_screen.dart
//
// Personal academic report for the logged-in student. Pulls data from
// /api/student/attendance/summary and presents it as an overview, risk
// status, and per-subject breakdown.

import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/attendance_provider.dart';
import '../../services/auth_service.dart';
import '../../widgets/skeletons.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  String _name = '';
  String _email = '';
  String _batch = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AttendanceProvider>().loadSummary();
      _loadProfile();
    });
  }

  Future<void> _loadProfile() async {
    final user = await AuthService.getSavedUserData();
    if (!mounted) return;
    if (user == null) return;
    final inner = (user['user'] is Map) ? user['user'] as Map : user;
    setState(() {
      _email = (inner['email'] as String?) ?? '';
      _name = (inner['name'] as String?) ?? _email.split('@').first;
      _batch = (inner['batch'] as String?) ?? '';
    });
  }

  String _statusForPct(double pct) {
    if (pct >= 90) return 'Excellent';
    if (pct >= 75) return 'On Track';
    if (pct >= 60) return 'At Risk';
    return 'Critical';
  }

  Color _statusColor(double pct) {
    if (pct >= 90) return AppTheme.success;
    if (pct >= 75) return AppTheme.primary;
    if (pct >= 60) return AppTheme.warning;
    return AppTheme.error;
  }

  String _riskAdvice(double pct) {
    if (pct >= 90) return 'You are in great standing. Keep it up!';
    if (pct >= 75) return 'You meet the attendance requirement. Stay consistent to stay on track.';
    if (pct >= 60) return 'Your attendance is below the 75% threshold. Attend every class going forward.';
    return 'Urgent: your attendance is critically low. Speak with your academic advisor immediately.';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AttendanceProvider>();
    final summary = provider.summary;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Report'),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadSummary(),
        child: provider.isLoading && summary == null
            ? reportSkeleton()
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _header(summary?.percentage ?? 0),
                    const SizedBox(height: 16),
                    _overviewGrid(summary),
                    const SizedBox(height: 20),
                    _adviceCard(summary?.percentage ?? 0),
                    const SizedBox(height: 20),
                    const Text(
                      'Subject Breakdown',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ..._subjectCards(summary),
                    if (provider.error != null && summary == null) ...[
                      const SizedBox(height: 24),
                      Center(
                        child: Text(
                          'Unable to load report. Pull down to retry.',
                          style: const TextStyle(color: AppTheme.error),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
      ),
    );
  }

  Widget _header(double pct) {
    final color = _statusColor(pct);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withOpacity(0.75)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _name.isEmpty ? 'Student Report' : _name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (_email.isNotEmpty)
                  Text(
                    _email,
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                if (_batch.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      _batch,
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ),
                const SizedBox(height: 14),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _statusForPct(pct),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Overall Attendance',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          SizedBox(
            width: 110,
            height: 110,
            child: CustomPaint(
              painter: _RingPainter(
                progress: (pct / 100).clamp(0.0, 1.0),
                trackColor: Colors.white.withOpacity(0.25),
                progressColor: Colors.white,
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      pct.toStringAsFixed(1),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        height: 1,
                      ),
                    ),
                    const Text(
                      '%',
                      style: TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _overviewGrid(AttendanceSummary? s) {
    final attended = s?.attended ?? 0;
    final total = s?.total ?? 0;
    final absents = s?.absents ?? 0;
    final atRisk = s?.atRisk ?? 0;

    return Row(
      children: [
        Expanded(child: _statCard('Classes Attended', '$attended/$total', AppTheme.success)),
        const SizedBox(width: 10),
        Expanded(child: _statCard('Absences', '$absents', AppTheme.error)),
        const SizedBox(width: 10),
        Expanded(child: _statCard('Subjects at Risk', '$atRisk', AppTheme.warning)),
      ],
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          Text(value,
              style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }

  Widget _adviceCard(double pct) {
    final color = _statusColor(pct);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.lightbulb_outline, color: color, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _riskAdvice(pct),
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textPrimary,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _subjectCards(AttendanceSummary? s) {
    if (s == null || s.subjects.isEmpty) {
      return [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppTheme.border),
          ),
          child: const Text(
            'No subject data yet. Once attendance is synced, your breakdown will appear here.',
            style: TextStyle(color: AppTheme.textSecondary),
          ),
        ),
      ];
    }

    return s.subjects.map((sub) {
      final color = sub.percentage >= 75 ? AppTheme.success : AppTheme.warning;
      final critical = sub.percentage < 60;
      final c = critical ? AppTheme.error : color;
      return Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(sub.subject,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 14)),
                      if (sub.code.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(sub.code,
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.textSecondary)),
                        ),
                    ],
                  ),
                ),
                Text(
                  '${sub.percentage.toStringAsFixed(1)}%',
                  style: TextStyle(
                    color: c,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: (sub.percentage / 100).clamp(0.0, 1.0),
                minHeight: 6,
                backgroundColor: AppTheme.border,
                color: c,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                _miniStat('Attended', sub.attended),
                _miniStat('Absent', sub.absents),
                _miniStat('Late', sub.lates),
                _miniStat('Total', sub.total),
              ],
            ),
          ],
        ),
      );
    }).toList();
  }

  Widget _miniStat(String label, int value) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '$value ',
            style: const TextStyle(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.w700,
                fontSize: 12),
          ),
          TextSpan(
            text: label,
            style: const TextStyle(
                color: AppTheme.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double progress;
  final Color trackColor;
  final Color progressColor;

  _RingPainter({
    required this.progress,
    required this.trackColor,
    required this.progressColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final strokeWidth = 9.0;
    final radius = (math.min(size.width, size.height) - strokeWidth) / 2;
    final center = Offset(size.width / 2, size.height / 2);

    final track = Paint()
      ..color = trackColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, track);

    final fg = Paint()
      ..color = progressColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final sweep = 2 * math.pi * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweep,
      false,
      fg,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) =>
      old.progress != progress ||
      old.trackColor != trackColor ||
      old.progressColor != progressColor;
}
