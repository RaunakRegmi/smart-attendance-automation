// import 'package:flutter/material.dart';
// import '../../theme/app_theme.dart';
// import '../../utils/mock_data.dart';
// import '../auth/login_screen.dart';

// class ProfileScreen extends StatelessWidget {
//   const ProfileScreen({super.key});

//   @override
//   Widget build(BuildContext context) {
//     final user = MockData.currentUser;

//     return Scaffold(
//       backgroundColor: AppTheme.background,
//       body: SafeArea(
//         child: SingleChildScrollView(
//           child: Column(
//             children: [
//               // Profile Header
//               Container(
//                 width: double.infinity,
//                 decoration: const BoxDecoration(
//                   color: AppTheme.primary,
//                   borderRadius: BorderRadius.only(
//                     bottomLeft: Radius.circular(28),
//                     bottomRight: Radius.circular(28),
//                   ),
//                 ),
//                 padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
//                 child: Column(
//                   children: [
//                     Row(
//                       mainAxisAlignment: MainAxisAlignment.spaceBetween,
//                       children: [
//                         const Text('Profile', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white)),
//                         IconButton(
//                           icon: const Icon(Icons.settings_outlined, color: Colors.white70),
//                           onPressed: () {},
//                         ),
//                       ],
//                     ),
//                     const SizedBox(height: 20),
//                     Stack(
//                       alignment: Alignment.bottomRight,
//                       children: [
//                         Container(
//                           width: 90, height: 90,
//                           decoration: BoxDecoration(
//                             color: Colors.white.withOpacity(0.2),
//                             shape: BoxShape.circle,
//                             border: Border.all(color: Colors.white.withOpacity(0.4), width: 3),
//                           ),
//                           child: const Icon(Icons.person, size: 50, color: Colors.white),
//                         ),
//                         Container(
//                           width: 28, height: 28,
//                           decoration: BoxDecoration(
//                             color: AppTheme.accent,
//                             shape: BoxShape.circle,
//                             border: Border.all(color: Colors.white, width: 2),
//                           ),
//                           child: const Icon(Icons.edit, size: 13, color: Colors.white),
//                         ),
//                       ],
//                     ),
//                     const SizedBox(height: 14),
//                     Text(user.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
//                     const SizedBox(height: 4),
//                     Text(user.email, style: const TextStyle(fontSize: 13, color: Colors.white70)),
//                     const SizedBox(height: 16),
//                     Row(
//                       mainAxisAlignment: MainAxisAlignment.center,
//                       children: [
//                         _HeaderChip(Icons.badge_outlined, user.studentId),
//                         const SizedBox(width: 12),
//                         _HeaderChip(Icons.school_outlined, user.semester),
//                       ],
//                     ),
//                   ],
//                 ),
//               ),
//               const SizedBox(height: 20),

//               // Attendance summary
//               Padding(
//                 padding: const EdgeInsets.symmetric(horizontal: 20),
//                 child: Container(
//                   padding: const EdgeInsets.all(16),
//                   decoration: BoxDecoration(
//                     color: AppTheme.surface,
//                     borderRadius: BorderRadius.circular(16),
//                     border: Border.all(color: AppTheme.border),
//                   ),
//                   child: Column(
//                     crossAxisAlignment: CrossAxisAlignment.start,
//                     children: [
//                       const Text('Attendance Summary', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
//                       const SizedBox(height: 14),
//                       Row(
//                         children: [
//                           _StatBox('85%', 'Overall', AppTheme.primary),
//                           const SizedBox(width: 10),
//                           _StatBox('7', 'Subjects', AppTheme.accent),
//                           const SizedBox(width: 10),
//                           _StatBox('2', 'At Risk', AppTheme.error),
//                           const SizedBox(width: 10),
//                           _StatBox('TOP 10%', 'Rank', AppTheme.warning),
//                         ],
//                       ),
//                     ],
//                   ),
//                 ),
//               ),
//               const SizedBox(height: 16),

