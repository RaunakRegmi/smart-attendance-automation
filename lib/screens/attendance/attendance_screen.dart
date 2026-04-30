import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/mock_data.dart';
import '../../models/attendance.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final subjectAttendance = MockData.getSubjectAttendance();
    final logs = MockData.getRecentLogs();
    final totalClasses = subjectAttendance.fold<double>(0, (sum, s) => sum + s.totalClasses);
    final overall = totalClasses > 0
        ? subjectAttendance.fold<double>(0, (sum, s) => sum + s.attended) / totalClasses * 100
        : 0;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Attendance', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                  const SizedBox(height: 4),
                  Text('Subject-wise breakdown', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                  const SizedBox(height: 16),

                  // Summary cards row
                  Row(
                    children: [
                      _SummaryCard('Overall', '${overall.toStringAsFixed(1)}%', AppTheme.primary, Icons.pie_chart_outline),
                      const SizedBox(width: 10),
                      _SummaryCard('Subjects', '${subjectAttendance.length}', AppTheme.accent, Icons.book_outlined),
                      const SizedBox(width: 10),
                      _SummaryCard('At Risk', '${subjectAttendance.where((s) => !s.isOnTrack).length}', AppTheme.error, Icons.warning_amber_outlined),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Tab bar
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      labelColor: Colors.white,
                      unselectedLabelColor: AppTheme.textSecondary,
                      labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                      dividerColor: Colors.transparent,
                      padding: const EdgeInsets.all(4),
                      tabs: const [
                        Tab(text: 'By Subject'),
                        Tab(text: 'Logs'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Tab content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Subject view
                  ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: subjectAttendance.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) => _SubjectCard(subjectAttendance[i]),
                  ),

                  // Logs view
                  ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: logs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) => _DetailedLogCard(logs[i]),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label, value;
  final Color color;
  final IconData icon;
  const _SummaryCard(this.label, this.value, this.color, this.icon);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
            Text(label, style: TextStyle(fontSize: 11, color: color.withOpacity(0.8), fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}

class _SubjectCard extends StatelessWidget {
  final SubjectAttendance subject;
  const _SubjectCard(this.subject);

  @override
  Widget build(BuildContext context) {
    final pct = subject.percentage;
    final color = pct >= 75 ? AppTheme.success : AppTheme.error;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(subject.subject,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(subject.code, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('${pct.toStringAsFixed(1)}%',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct / 100,
              backgroundColor: color.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _AttStat('Attended', subject.attended.toString(), AppTheme.success),
              const SizedBox(width: 16),
              _AttStat('Absent', subject.absents.toString(), AppTheme.error),
              const SizedBox(width: 16),
              _AttStat('Late', subject.lates.toString(), AppTheme.warning),
              const Spacer(),
              Text('/ ${subject.totalClasses} total', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
            ],
          ),
          if (!subject.isOnTrack) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.error.withOpacity(0.07),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, size: 13, color: AppTheme.error),
                  const SizedBox(width: 6),
                  Text(
                    'Need ${((0.75 * subject.totalClasses - subject.attended)).ceil()} more classes to reach 75%',
                    style: const TextStyle(fontSize: 11, color: AppTheme.error, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AttStat extends StatelessWidget {
  final String label, value;
  final Color color;
  const _AttStat(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text('$value $label', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
      ],
    );
  }
}

class _DetailedLogCard extends StatelessWidget {
  final AttendanceLog log;
  const _DetailedLogCard(this.log);

  @override
  Widget build(BuildContext context) {
    Color color;
    IconData icon;
    String statusText;

    switch (log.status) {
      case AttendanceStatus.present:
        color = AppTheme.success; icon = Icons.check_circle; statusText = 'Present'; break;
      case AttendanceStatus.absent:
        color = AppTheme.error; icon = Icons.cancel; statusText = 'Absent'; break;
      case AttendanceStatus.late:
        color = AppTheme.warning; icon = Icons.access_time; statusText = 'Late'; break;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(log.subject, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 3),
                    Text(log.room, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    const SizedBox(width: 8),
                    Icon(Icons.access_time_outlined, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 3),
                    Text(
                      '${log.dateTime.day}/${log.dateTime.month} • ${log.dateTime.hour}:${log.dateTime.minute.toString().padLeft(2, '0')}',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(statusText, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
          ),
        ],
      ),
    );
  }
}
