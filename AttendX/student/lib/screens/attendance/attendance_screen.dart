import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/attendance_provider.dart';
import '../../widgets/skeletons.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String? _filterSubjectCode;
  String? _filterStatus;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AttendanceProvider>().loadSummary();
      context.read<AttendanceProvider>().loadLogs();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Color _attColor(double pct) {
    if (pct >= 80) return AppTheme.success;
    if (pct >= 60) return AppTheme.warning;
    return AppTheme.error;
  }

  void _showOverallDetail(double pct, int attended, int total, int absents, int lates, List<SubjectAttData> subjects) {
    final color = _attColor(pct);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AttendanceDetailSheet(
        title: 'Overall Attendance',
        color: color,
        pct: pct,
        children: [
          _detailStatRow('Classes Attended', '$attended/$total', AppTheme.success, Icons.check_circle),
          _detailStatRow('Absences', '$absents', AppTheme.error, Icons.cancel),
          _detailStatRow('Late Arrivals', '$lates', AppTheme.warning, Icons.access_time),
          const SizedBox(height: 12),
          const Text('Subjects', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          ...subjects.map((s) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Container(width: 10, height: 10, decoration: BoxDecoration(color: _attColor(s.percentage), shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Expanded(child: Text(s.subject, style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary))),
                Text('${s.percentage.toStringAsFixed(1)}%', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _attColor(s.percentage))),
              ],
            ),
          )),
        ],
      ),
    );
  }

  void _showAtRiskDetail(List<SubjectAttData> subjects) {
    final atRisk = subjects.where((s) => s.percentage < 80).toList();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AttendanceDetailSheet(
        title: 'Subjects at Risk',
        color: AppTheme.error,
        pct: null,
        children: atRisk.isEmpty
            ? [const Center(child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('No subjects at risk!', style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w600, fontSize: 16)),
              ))]
            : atRisk.map((s) => Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(12),
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
                              Text(s.subject, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                              Text(s.code, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                            ],
                          ),
                        ),
                        Text('${s.percentage.toStringAsFixed(1)}%',
                            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: _attColor(s.percentage))),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (s.percentage / 100).clamp(0.0, 1.0),
                        minHeight: 6,
                        backgroundColor: AppTheme.border,
                        color: _attColor(s.percentage),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      children: [
                        _miniStat('Attended', s.attended),
                        _miniStat('Absent', s.absents),
                        _miniStat('Total', s.total),
                      ],
                    ),
                  ],
                ),
              )).toList(),
      ),
    );
  }

  Widget _detailStatRow(String label, String value, Color color, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary))),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }

  Widget _miniStat(String label, int value) {
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: '$value ', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.textPrimary)),
          TextSpan(text: label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final attProvider = context.watch<AttendanceProvider>();
    final summary = attProvider.summary;
    final logs = attProvider.logs;

    double overall = 0;
    int subjectsCount = 0;
    int atRiskCount = 0;

    if (summary != null) {
      overall = summary.percentage;
      subjectsCount = summary.subjects.length;
      atRiskCount = summary.atRisk;
    }

    if (attProvider.isLoading && summary == null) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: SafeArea(child: attendanceSkeleton()),
      );
    }

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

                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: summary == null ? null : () => _showOverallDetail(
                            overall, summary.attended, summary.total, summary.absents, summary.lates, summary.subjects,
                          ),
                          child: _SummaryCard('Overall', '${overall.toStringAsFixed(1)}%', _attColor(overall), Icons.pie_chart_outline),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => _tabController.animateTo(0),
                          child: _SummaryCard('Subjects', '$subjectsCount', AppTheme.accent, Icons.book_outlined),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: GestureDetector(
                          onTap: summary == null ? null : () => _showAtRiskDetail(summary.subjects),
                          child: _SummaryCard('At Risk', '$atRiskCount', AppTheme.error, Icons.warning_amber_outlined),
                        ),
                      ),
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
                    summary == null || summary.subjects.isEmpty
                        ? const Center(child: Padding(
                            padding: EdgeInsets.all(40),
                            child: Text('No attendance data available',
                                style: TextStyle(color: AppTheme.textSecondary)),
                          ))
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: summary.subjects.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (context, i) => _SubjectCard(summary.subjects[i]),
                          ),

                    // Logs view
                    Builder(builder: (context) {
                      final filteredLogs = logs.where((log) {
                        if (_filterSubjectCode != null && log['code'] != _filterSubjectCode) return false;
                        if (_filterStatus != null && (log['status'] as String?)?.toUpperCase() != _filterStatus!.toUpperCase()) return false;
                        return true;
                      }).toList();
                      return Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                            child: Row(children: [
                              Expanded(
                                child: DropdownButtonFormField<String?>(
                                  value: _filterSubjectCode,
                                  isExpanded: true,
                                  dropdownColor: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(12),
                                  decoration: InputDecoration(
                                    labelText: 'Subject',
                                    prefixIcon: const Icon(Icons.book_outlined, size: 20),
                                    filled: true,
                                    fillColor: const Color(0xFFF1F5F9),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  ),
                                  items: [
                                    const DropdownMenuItem(
                                      value: null,
                                      child: Padding(
                                        padding: EdgeInsets.symmetric(vertical: 4),
                                        child: Text('All Subjects', style: TextStyle(fontSize: 14)),
                                      ),
                                    ),
                                    ...{...logs.map((l) => l['code'] as String? ?? '')}.where((c) => c.isNotEmpty)
                                      .map((code) => DropdownMenuItem(
                                        value: code,
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(vertical: 4),
                                          child: Text(code, style: const TextStyle(fontSize: 14)),
                                        ),
                                      )),
                                  ],
                                  onChanged: (v) => setState(() => _filterSubjectCode = v),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: DropdownButtonFormField<String?>(
                                  value: _filterStatus,
                                  isExpanded: true,
                                  dropdownColor: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(12),
                                  decoration: InputDecoration(
                                    labelText: 'Status',
                                    prefixIcon: const Icon(Icons.filter_list_outlined, size: 20),
                                    filled: true,
                                    fillColor: const Color(0xFFF1F5F9),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  ),
                                  items: const [
                                    DropdownMenuItem(
                                      value: null,
                                      child: Padding(
                                        padding: EdgeInsets.symmetric(vertical: 4),
                                        child: Text('All', style: TextStyle(fontSize: 14)),
                                      ),
                                    ),
                                    DropdownMenuItem(
                                      value: 'PRESENT',
                                      child: Padding(
                                        padding: EdgeInsets.symmetric(vertical: 4),
                                        child: Text('Present', style: TextStyle(fontSize: 14)),
                                      ),
                                    ),
                                    DropdownMenuItem(
                                      value: 'ABSENT',
                                      child: Padding(
                                        padding: EdgeInsets.symmetric(vertical: 4),
                                        child: Text('Absent', style: TextStyle(fontSize: 14)),
                                      ),
                                    ),
                                    DropdownMenuItem(
                                      value: 'LATE',
                                      child: Padding(
                                        padding: EdgeInsets.symmetric(vertical: 4),
                                        child: Text('Late', style: TextStyle(fontSize: 14)),
                                      ),
                                    ),
                                  ],
                                  onChanged: (v) => setState(() => _filterStatus = v),
                                ),
                              ),
                              if (_filterSubjectCode != null || _filterStatus != null) ...[
                                const SizedBox(width: 4),
                                SizedBox(
                                  height: 48,
                                  width: 48,
                                  child: IconButton(
                                    onPressed: () => setState(() {
                                      _filterSubjectCode = null;
                                      _filterStatus = null;
                                    }),
                                    icon: const Icon(Icons.filter_alt_off_outlined),
                                    color: AppTheme.error,
                                    tooltip: 'Clear filters',
                                    style: IconButton.styleFrom(
                                      backgroundColor: AppTheme.error.withOpacity(0.1),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ]),
                          ),
                          Expanded(
                            child: filteredLogs.isEmpty
                                ? const Center(child: Padding(
                                    padding: EdgeInsets.all(40),
                                    child: Text('No attendance logs available',
                                        style: TextStyle(color: AppTheme.textSecondary)),
                                  ))
                                : ListView.separated(
                                    padding: const EdgeInsets.symmetric(horizontal: 20),
                                    itemCount: filteredLogs.length,
                                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                                    itemBuilder: (context, i) => _DetailedLogCard.fromJson(filteredLogs[i]),
                                  ),
                          ),
                        ],
                      );
                    }),
                  ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AttendanceDetailSheet extends StatelessWidget {
  final String title;
  final Color color;
  final double? pct;
  final List<Widget> children;

  const _AttendanceDetailSheet({
    required this.title,
    required this.color,
    required this.pct,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40, height: 4,
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                  child: Icon(Icons.info_outline, color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              ],
            ),
          ),
          if (pct != null) ...[
            const SizedBox(height: 16),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [color, color.withOpacity(0.75)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  Text('${pct!.toStringAsFixed(1)}%',
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white)),
                  const SizedBox(width: 12),
                  Text(pct! >= 80 ? 'On Track' : 'Needs Improvement',
                      style: const TextStyle(fontSize: 13, color: Colors.white70)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          // Divider
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Divider(color: AppTheme.border, height: 1),
          ),
          const SizedBox(height: 12),
          // Scrollable content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(children: children),
            ),
          ),
        ],
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
    return Container(
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
    );
  }
}