//               // Info section
//               Padding(
//                 padding: const EdgeInsets.symmetric(horizontal: 20),
//                 child: Container(
//                   decoration: BoxDecoration(
//                     color: AppTheme.surface,
//                     borderRadius: BorderRadius.circular(16),
//                     border: Border.all(color: AppTheme.border),
//                   ),
//                   child: Column(
//                     children: [
//                       _InfoTile(Icons.account_circle_outlined, 'Full Name', user.name),
//                       _Divider(),
//                       _InfoTile(Icons.email_outlined, 'Email', user.email),
//                       _Divider(),
//                       _InfoTile(Icons.badge_outlined, 'Student ID', user.studentId),
//                       _Divider(),
//                       _InfoTile(Icons.business_outlined, 'Department', user.department),
//                       _Divider(),
//                       _InfoTile(Icons.layers_outlined, 'Semester', user.semester),
//                     ],
//                   ),
//                 ),
//               ),
//               const SizedBox(height: 16),

//               // Settings section
//               Padding(
//                 padding: const EdgeInsets.symmetric(horizontal: 20),
//                 child: Container(
//                   decoration: BoxDecoration(
//                     color: AppTheme.surface,
//                     borderRadius: BorderRadius.circular(16),
//                     border: Border.all(color: AppTheme.border),
//                   ),
//                   child: Column(
//                     children: [
//                       _ActionTile(Icons.notifications_outlined, 'Notifications', 'Manage alerts', onTap: () {}),
//                       _Divider(),
//                       _ActionTile(Icons.lock_outline, 'Change Password', 'Update credentials', onTap: () {}),
//                       _Divider(),
//                       _ActionTile(Icons.help_outline, 'Help & Support', 'Contact admin or get guidance', onTap: () {}),
//                       _Divider(),
//                       _ActionTile(Icons.info_outline, 'About AttendX', 'Version 1.0.0', onTap: () {}),
//                     ],
//                   ),
//                 ),
//               ),
//               const SizedBox(height: 16),

//               // Logout
//               Padding(
//                 padding: const EdgeInsets.symmetric(horizontal: 20),
//                 child: SizedBox(
//                   width: double.infinity,
//                   child: OutlinedButton.icon(
//                     onPressed: () {
//                       Navigator.of(context).pushAndRemoveUntil(
//                         MaterialPageRoute(builder: (_) => const LoginScreen()),
//                         (route) => false,
//                       );
//                     },
//                     icon: const Icon(Icons.logout, color: AppTheme.error),
//                     label: const Text('Sign Out', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.w600)),
//                     style: OutlinedButton.styleFrom(
//                       side: const BorderSide(color: AppTheme.error),
//                       padding: const EdgeInsets.symmetric(vertical: 14),
//                       shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
//                     ),
//                   ),
//                 ),
//               ),
//               const SizedBox(height: 28),
//             ],
//           ),
//         ),
//       ),
//     );
//   }
// }

// class _HeaderChip extends StatelessWidget {
//   final IconData icon;
//   final String label;
//   const _HeaderChip(this.icon, this.label);

//   @override
//   Widget build(BuildContext context) {
//     return Container(
//       padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
//       decoration: BoxDecoration(
//         color: Colors.white.withOpacity(0.15),
//         borderRadius: BorderRadius.circular(20),
//       ),
//       child: Row(
//         children: [
//           Icon(icon, size: 13, color: Colors.white70),
//           const SizedBox(width: 5),
//           Text(label, style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w500)),
//         ],
//       ),
//     );
//   }
// }

// class _StatBox extends StatelessWidget {
//   final String value, label;
//   final Color color;
//   const _StatBox(this.value, this.label, this.color);

//   @override
//   Widget build(BuildContext context) {
//     return Expanded(
//       child: Container(
//         padding: const EdgeInsets.symmetric(vertical: 10),
//         decoration: BoxDecoration(
//           color: color.withOpacity(0.08),
//           borderRadius: BorderRadius.circular(10),
//         ),
//         child: Column(
//           children: [
//             Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
//             const SizedBox(height: 2),
//             Text(label, style: TextStyle(fontSize: 10, color: color.withOpacity(0.8))),
//           ],
//         ),
//       ),
//     );
//   }
// }

// class _InfoTile extends StatelessWidget {
//   final IconData icon;
//   final String label, value;
//   const _InfoTile(this.icon, this.label, this.value);

