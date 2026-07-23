import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/app_theme.dart';
import '../../services/api_client.dart';

class EditPersonalDetailsScreen extends StatefulWidget {
  const EditPersonalDetailsScreen({super.key});

  @override
  State<EditPersonalDetailsScreen> createState() =>
      _EditPersonalDetailsScreenState();
}

class _EditPersonalDetailsScreenState
    extends State<EditPersonalDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _loading = true, _saving = false;

  final _genderCtrl = TextEditingController();
  final _bloodGroupCtrl = TextEditingController();
  final _regNumCtrl = TextEditingController();
  final _univIdCtrl = TextEditingController();
  final _facultyIdCtrl = TextEditingController();
  final _guardianNameCtrl = TextEditingController();
  final _guardianContactCtrl = TextEditingController();
  String _admissionDate = '';
  List<Map<String, dynamic>> _faculties = [];

  static const _genders = ['Male', 'Female', 'Others'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _genderCtrl.dispose();
    _bloodGroupCtrl.dispose();
    _regNumCtrl.dispose();
    _univIdCtrl.dispose();
    _facultyIdCtrl.dispose();
    _guardianNameCtrl.dispose();
    _guardianContactCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/api/student/profile'),
        ApiClient.get('/api/faculties/all'),
      ]);
      final data = results[0]['data'] as Map<String, dynamic>;
      final facData = results[1]['data'] as List<dynamic>;
      _faculties = facData.cast<Map<String, dynamic>>();

      _genderCtrl.text = data['gender'] as String? ?? '';
      _bloodGroupCtrl.text = data['bloodGroup'] as String? ?? '';
      _regNumCtrl.text = data['regNum'] as String? ?? '';
      _univIdCtrl.text = data['univId'] as String? ?? '';
      _facultyIdCtrl.text = data['facultyId'] as String? ?? '';
      _guardianNameCtrl.text = data['guardianName'] as String? ?? '';
      _guardianContactCtrl.text = data['guardianContact'] as String? ?? '';
      _admissionDate = data['admissionDate'] as String? ?? '';
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ApiClient.put('/api/student/profile', body: {
        'gender': _genderCtrl.text.trim(),
        'bloodGroup': _bloodGroupCtrl.text.trim(),
        'regNum': _regNumCtrl.text.trim(),
        'univId': _univIdCtrl.text.trim(),
        'facultyId': _facultyIdCtrl.text.trim(),
        'guardianName': _guardianNameCtrl.text.trim(),
        'guardianContact': _guardianContactCtrl.text.trim(),
        'admissionDate': _admissionDate,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully'),
          backgroundColor: AppTheme.success,
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update: $e'),
          backgroundColor: AppTheme.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    DateTime? initial;
    if (_admissionDate.isNotEmpty) {
      initial = DateTime.tryParse(_admissionDate);
    }
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? now,
      firstDate: DateTime(2000),
      lastDate: now,
    );
    if (picked != null) {
      setState(
        () => _admissionDate =
            '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        title: const Text('Edit Personal Details'),
        elevation: 0,
        backgroundColor: AppTheme.surface,
        foregroundColor: AppTheme.textPrimary,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _sectionCard(
                      'Personal Information',
                      Icons.person_outline,
                      [
                        _buildDropdownField(
                          'Gender',
                          _genderCtrl,
                          _genders,
                          icon: Icons.wc,
                        ),
                        _buildTextField(
                          'Blood Group',
                          _bloodGroupCtrl,
                          hint: 'e.g. A+, B+, O-',
                          icon: Icons.bloodtype,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _sectionCard(
                      'Academic Details',
                      Icons.school,
                      [
                        _buildTextField(
                          'Registration Number',
                          _regNumCtrl,
                          hint: 'e.g. REG-12345',
                          icon: Icons.badge_outlined,
                          maxLength: 15,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(r'[a-zA-Z0-9-]'),
                            ),
                          ],
                          validator: (v) {
                            if (v != null && v.isNotEmpty) {
                              if (v.length > 15) {
                                return 'Max 15 characters';
                              }
                              if (!RegExp(r'^[a-zA-Z0-9-]+$').hasMatch(v)) {
                                return 'Only letters, numbers and hyphens';
                              }
                            }
                            return null;
                          },
                        ),
                        _buildTextField(
                          'University ID',
                          _univIdCtrl,
                          hint: 'e.g. 23-ABCD-1234/BCS',
                          icon: Icons.credit_card_outlined,
                          maxLength: 30,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(r'[a-zA-Z0-9\-\/]'),
                            ),
                          ],
                          validator: (v) {
                            if (v != null && v.isNotEmpty) {
                              if (v.length > 30) {
                                return 'Max 30 characters';
                              }
                              if (!RegExp(r'^[a-zA-Z0-9\-\/]+$').hasMatch(v)) {
                                return 'Only letters, numbers, hyphens and slashes';
                              }
                            }
                            return null;
                          },
                        ),
                        _buildDateField(),
                        _buildDropdownField(
                          'Faculty',
                          _facultyIdCtrl,
                          _faculties.map((f) => f['id'] as String).toList(),
                          displayMap: {
                            for (final f in _faculties)
                              f['id'] as String: f['name'] as String,
                          },
                          icon: Icons.account_balance_outlined,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _sectionCard(
                      'Guardian Details',
                      Icons.contacts_outlined,
                      [
                        _buildTextField(
                          'Guardian Name',
                          _guardianNameCtrl,
                          hint: 'Full name of guardian',
                          icon: Icons.person_outline,
                          maxLength: 50,
                          validator: (v) {
                            if (v != null && v.length > 50) {
                              return 'Max 50 characters';
                            }
                            return null;
                          },
                        ),
                        _buildTextField(
                          'Guardian Contact',
                          _guardianContactCtrl,
                          hint: 'Phone number',
                          icon: Icons.phone_outlined,
                          keyboardType: TextInputType.phone,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(r'[0-9+\-]'),
                            ),
                          ],
                          validator: (v) {
                            if (v != null && v.isNotEmpty) {
                              if (!RegExp(r'^[0-9+\-]+$').hasMatch(v)) {
                                return 'Only numbers, + and - allowed';
                              }
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _saving ? null : _save,
                        icon: _saving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.check_circle_outline),
                        label: Text(
                          _saving ? 'Saving...' : 'Save Changes',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _sectionCard(
      String title, IconData icon, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        boxShadow: const [
          BoxShadow(
            color: Color.fromARGB(10, 0, 0, 0),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Row(
              children: [
                Icon(icon, size: 18, color: AppTheme.primary),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppTheme.border),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController ctrl, {
    String? hint,
    IconData? icon,
    int? maxLength,
    List<TextInputFormatter>? inputFormatters,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: ctrl,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: icon != null ? Icon(icon, size: 20) : null,
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
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          counterText: '',
        ),
        inputFormatters: inputFormatters,
        keyboardType: keyboardType,
        maxLength: maxLength,
        validator: validator,
      ),
    );
  }

  Widget _buildDropdownField(
    String label,
    TextEditingController ctrl,
    List<String> items, {
    IconData? icon,
    Map<String, String>? displayMap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DropdownButtonFormField<String>(
        initialValue: items.contains(ctrl.text) ? ctrl.text : null,
        dropdownColor: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: icon != null ? Icon(icon, size: 20) : null,
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
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
        ),
        items: items.map((item) {
          final display = displayMap?[item] ?? item;
          return DropdownMenuItem(
            value: item,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Text(display, style: const TextStyle(fontSize: 14)),
            ),
          );
        }).toList(),
        onChanged: (val) {
          if (val != null) ctrl.text = val;
        },
        isExpanded: true,
      ),
    );
  }

  Widget _buildDateField() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GestureDetector(
        onTap: _pickDate,
        child: AbsorbPointer(
          child: TextFormField(
            decoration: InputDecoration(
              labelText: 'Admission Date',
              hintText: 'Select date',
              prefixIcon:
                  const Icon(Icons.calendar_today, size: 20),
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
                borderSide:
                    const BorderSide(color: AppTheme.primary, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
            ),
            controller: TextEditingController(text: _admissionDate),
          ),
        ),
      ),
    );
  }
}
