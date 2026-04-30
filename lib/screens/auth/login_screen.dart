import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../dashboard/main_navigation.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocusNode = FocusNode();
  final _passwordFocusNode = FocusNode();
  bool _obscurePassword = true;
  bool _rememberDevice = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    // Dismiss keyboard first
    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    setState(() => _isLoading = false);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const MainNavigation()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // Tap outside fields to dismiss keyboard
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: AppTheme.surface,
        // resizeToAvoidBottomInset keeps layout intact when keyboard opens
        resizeToAvoidBottomInset: true,
        body: SafeArea(
          child: Form(
            key: _formKey,
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 48),

                  // Logo
                  Row(
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.school, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'AttendX',
                        style: TextStyle(
                          fontSize: 20, fontWeight: FontWeight.w700,
                          color: AppTheme.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),

                  const Text(
                    'Welcome Back',
                    style: TextStyle(
                      fontSize: 30, fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Please enter your credentials to access the dashboard.',
                    style: TextStyle(fontSize: 14, color: AppTheme.textSecondary, height: 1.5),
                  ),
                  const SizedBox(height: 36),

                  // ── Email field ──────────────────────────────────────────
                  const Text(
                    'INSTITUTIONAL EMAIL',
                    style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary, letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _emailController,
                    focusNode: _emailFocusNode,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    enableSuggestions: true,
                    onTap: () => _emailFocusNode.requestFocus(),
                    onSubmitted: (_) =>
                        FocusScope.of(context).requestFocus(_passwordFocusNode),
                    style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'name@university.edu',
                      hintStyle: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                      prefixIcon: const Icon(Icons.email_outlined, color: AppTheme.textSecondary, size: 20),
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.primary, width: 2),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Password field ───────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'PASSWORD',
                        style: TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary, letterSpacing: 1.0,
                        ),
                      ),
                      TextButton(
                        onPressed: () {},
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: const Size(0, 0),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'Forgot Password?',
                          style: TextStyle(
                            fontSize: 12, color: AppTheme.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _passwordController,
                    focusNode: _passwordFocusNode,
                    obscureText: _obscurePassword,
                    textInputAction: TextInputAction.done,
                    onTap: () => _passwordFocusNode.requestFocus(),
                    onSubmitted: (_) => _handleLogin(),
                    style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      hintStyle: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                      prefixIcon: const Icon(Icons.lock_outlined, color: AppTheme.textSecondary, size: 20),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          color: AppTheme.textSecondary, size: 20,
                        ),
                        onPressed: () =>
                            setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.primary, width: 2),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Remember device ──────────────────────────────────────
                  GestureDetector(
                    onTap: () => setState(() => _rememberDevice = !_rememberDevice),
                    behavior: HitTestBehavior.opaque,
                    child: Row(
                      children: [
                        SizedBox(
                          width: 20, height: 20,
                          child: Checkbox(
                            value: _rememberDevice,
                            onChanged: (v) =>
                                setState(() => _rememberDevice = v ?? false),
                            activeColor: AppTheme.primary,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4)),
                            side: const BorderSide(color: AppTheme.textSecondary),
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'Remember this device for 30 days',
                          style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // ── Sign In button ───────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        disabledBackgroundColor: AppTheme.primary.withOpacity(0.6),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Sign In to Dashboard',
                                  style: TextStyle(
                                    fontSize: 15, fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_forward,
                                    color: Colors.white, size: 18),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 36),

                  // ── Footer ───────────────────────────────────────────────
                  Center(
                    child: Column(
                      children: [
                        const Text(
                          'Encountering technical difficulties?',
                          style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _footerLink(Icons.support_agent_outlined, 'Contact Admin'),
                            const SizedBox(width: 24),
                            _footerLink(Icons.menu_book_outlined, 'System Guide'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _footerLink(IconData icon, String label) {
    return InkWell(
      onTap: () {},
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Row(
          children: [
            Icon(icon, size: 14, color: AppTheme.primary),
            const SizedBox(width: 4),
            Text(label,
                style: const TextStyle(
                  fontSize: 12, color: AppTheme.primary,
                  fontWeight: FontWeight.w500,
                )),
          ],
        ),
      ),
    );
  }
}