class _SubjectCard extends StatelessWidget {
  final SubjectAttData subject;
  const _SubjectCard(this.subject);

  Color _attColor(double pct) {
    if (pct >= 80) return AppTheme.success;
    if (pct >= 60) return AppTheme.warning;
    return AppTheme.error;
  }

  @override
  Widget build(BuildContext context) {
    final pct = subject.percentage;
    final color = _attColor(pct);
    final neededMore = ((80 - pct) / 20 * subject.total).ceil();

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
              Text('/ ${subject.total} total', style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
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
                    'Need ${neededMore > 0 ? neededMore : 0} more class${neededMore > 1 ? "es" : ""} to reach 80%',
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
  final String subject;
  final String status;
  final String date;
  final String? room;
  final String? code;

  const _DetailedLogCard({
    required this.subject,
    required this.status,
    required this.date,
    this.room,
    this.code,
  });

  factory _DetailedLogCard.fromJson(Map<String, dynamic> json) {
    return _DetailedLogCard(
      subject: json['subject'] as String? ?? '',
      status: json['status'] as String? ?? 'Absent',
      date: json['date'] as String? ?? '',
      room: json['room'] as String?,
      code: json['code'] as String?,
    );
  }

  @override
  Widget build(BuildContext context) {
    Color color;
    IconData icon;
    String statusText;

    final upperStatus = status.toUpperCase();
    if (upperStatus == 'PRESENT') {
      color = AppTheme.success; icon = Icons.check_circle; statusText = 'Present';
    } else if (upperStatus == 'LATE') {
      color = AppTheme.warning; icon = Icons.access_time; statusText = 'Late';
    } else {
      color = AppTheme.error; icon = Icons.cancel; statusText = 'Absent';
    }

    final dt = DateTime.tryParse(date);

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
                Text(subject, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 3),
                    Text(room ?? '', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    const SizedBox(width: 8),
                    Icon(Icons.access_time_outlined, size: 12, color: Colors.grey.shade400),
                    const SizedBox(width: 3),
                    Text(
                      dt != null ? '${dt.day}/${dt.month} • ${dt.hour > 12 ? dt.hour - 12 : dt.hour}:${dt.minute.toString().padLeft(2, '0')}' : date,
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
