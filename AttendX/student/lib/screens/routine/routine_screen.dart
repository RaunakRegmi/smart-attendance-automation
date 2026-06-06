import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/schedule_provider.dart';

class RoutineScreen extends StatefulWidget {
  const RoutineScreen({super.key});

  @override
  State<RoutineScreen> createState() => _RoutineScreenState();
}

class _RoutineScreenState extends State<RoutineScreen> {
  int _selectedDayIndex = DateTime.now().weekday % 7;
  final List<String> _days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ScheduleProvider>().loadWeeklySchedule();
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheduleProvider = context.watch<ScheduleProvider>();
    final weeklySchedule = scheduleProvider.weeklySchedule;
    final days = _days;

    // Map API data (full day names) to our short names
    final dayNameMap = {
      'Sunday': 'SUN', 'Monday': 'MON', 'Tuesday': 'TUE',
      'Wednesday': 'WED', 'Thursday': 'THU', 'Friday': 'FRI', 'Saturday': 'SAT',
    };

    // Get classes for selected day from API data
    final allApiDays = weeklySchedule.map((d) => d as Map<String, dynamic>).toList();
    final selectedDayName = days[_selectedDayIndex];
    final apiEntry = allApiDays.where((d) {
      final fullName = d['day'] as String? ?? '';
      return dayNameMap[fullName] == selectedDayName;
    }).toList();
    final todayClasses = (apiEntry.isNotEmpty ? (apiEntry.first['classes'] as List<dynamic>?) ?? [] : [])
        .map((c) => c as Map<String, dynamic>)
        .toList()
      ..sort((a, b) {
        final aTime = a['startTime'] as String? ?? '00:00';
        final bTime = b['startTime'] as String? ?? '00:00';
        return aTime.compareTo(bTime);
      });

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Class Routine', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                  const SizedBox(height: 4),
                  Text('Semester schedule overview', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                  const SizedBox(height: 20),

                  // Day selector
                  SizedBox(
                    height: 60,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: days.length,
                      itemBuilder: (context, i) {
                        final isSelected = _selectedDayIndex == i;
                        final isToday = i == DateTime.now().weekday % 7;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedDayIndex = i),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.only(right: 10),
                            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? AppTheme.primary : AppTheme.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? AppTheme.primary : isToday ? AppTheme.primary.withOpacity(0.4) : AppTheme.border,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  days[i],
                                  style: TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.w700,
                                    color: isSelected ? Colors.white : isToday ? AppTheme.primary : AppTheme.textSecondary,
                                  ),
                                ),
                                if (isToday) ...[
                                  const SizedBox(height: 3),
                                  Container(
                                    width: 4, height: 4,
                                    decoration: BoxDecoration(
                                      color: isSelected ? Colors.white : AppTheme.primary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${todayClasses.length} class${todayClasses.length != 1 ? "es" : ""} scheduled',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Class list
            Expanded(
              child: todayClasses.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.event_available_outlined, size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No classes on ${days[_selectedDayIndex]}',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey.shade400)),
                          const SizedBox(height: 4),
                          Text('Enjoy your free day!', style: TextStyle(fontSize: 13, color: Colors.grey.shade400)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: todayClasses.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, i) => _ClassCard(todayClasses[i]),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  final Map<String, dynamic> classData;
  const _ClassCard(this.classData);

  Color _typeColor(String type) {
    switch (type) {
      case 'Lab': return AppTheme.accent;
      case 'Tutorial': return AppTheme.warning;
      default: return AppTheme.primary;
    }
  }

  String _formatTime(String time) {
    final parts = time.split(':');
    if (parts.length < 2) return time;
    final h = int.tryParse(parts[0]) ?? 0;
    final m = parts[1];
    final period = h >= 12 ? 'PM' : 'AM';
    final hour12 = h == 0 ? 12 : (h > 12 ? h - 12 : h);
    return '$hour12:$m $period';
  }

  @override
  Widget build(BuildContext context) {
    final subjectName = classData['subjectName'] as String? ?? classData['subject'] as String? ?? '';
    final subjectCode = classData['subjectCode'] as String? ?? classData['code'] as String? ?? '';
    final startTime = classData['startTime'] as String? ?? '';
    final endTime = classData['endTime'] as String? ?? '';
    final room = classData['room'] as String? ?? '';
    final block = classData['block'] as String? ?? '';
    final teacher = (classData['teacher'] as String?)?.trim() ?? '';
    final typeVal = block.isNotEmpty ? block : 'Lecture';
    final typeColor = _typeColor(typeVal);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Time column
          SizedBox(
            width: 64,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_formatTime(startTime),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                const SizedBox(height: 2),
                Text(_formatTime(endTime),
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
              ],
            ),
          ),

          // Vertical divider
          Container(
            width: 3, height: 60,
            margin: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: typeColor,
              borderRadius: BorderRadius.circular(4),
            ),
          ),

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(subjectName,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: typeColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(typeVal,
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: typeColor)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.person_outline, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        teacher.isNotEmpty ? teacher : 'Lecturer TBA',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(room, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    const SizedBox(width: 12),
                    Icon(Icons.qr_code_outlined, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(subjectCode, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