//   @override
//   Widget build(BuildContext context) {
//     return Padding(
//       padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
//       child: Row(
//         children: [
//           Icon(icon, size: 20, color: AppTheme.primary),
//           const SizedBox(width: 14),
//           Column(
//             crossAxisAlignment: CrossAxisAlignment.start,
//             children: [
//               Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.w500)),
//               const SizedBox(height: 2),
//               Text(value, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500)),
//             ],
//           ),
//         ],
//       ),
//     );
//   }
// }

// class _ActionTile extends StatelessWidget {
//   final IconData icon;
//   final String title, subtitle;
//   final VoidCallback onTap;
//   const _ActionTile(this.icon, this.title, this.subtitle, {required this.onTap});

//   @override
//   Widget build(BuildContext context) {
//     return InkWell(
//       onTap: onTap,
//       child: Padding(
//         padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
//         child: Row(
//           children: [
//             Icon(icon, size: 20, color: AppTheme.primary),
//             const SizedBox(width: 14),
//             Expanded(
//               child: Column(
//                 crossAxisAlignment: CrossAxisAlignment.start,
//                 children: [
//                   Text(title, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
//                   Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
//                 ],
//               ),
//             ),
//             Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade300),
//           ],
//         ),
//       ),
//     );
//   }
// }

// class _Divider extends StatelessWidget {
//   @override
//   Widget build(BuildContext context) {
//     return const Divider(height: 1, indent: 50, color: AppTheme.border);
//   }
// }
// lib/screens/profile/profile_screen.dart
//
// CHANGES IN THIS VERSION:
//  1. Settings gear icon now opens a full Settings bottom sheet
//  2. Settings sheet has: Notifications toggles, Display, Privacy, Account, App Info
//  3. Notifications tile in settings section also opens the same sheet
//  4. Help & Support opens a support dialog
//  5. About AttendX opens an about dialog
//  6. Change Password opens a password dialog
//  7. ProfileScreen changed to StatefulWidget to hold settings state

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/dashboard_provider.dart';
import '../../services/auth_service.dart';
import '../../services/api_client.dart';
import '../../services/notification_scheduler.dart';
import '../auth/login_screen.dart';
import '../report/report_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  // ── Settings state ────────────────────────────────────────────
  bool _notifAttendance  = true;
  bool _notifClass       = true;
  int _leadMinutes       = 15;

  // ── Open settings bottom sheet ────────────────────────────────
  void _openSettings() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSheetState) => _SettingsSheet(
          notifAttendance : _notifAttendance,
          notifClass      : _notifClass,
          onChanged       : (key, val) {
            setSheetState(() {});
            setState(() {
              switch (key) {
                case 'notifAttendance' : _notifAttendance  = val; break;
                case 'notifClass'      : _notifClass       = val; break;
              }
            });
            // Persist the class-reminder toggle to the scheduler.
            if (key == 'notifClass') {
              _toggleClassReminders(val);
            }
          },
          scheduledCount       : _scheduledCount,
          onTestReminder       : () => _sendTestReminder(),
          leadMinutes          : _leadMinutes,
          onLeadMinutesChanged : (v) async {
            await NotificationScheduler.setLeadMinutes(v);
            setState(() => _leadMinutes = v);
            setSheetState(() {});
          },
        ),
      ),
    );
  }

  Future<void> _sendTestReminder() async {
    final data = context.read<DashboardProvider>().data;
    final next = data?.nextClass;
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
      title = 'Test reminder';
      body = 'Reminders are working. Once your routine is uploaded, you\'ll get one 15 min before every class.';
    }
    if (!mounted) return;
    Navigator.of(context).pop(); // close the settings sheet first
    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (!mounted) return;
    NotificationScheduler.showInAppBanner(context, title: title, body: body);
    NotificationScheduler.testNow();
  }

  // ── Change password dialog ────────────────────────────────────
  void _openChangePassword() {
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final conCtrl = TextEditingController();
    bool saving = false;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Change Password',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            _PasswordField(controller: oldCtrl, label: 'Current Password'),
            const SizedBox(height: 12),
            _PasswordField(controller: newCtrl, label: 'New Password'),
            const SizedBox(height: 12),
            _PasswordField(controller: conCtrl, label: 'Confirm New Password'),
          ]),
          actions: [
            TextButton(
              onPressed: saving ? null : () => Navigator.pop(dialogCtx),
              child: const Text('Cancel', style: TextStyle(color: AppTheme.textSecondary))),
            ElevatedButton(
              onPressed: saving ? null : () async {
                final current = oldCtrl.text.trim();
                final newPwd  = newCtrl.text.trim();
                final confirm = conCtrl.text.trim();
                if (current.isEmpty || newPwd.isEmpty || confirm.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('All fields are required'),
                    behavior: SnackBarBehavior.floating,
                    backgroundColor: AppTheme.error));
                  return;
                }
                if (newPwd != confirm) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Passwords do not match'),
                    behavior: SnackBarBehavior.floating,
                    backgroundColor: AppTheme.error));
                  return;
                }
                setDialogState(() => saving = true);
                try {
                  await AuthService.changePassword(current, newPwd, confirm);
                  if (!mounted) return;
                  Navigator.pop(dialogCtx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content: Text('Password updated successfully'),
                    behavior: SnackBarBehavior.floating,
                    backgroundColor: AppTheme.success));
                } catch (e) {
                  setDialogState(() => saving = false);
                  final msg = e.toString().replaceFirst('Exception: ', '');
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(msg),
                    behavior: SnackBarBehavior.floating,
                    backgroundColor: AppTheme.error));
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
              child: saving
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Update', style: TextStyle(color: Colors.white))),
          ],
        ),
      ),
    );
  }

  // ── Help & support dialog ─────────────────────────────────────
  void _openHelp() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Help & Support',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          _HelpTile(Icons.email_outlined, 'Email Support', 'support@attendx.edu'),
          const SizedBox(height: 10),
          _HelpTile(Icons.phone_outlined, 'Admin Office', '+977 9744446734'),
          const SizedBox(height: 10),
          _HelpTile(Icons.schedule_outlined, 'Office Hours', 'Mon–Fri, 9 AM – 5 PM'),
          const SizedBox(height: 10),
          _HelpTile(Icons.web_outlined, 'Student Portal', 'portal.attendx.edu'),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: AppTheme.primary))),
        ],
      ),
    );
  }

  // ── About dialog ──────────────────────────────────────────────
  void _openAbout() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 64, height: 64,
            decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.school, color: Colors.white, size: 36)),
          const SizedBox(height: 16),
          const Text('AttendX', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.primary)),
          const SizedBox(height: 4),
          const Text('Smart Campus Management System',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          const SizedBox(height: 16),
          _AboutRow('Version',  '1.0.0'),
          _AboutRow('Platform', 'Flutter 3.x'),
          _AboutRow('Build',    '2024.01.15'),
          _AboutRow('Team',     'Group Project — CS Dept'),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: AppTheme.primary))),
        ],
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().loadDashboard();
      _loadNotificationState();
    });
  }

  Future<void> _loadNotificationState() async {
    final enabled = await NotificationScheduler.isEnabled();
    final count = await NotificationScheduler.pendingCount();
    final leadMins = await NotificationScheduler.getLeadMinutes();
    if (!mounted) return;
    setState(() {
      _notifClass = enabled;
      _scheduledCount = count;
      _leadMinutes = leadMins;
    });
  }

  int _scheduledCount = 0;

  Future<void> _toggleClassReminders(bool value) async {
    await NotificationScheduler.setEnabled(value);
    if (value) {
      // Re-fetch routine and reschedule
      try {
        final response = await ApiClient.get('/api/schedule/week');
        final weekly = response['data'] as List<dynamic>?;
        if (weekly != null) await NotificationScheduler.scheduleFromWeekly(weekly);
      } catch (_) {/* ignore — best effort */}
    }
    if (!mounted) return;
    final count = await NotificationScheduler.pendingCount();
    if (!mounted) return;
    setState(() {
      _notifClass = value;
      _scheduledCount = count;
    });
  }

  Future<void> _handleLogout() async {
    await AuthService.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardProvider>();
    final data = dashboard.data;

    final name = data?.name ?? 'Student';
    final email = data?.email ?? 'email@university.edu';
    final studentId = data?.studentId ?? 'STU-000';
    final department = data?.department ?? 'Department';
    final semester = data?.semester ?? 'Semester';
    final overallPct = data?.overallPercentage ?? 0;
    final totalSubjects = data?.totalSubjects ?? 0;
    final atRiskCount = data?.atRiskCount ?? 0;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(children: [

            // ── Profile Header ───────────────────────────────────
            Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(28),
                  bottomRight: Radius.circular(28)),
              ),
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              child: Column(children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('Profile', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white)),
                  IconButton(
                    icon: const Icon(Icons.settings_outlined, color: Colors.white70),
                    onPressed: _openSettings,
                  ),
                ]),
                const SizedBox(height: 20),
                Stack(alignment: Alignment.bottomRight, children: [
                  Container(width: 90, height: 90,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withOpacity(0.4), width: 3)),
                    child: const Icon(Icons.person, size: 50, color: Colors.white)),
                  Container(width: 28, height: 28,
                    decoration: BoxDecoration(color: AppTheme.accent, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                    child: const Icon(Icons.edit, size: 13, color: Colors.white)),
                ]),
                const SizedBox(height: 14),
                Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 4),
                Text(email, style: const TextStyle(fontSize: 13, color: Colors.white70)),
                const SizedBox(height: 16),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  _HeaderChip(Icons.badge_outlined, studentId),
                  const SizedBox(width: 12),
                  _HeaderChip(Icons.school_outlined, semester),
                ]),
              ]),
            ),
            const SizedBox(height: 20),

            // ── Attendance Summary ───────────────────────────────
            Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Attendance Summary', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                  const SizedBox(height: 14),
                  Row(children: [
                    _StatBox('${overallPct.toInt()}%', 'Overall',  AppTheme.primary),
                    const SizedBox(width: 10),
                    _StatBox('$totalSubjects', 'Subjects', AppTheme.accent),
                    const SizedBox(width: 10),
                    _StatBox('$atRiskCount', 'At Risk',  AppTheme.error),
                    const SizedBox(width: 10),
                    _StatBox(overallPct >= 80 ? 'SAFE' : 'RISK', 'Status', AppTheme.warning),
                  ]),
                ]),
              )),
            const SizedBox(height: 16),

            // ── Student Info ─────────────────────────────────────
            Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Column(children: [
                  _InfoTile(Icons.account_circle_outlined, 'Full Name',   name),
                  _Divider(),
                  _InfoTile(Icons.email_outlined,           'Email',       email),
                  _Divider(),
                  _InfoTile(Icons.badge_outlined,           'Student ID',  studentId),
                  _Divider(),
                  _InfoTile(Icons.business_outlined,        'Department',  department),
                  _Divider(),
                  _InfoTile(Icons.layers_outlined,          'Semester',    semester),
                ]),
              )),
            const SizedBox(height: 16),

            // ── Academic Section ────────────────────────────────
            Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Column(children: [
                  _ActionTile(Icons.assessment_outlined, 'My Report',
                      'Full attendance and risk overview',
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const ReportScreen(),
                          ),
                        );
                      }),
                ]),
              )),
            const SizedBox(height: 16),

            // ── Settings Section ─────────────────────────────────
            Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.border)),
                child: Column(children: [
                  _ActionTile(Icons.notifications_outlined, 'Notifications',
                      _notifAttendance || _notifClass ? 'Alerts enabled' : 'All alerts off',
                      onTap: _openSettings),
                  _Divider(),
                  _ActionTile(Icons.lock_outline, 'Change Password', 'Update credentials', onTap: _openChangePassword),
                  _Divider(),
                  _ActionTile(Icons.help_outline, 'Help & Support', 'Contact admin or get guidance', onTap: _openHelp),
                  _Divider(),
                  _ActionTile(Icons.info_outline, 'About AttendX', 'Version 1.0.0', onTap: _openAbout),
                ]),
              )),
            const SizedBox(height: 16),

            // ── Logout ───────────────────────────────────────────
            Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SizedBox(width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _handleLogout,
                  icon: const Icon(Icons.logout, color: AppTheme.error),
                  label: const Text('Sign Out', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.error),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                ))),
            const SizedBox(height: 28),
          ]),
        ),
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════
// SETTINGS BOTTOM SHEET
// ═════════════════════════════════════════════════════════════
class _SettingsSheet extends StatelessWidget {
  final bool notifAttendance, notifClass;
  final void Function(String key, bool val) onChanged;
  final int scheduledCount;
  final VoidCallback onTestReminder;
  final int leadMinutes;
  final void Function(int) onLeadMinutesChanged;

