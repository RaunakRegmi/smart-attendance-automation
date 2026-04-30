import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../utils/mock_data.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = MockData.currentUser;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Profile Header
              Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(28),
                    bottomRight: Radius.circular(28),
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Profile', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white)),
                        IconButton(
                          icon: const Icon(Icons.settings_outlined, color: Colors.white70),
                          onPressed: () {},
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        Container(
                          width: 90, height: 90,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white.withOpacity(0.4), width: 3),
                          ),
                          child: const Icon(Icons.person, size: 50, color: Colors.white),
                        ),
                        Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                            color: AppTheme.accent,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.edit, size: 13, color: Colors.white),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(user.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text(user.email, style: const TextStyle(fontSize: 13, color: Colors.white70)),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _HeaderChip(Icons.badge_outlined, user.studentId),
                        const SizedBox(width: 12),
                        _HeaderChip(Icons.school_outlined, user.semester),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Attendance summary
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Attendance Summary', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          _StatBox('85%', 'Overall', AppTheme.primary),
                          const SizedBox(width: 10),
                          _StatBox('7', 'Subjects', AppTheme.accent),
                          const SizedBox(width: 10),
                          _StatBox('2', 'At Risk', AppTheme.error),
                          const SizedBox(width: 10),
                          _StatBox('TOP 10%', 'Rank', AppTheme.warning),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Info section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    children: [
                      _InfoTile(Icons.account_circle_outlined, 'Full Name', user.name),
                      _Divider(),
                      _InfoTile(Icons.email_outlined, 'Email', user.email),
                      _Divider(),
                      _InfoTile(Icons.badge_outlined, 'Student ID', user.studentId),
                      _Divider(),
                      _InfoTile(Icons.business_outlined, 'Department', user.department),
                      _Divider(),
                      _InfoTile(Icons.layers_outlined, 'Semester', user.semester),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Settings section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    children: [
                      _ActionTile(Icons.notifications_outlined, 'Notifications', 'Manage alerts', onTap: () {}),
                      _Divider(),
                      _ActionTile(Icons.lock_outline, 'Change Password', 'Update credentials', onTap: () {}),
                      _Divider(),
                      _ActionTile(Icons.help_outline, 'Help & Support', 'Contact admin or get guidance', onTap: () {}),
                      _Divider(),
                      _ActionTile(Icons.info_outline, 'About AttendX', 'Version 1.0.0', onTap: () {}),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Logout
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                        (route) => false,
                      );
                    },
                    icon: const Icon(Icons.logout, color: AppTheme.error),
                    label: const Text('Sign Out', style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.w600)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.error),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 28),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _HeaderChip(this.icon, this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Icon(icon, size: 13, color: Colors.white70),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String value, label;
  final Color color;
  const _StatBox(this.value, this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 10, color: color.withOpacity(0.8))),
          ],
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _InfoTile(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.primary),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade400, fontWeight: FontWeight.w500)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w500)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  const _ActionTile(this.icon, this.title, this.subtitle, {required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: AppTheme.primary),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
                  Text(subtitle, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                ],
              ),
            ),
            Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade300),
          ],
        ),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Divider(height: 1, indent: 50, color: AppTheme.border);
  }
}
