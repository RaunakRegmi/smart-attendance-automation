import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/app_theme.dart';
import '../../services/dashboard_provider.dart';
import '../../services/api_client.dart';

class PersonalDetailsScreen extends StatefulWidget {
  const PersonalDetailsScreen({super.key});

  @override
  State<PersonalDetailsScreen> createState() => _PersonalDetailsScreenState();
}

class _PersonalDetailsScreenState extends State<PersonalDetailsScreen> {
  Map<String, dynamic>? _profile;
  bool _loading = true;
  String? _error;
  String? _avatarUrl;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.get('/api/student/profile');
      final data = res['data'] as Map<String, dynamic>;
      final dashData = context.read<DashboardProvider>().data;
      String? avUrl;
      final raw = data['avatarUrl'] as String? ?? dashData?.avatarUrl;
      if (raw != null && raw.isNotEmpty) {
        avUrl = await ApiClient.getFullImageUrl(raw);
      }
      if (mounted) setState(() { _profile = data; _avatarUrl = avUrl; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('Personal Details'), elevation: 0),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Failed to load', style: TextStyle(color: AppTheme.error)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    child: Column(
                      children: [
                        _avatarSection(_avatarUrl, _p('name')),
                        const SizedBox(height: 16),
                        _sectionHeader('Basic Information'),
                        _infoTile('Name', _p('name')),
                        _infoTile('Email', _p('email')),
                        _infoTile('Student ID', _p('studentId')),
                        const SizedBox(height: 16),
                        _sectionHeader('Personal Information'),
                        _infoTile('Gender', _p('gender')),
                        _infoTile('Blood Group', _p('bloodGroup')),
                        _infoTile('Registration Number', _p('regNum')),
                        _infoTile('Admission Date', _p('admissionDate')),
                        _infoTile('Faculty', _p('faculty')),
                        _infoTile('Guardian Name', _p('guardianName')),
                        _infoTile('Guardian Contact', _p('guardianContact')),
                        const SizedBox(height: 16),
                        _sectionHeader('Academic Information'),
                        _infoTile('Batch', _p('batch')),
                        _infoTile('Section', _p('section')),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
    );
  }

  String _p(String key) => (_profile?[key] as String? ?? '').trim();
}

Widget _avatarSection(String? avatarUrl, String name) {
  final initials = name.isNotEmpty
      ? name.split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase()
      : '?';
  return Container(
    padding: const EdgeInsets.symmetric(vertical: 24),
    child: CircleAvatar(
      radius: 50,
      backgroundColor: AppTheme.primary,
      backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
      child: avatarUrl == null
          ? Text(initials, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: Colors.white))
          : null,
    ),
  );
}

Widget _sectionHeader(String title) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Align(
      alignment: Alignment.centerLeft,
      child: Text(title,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 0.5)),
    ),
  );
}

Widget _infoTile(String label, String value) {
  return Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: AppTheme.surface,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: AppTheme.border),
    ),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value.isNotEmpty ? value : '—',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: value.isNotEmpty ? AppTheme.textPrimary : AppTheme.textSecondary,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    ),
  );
}