  const _SettingsSheet({
    required this.notifAttendance, required this.notifClass,
    required this.onChanged,
    required this.scheduledCount, required this.onTestReminder,
    required this.leadMinutes, required this.onLeadMinutesChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24))),
      child: Column(children: [
        const SizedBox(height: 12),
        Container(width: 40, height: 4, decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),

        // Header
        Padding(padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(children: [
            Container(width: 36, height: 36,
              decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.settings_outlined, color: AppTheme.primary, size: 20)),
            const SizedBox(width: 12),
            const Text('Settings', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
          ])),
        const SizedBox(height: 16),
        const Divider(height: 1, color: AppTheme.border),

        Expanded(child: SingleChildScrollView(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

          // ── Notifications ──────────────────────────────────────
          _SectionLabel('NOTIFICATIONS'),
          _SettingsCard(children: [
            _ToggleTile(
              icon: Icons.warning_amber_outlined, color: AppTheme.error,
              title: 'Attendance Alerts',
              subtitle: 'Warn when attendance drops below 80%',
              value: notifAttendance,
              onChanged: (v) => onChanged('notifAttendance', v)),
            _Divider(),
            _ToggleTile(
              icon: Icons.schedule_outlined, color: AppTheme.primary,
              title: 'Class Reminders',
              subtitle: 'Remind 15 minutes before class starts',
              value: notifClass,
              onChanged: (v) => onChanged('notifClass', v)),
            if (notifClass) _ClassReminderStatus(
              scheduledCount: scheduledCount,
              onTestReminder: onTestReminder,
            ),
            if (notifClass) _Divider(),
            if (notifClass) Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Remind me', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  DropdownButton<int>(
                    value: leadMinutes,
                    underline: const SizedBox(),
                    items: [5, 10, 15, 20, 30].map((m) => DropdownMenuItem(
                      value: m,
                      child: Text('$m min before', style: const TextStyle(fontSize: 13)),
                    )).toList(),
                    onChanged: (v) { if (v != null) onLeadMinutesChanged(v); },
                  ),
                ],
              ),
            ),
          ]),
          const SizedBox(height: 20),

          // ── Account ────────────────────────────────────────────
          _SectionLabel('ACCOUNT'),
          _SettingsCard(children: [
            _TapTile(icon: Icons.download_outlined, color: AppTheme.accent,
              title: 'Download My Data', subtitle: 'Export your attendance records',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Preparing your data export…'), behavior: SnackBarBehavior.floating))),
          ]),
          const SizedBox(height: 20),

          // ── App Info ───────────────────────────────────────────
          _SectionLabel('APP INFO'),
          _SettingsCard(children: [
            _InfoRow('Version',    '1.0.0'),
            _Divider(),
            _InfoRow('Build',      '2024.01.15'),
            _Divider(),
            _InfoRow('Framework',  'Flutter 3.x / Dart'),
            _Divider(),
            _InfoRow('Backend',    'Node.js + RAG AI'),
          ]),
          const SizedBox(height: 8),
        ]))),
      ]),
    );
  }
}

