import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/attendance_provider.dart';
import '../../services/auth_service.dart';
import '../../widgets/skeletons.dart';

class ReportScreen extends StatefulWidget {
  final bool isWeekly;
  const ReportScreen({super.key, this.isWeekly = false});

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
      final provider = context.read<AttendanceProvider>();
      if (widget.isWeekly) {
        provider.loadWeeklySummary();
      } else {
        provider.loadSummary();
      }
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

  Color _attColor(double pct) {
    if (pct >= 80) return AppTheme.success;
    if (pct >= 60) return AppTheme.warning;
    return AppTheme.error;
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AttendanceProvider>();
    final weekly = provider.weeklySummary;
    final overall = provider.summary;
    final isLoading = provider.isLoading;

    final summary = widget.isWeekly ? weekly : overall;
    final isLoadingAll = isLoading && summary == null;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(widget.isWeekly ? 'Weekly Report' : 'My Report'),
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () => widget.isWeekly ? provider.loadWeeklySummary() : provider.loadSummary(),
        child: isLoadingAll
            ? reportSkeleton()
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (widget.isWeekly && weekly != null)
                      _weeklyBarChart(weekly),
                    _header(summary),
                    const SizedBox(height: 16),
                    _overviewGrid(summary),
                    const SizedBox(height: 20),
                    _adviceCard(summary),
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
                      const Center(
                        child: Text(
                          'Unable to load report. Pull down to retry.',
                          style: TextStyle(color: AppTheme.error),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
      ),
    );
  }

  Widget _weeklyBarChart(dynamic s) {
    final days = (s is WeeklyAttendanceSummary) ? s.days : <String>[];
    final heights = (s is WeeklyAttendanceSummary) ? s.heights : <double>[];

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Daily Attendance %',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(days.length, (i) {
              final h = heights.length > i ? heights[i] : 0.0;
              final color = _attColor(h);
              const maxBarH = 70.0;
              final barH = h == 0 ? 4.0 : 4.0 + (h / 100 * maxBarH);
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(h.toStringAsFixed(0),
                          style: const TextStyle(fontSize: 9, color: AppTheme.textSecondary)),
                      const SizedBox(height: 2),
                      Container(
                        width: 20,
                        height: barH.clamp(4.0, maxBarH),
                        decoration: BoxDecoration(
                          color: color,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(days[i],
                          style: const TextStyle(fontSize: 9, color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  double _pct(dynamic s) {
    if (s == null) return 0;
    if (s is AttendanceSummary) return s.percentage;
    if (s is WeeklyAttendanceSummary) return s.percentage;
    return 0;
  }

  int _attended(dynamic s) {
    if (s == null) return 0;
    if (s is AttendanceSummary) return s.attended;
    if (s is WeeklyAttendanceSummary) return s.attended;
    return 0;
  }

  int _total(dynamic s) {
    if (s == null) return 0;
    if (s is AttendanceSummary) return s.total;
    if (s is WeeklyAttendanceSummary) return s.total;
    return 0;
  }

  int _absents(dynamic s) {
    if (s == null) return 0;
    if (s is AttendanceSummary) return s.absents;
    if (s is WeeklyAttendanceSummary) return s.absents;
    return 0;
  }

  int _atRisk(dynamic s) {
    if (s == null) return 0;
    if (s is AttendanceSummary) return s.atRisk;
    if (s is WeeklyAttendanceSummary) return s.atRisk;
    return 0;
  }

  List<SubjectAttData> _subjects(dynamic s) {
    if (s == null) return [];
    if (s is AttendanceSummary) return s.subjects;
    if (s is WeeklyAttendanceSummary) return s.subjects;
    return [];
  }

  Widget _header(dynamic s) {
    final pct = _pct(s);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primary, AppTheme.primary.withValues(alpha: 0.75)],
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
                  Text(_email, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                if (_batch.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(_batch, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    pct >= 90 ? 'Excellent' : pct >= 80 ? 'On Track' : pct >= 60 ? 'At Risk' : 'Critical',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(height: 8),
                const Text('Overall Attendance',
                    style: TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(width: 16),
          SizedBox(
            width: 110, height: 110,
            child: CustomPaint(
              painter: _RingPainter(
                progress: (pct / 100).clamp(0.0, 1.0),
                trackColor: Colors.white.withValues(alpha: 0.25),
                progressColor: Colors.white,
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(pct.toStringAsFixed(1),
                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, height: 1)),
                    const Text('%', style: TextStyle(color: Colors.white70, fontSize: 11)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _overviewGrid(dynamic s) {
    final attended = _attended(s);
    final total = _total(s);
    final absents = _absents(s);
    final atRisk = _atRisk(s);

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
              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          Text(value,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }

  Widget _adviceCard(dynamic s) {
    final pct = _pct(s);
    final color = _attColor(pct);
    final advice = pct >= 90
        ? 'You are in excellent standing. Keep up the great work!'
        : pct >= 80
            ? 'You meet the attendance requirement. Stay consistent to remain on track.'
            : pct >= 60
                ? 'Your attendance is below 80%. Attend every class going forward to improve.'
                : 'Urgent: your attendance is critically low. Speak with your academic advisor immediately.';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.lightbulb_outline, color: color, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(advice,
                style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.5)),
          ),
        ],
      ),
    );
  }

  List<Widget> _subjectCards(dynamic s) {
    final subs = _subjects(s);
    if (subs.isEmpty) {
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

    return subs.map((sub) {
      final pct = sub.percentage;
      final color = _attColor(pct);
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
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      if (sub.code.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(sub.code,
                              style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                        ),
                    ],
                  ),
                ),
                Text('${pct.toStringAsFixed(1)}%',
                    style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 16)),
              ],
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: (pct / 100).clamp(0.0, 1.0),
                minHeight: 6,
                backgroundColor: AppTheme.border,
                color: color,
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
            style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w700, fontSize: 12),
          ),
          TextSpan(
            text: label,
            style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
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
    const strokeWidth = 9.0;
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
      old.progress != progress || old.trackColor != trackColor || old.progressColor != progressColor;
}
