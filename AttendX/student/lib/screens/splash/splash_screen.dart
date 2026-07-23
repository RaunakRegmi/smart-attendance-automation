import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../services/auth_service.dart';
import '../../services/api_client.dart';
import '../auth/login_screen.dart';
import '../dashboard/main_navigation.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _logoScale;
  late Animation<double> _logoFade;
  late Animation<Offset> _taglineSlide;
  late Animation<double> _taglineFade;
  late Animation<double> _glowOpacity;
  late Animation<double> _loadingFade;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    );

    _logoScale = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.5, curve: Curves.elasticOut),
      ),
    );

    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.4, curve: Curves.easeIn),
      ),
    );

    _glowOpacity = Tween<double>(begin: 0.0, end: 0.6).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.3, 0.7, curve: Curves.easeInOut),
      ),
    );

    _taglineSlide = Tween<Offset>(
      begin: const Offset(0, 24),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.5, 0.75, curve: Curves.easeOutCubic),
      ),
    );

    _taglineFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.5, 0.75, curve: Curves.easeIn),
      ),
    );

    _loadingFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.75, 1.0, curve: Curves.easeIn),
      ),
    );

    _controller.forward();
    _checkSessionAfterAnimation();
  }

  Future<void> _checkSessionAfterAnimation() async {
    await Future.delayed(const Duration(milliseconds: 3200));
    if (!mounted) return;

    final token = await ApiClient.getToken();
    if (token == null || token.isEmpty) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }

    try {
      await AuthService.getProfile();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigation()),
      );
    } catch (_) {
      await ApiClient.clearToken();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Container(
            width: double.infinity,
            height: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color.lerp(
                      AppTheme.primary,
                      AppTheme.primaryLight,
                      _controller.value.clamp(0.0, 0.5),
                    )!,
                    Color.lerp(
                      AppTheme.primaryLight,
                      AppTheme.accent,
                      (_controller.value - 0.5).clamp(0.0, 0.5),
                    )!,
                  ],
                ),
              ),
            child: Stack(
              children: [
                // Animated floating particles
                ...List.generate(20, (i) => _FloatingParticle(
                  index: i,
                  progress: _controller.value,
                )),

                // Main content
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Spacer(flex: 3),

                      // Logo icon
                      Opacity(
                        opacity: _logoFade.value,
                        child: Transform.scale(
                          scale: _logoScale.value,
                          child: _AnimatedLogo(glowOpacity: _glowOpacity.value),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Tagline
                      SlideTransition(
                        position: _taglineSlide,
                        child: FadeTransition(
                          opacity: _taglineFade,
                          child: Column(
                            children: [
                              Text(
                                'AttendX',
                                style: TextStyle(
                                  fontSize: 36,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: 3,
                                  shadows: [
                                    Shadow(
                                      color: Colors.black.withValues(alpha: 0.3),
                                      blurRadius: 20,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Smart Campus Management',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.white.withValues(alpha: 0.7),
                                  letterSpacing: 4,
                                  fontWeight: FontWeight.w300,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const Spacer(flex: 2),

                      // Loading indicator
                      FadeTransition(
                        opacity: _loadingFade,
                        child: Column(
                          children: [
                            SizedBox(
                              width: 28,
                              height: 28,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor: AlwaysStoppedAnimation(
                                  Colors.white.withValues(alpha: 0.6),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Preparing your experience...',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white.withValues(alpha: 0.4),
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const Spacer(flex: 1),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ── Animated Logo ──────────────────────────────────────────────
class _AnimatedLogo extends StatelessWidget {
  final double glowOpacity;
  const _AnimatedLogo({required this.glowOpacity});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 120,
      height: 120,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Glow ring
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withValues(alpha: 0.05),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.15 * glowOpacity),
                width: 2,
              ),
            ),
          ),

          // Inner glow
          Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.white.withValues(alpha: 0.15 * glowOpacity),
                  blurRadius: 40 * glowOpacity,
                  spreadRadius: 10 * glowOpacity,
                ),
              ],
            ),
          ),

          // Icon container
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(
              Icons.school_rounded,
              size: 44,
              color: AppTheme.primary,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Floating Particle ──────────────────────────────────────────
class _FloatingParticle extends StatelessWidget {
  final int index;
  final double progress;

  const _FloatingParticle({required this.index, required this.progress});

  @override
  Widget build(BuildContext context) {
    final seed = index * 137.508; // golden angle for distribution
    final angle = (seed * 0.01745) % (math.pi * 2);
    final radius = 80.0 + (seed % 120);
    final x = MediaQuery.of(context).size.width / 2 +
        math.cos(angle) * radius * (0.5 + 0.5 * progress);
    final y = MediaQuery.of(context).size.height -
        (progress * MediaQuery.of(context).size.height * 0.9) -
        (seed % 60);

    final opacity = (1.0 - (progress * 0.7)) * 0.5;
    final size = 2.0 + (seed % 4).toDouble();

    return Positioned(
      left: x,
      top: y,
      child: Opacity(
        opacity: opacity.clamp(0.0, 0.5),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.white.withValues(alpha: 0.3),
                blurRadius: size,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