// ═════════════════════════════════════════════════════════════
// SMALL HELPER WIDGETS
// ═════════════════════════════════════════════════════════════
class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
        color: AppTheme.textSecondary, letterSpacing: 1.0)));
}

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;
  const _SettingsCard({required this.children});
  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(color: AppTheme.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppTheme.border)),
    child: Column(children: children));
}

class _ToggleTile extends StatelessWidget {
  final IconData icon; final Color color;
  final String title, subtitle;
  final bool value; final ValueChanged<bool> onChanged;
  const _ToggleTile({required this.icon, required this.color, required this.title,
      required this.subtitle, required this.value, required this.onChanged});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    child: Row(children: [
      Container(width: 36, height: 36,
        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: color, size: 18)),
      const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
      ])),
      Switch(value: value, onChanged: onChanged,
        activeColor: AppTheme.primary,
        activeTrackColor: AppTheme.primary.withOpacity(0.3)),
    ]));
}

class _TapTile extends StatelessWidget {
  final IconData icon; final Color color;
  final String title, subtitle;
  final VoidCallback onTap;
  const _TapTile({required this.icon, required this.color, required this.title,
      required this.subtitle, required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(14),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(children: [
        Container(width: 36, height: 36,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color, size: 18)),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: color)),
          Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
        ])),
        Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade300),
      ])));
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow(this.label, this.value);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
      Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
    ]));
}

