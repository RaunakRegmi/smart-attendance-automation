import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/mock_data.dart';
import '../../models/attendance.dart';

class RoutineScreen extends StatefulWidget {
  const RoutineScreen({super.key});

  @override
  State<RoutineScreen> createState() => _RoutineScreenState();
}

class _RoutineScreenState extends State<RoutineScreen> {
  int _selectedDayIndex = DateTime.now().weekday - 1;

  @override
  Widget build(BuildContext context) {
    final allClasses = MockData.getRoutine();
    final days = MockData.days;
    final todayClasses = allClasses.where((c) => c.day == days[_selectedDayIndex]).toList()
      ..sort((a, b) {
        final aMin = a.startTime.hour * 60 + a.startTime.minute;
        final bMin = b.startTime.hour * 60 + b.startTime.minute;
        return aMin.compareTo(bMin);
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
                        final isToday = i == DateTime.now().weekday - 1;
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
  final ClassSchedule schedule;
  const _ClassCard(this.schedule);

  Color _typeColor(String type) {
    switch (type) {
      case 'Lab': return AppTheme.accent;
      case 'Tutorial': return AppTheme.warning;
      default: return AppTheme.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final typeColor = _typeColor(schedule.type);

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
                Text(schedule.startTime.format(),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primary)),
                const SizedBox(height: 2),
                Text(schedule.endTime.format(),
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
                      child: Text(schedule.subject,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: typeColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(schedule.type,
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: typeColor)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.person_outline, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(schedule.teacher, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(schedule.room, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    const SizedBox(width: 12),
                    Icon(Icons.qr_code_outlined, size: 13, color: Colors.grey.shade400),
                    const SizedBox(width: 4),
                    Text(schedule.subjectCode, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
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