class _PasswordField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  const _PasswordField({required this.controller, required this.label});
  @override
  State<_PasswordField> createState() => _PasswordFieldState();
}
class _PasswordFieldState extends State<_PasswordField> {
  bool _hide = true;
  @override
  Widget build(BuildContext context) => TextField(
    controller: widget.controller,
    obscureText: _hide,
    style: const TextStyle(fontSize: 14),
    decoration: InputDecoration(
      labelText: widget.label,
      labelStyle: const TextStyle(fontSize: 13),
      suffixIcon: IconButton(
        icon: Icon(_hide ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
        onPressed: () => setState(() => _hide = !_hide)),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12)));
}

class _HelpTile extends StatelessWidget {
  final IconData icon; final String label, value;
  const _HelpTile(this.icon, this.label, this.value);
  @override
  Widget build(BuildContext context) => Row(children: [
    Container(width: 36, height: 36,
      decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
      child: Icon(icon, color: AppTheme.primary, size: 18)),
    const SizedBox(width: 12),
    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
      Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
    ]),
  ]);
}

class _AboutRow extends StatelessWidget {
  final String label, value;
  const _AboutRow(this.label, this.value);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
      Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
    ]));
}

// ── Original small widgets ────────────────────────────────────
class _HeaderChip extends StatelessWidget {
  final IconData icon; final String label;
  const _HeaderChip(this.icon, this.label);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
    decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
    child: Row(children: [
      Icon(icon, size: 13, color: Colors.white70),
      const SizedBox(width: 5),
      Text(label, style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w500)),
    ]));
}

class _StatBox extends StatelessWidget {
  final String value, label; final Color color;
  const _StatBox(this.value, this.label, this.color);
  @override
  Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(vertical: 10),
    decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(10)),
    child: Column(children: [
      Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
      const SizedBox(height: 2),
      Text(label, style: TextStyle(fontSize: 10, color: color.withOpacity(0.8))),
    ])));
}

class _InfoTile extends StatelessWidget {
  final IconData icon; final String label, value;
  const _InfoTile(this.icon, this.label, this.value);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    child: Row(children: [
      Icon(icon, size: 20, color: AppTheme.primary),
      const SizedBox(width: 14),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500)),
      ]),
    ]));
}

class _ActionTile extends StatelessWidget {
  final IconData icon; final String title, subtitle; final VoidCallback onTap;
  const _ActionTile(this.icon, this.title, this.subtitle, {required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(children: [
        Icon(icon, size: 20, color: AppTheme.primary),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
          Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
        ])),
        Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade300),
      ])));
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const Divider(height: 1, indent: 50, color: AppTheme.border);
}

class _ClassReminderStatus extends StatelessWidget {
  final int scheduledCount;
  final VoidCallback onTestReminder;

  const _ClassReminderStatus({
    required this.scheduledCount,
    required this.onTestReminder,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(48, 0, 12, 8),
      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primary.withOpacity(0.18)),
      ),
      child: Row(
        children: [
          const Icon(Icons.event_available_outlined,
              size: 16, color: AppTheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              scheduledCount > 0
                  ? '$scheduledCount class reminders scheduled this week'
                  : 'Reminders will appear once a routine is uploaded',
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textPrimary,
                height: 1.4,
              ),
            ),
          ),
          TextButton(
            onPressed: onTestReminder,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              minimumSize: const Size(0, 32),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              foregroundColor: AppTheme.primary,
            ),
            child: const Text('Send test',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
