import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_theme.dart';

Widget _base({required Widget child}) => Shimmer.fromColors(
  baseColor: AppTheme.shimmerBase,
  highlightColor: AppTheme.shimmerHighlight,
  child: child,
);

Widget skeletonLine({double? width, double height = 14, double borderRadius = 6}) =>
  _base(child: Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: AppTheme.shimmerBase,
      borderRadius: BorderRadius.circular(borderRadius),
    ),
  ));

Widget skeletonCircle(double radius) =>
  _base(child: Container(
    width: radius * 2,
    height: radius * 2,
    decoration: BoxDecoration(
      color: AppTheme.shimmerBase,
      shape: BoxShape.circle,
    ),
  ));

Widget skeletonCard({double height = 100, double borderRadius = 16}) =>
  _base(child: Container(
    height: height,
    decoration: BoxDecoration(
      color: AppTheme.shimmerBase,
      borderRadius: BorderRadius.circular(borderRadius),
    ),
  ));

Widget skeletonBlock({double? width, double height = 60, double borderRadius = 12}) =>
  _base(child: Container(
    width: width,
    height: height,
    decoration: BoxDecoration(
      color: AppTheme.shimmerBase,
      borderRadius: BorderRadius.circular(borderRadius),
    ),
  ));

Widget dashboardSkeleton() => SingleChildScrollView(
  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
  child: Column(children: [
    // App bar row
    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Row(children: [
        skeletonCircle(18),
        const SizedBox(width: 8),
        skeletonLine(width: 80, height: 18),
      ]),
      skeletonBlock(width: 40, height: 40, borderRadius: 10),
    ]),
    const SizedBox(height: 20),

    // Greeting lines
    skeletonLine(width: 100, height: 11),
    const SizedBox(height: 4),
    skeletonLine(width: 120, height: 28),
    const SizedBox(height: 24),

    // Attendance card
    skeletonCard(height: 240),
    const SizedBox(height: 16),

    // Routine alert
    skeletonCard(height: 140),
    const SizedBox(height: 16),

    // Weekly overview bar chart
    skeletonCard(height: 180),
    const SizedBox(height: 20),

    // Section title
    skeletonLine(width: 100, height: 11),
    const SizedBox(height: 12),

    // Log items
    skeletonCard(height: 70),
    const SizedBox(height: 10),
    skeletonCard(height: 70),
    const SizedBox(height: 10),
    skeletonCard(height: 70),
  ]),
);

Widget attendanceSkeleton() => SingleChildScrollView(
  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    skeletonLine(width: 120, height: 24),
    const SizedBox(height: 4),
    skeletonLine(width: 160, height: 13),
    const SizedBox(height: 16),

    // Summary cards row
    Row(children: [
      Expanded(child: skeletonCard(height: 80, borderRadius: 12)),
      const SizedBox(width: 10),
      Expanded(child: skeletonCard(height: 80, borderRadius: 12)),
      const SizedBox(width: 10),
      Expanded(child: skeletonCard(height: 80, borderRadius: 12)),
    ]),
    const SizedBox(height: 20),

    // Tab bar skeleton
    skeletonBlock(height: 40, borderRadius: 12),
    const SizedBox(height: 20),

    // Subject cards
    skeletonCard(height: 90),
    const SizedBox(height: 10),
    skeletonCard(height: 90),
    const SizedBox(height: 10),
    skeletonCard(height: 90),
  ]),
);

Widget routineSkeleton() => SingleChildScrollView(
  padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    skeletonLine(width: 140, height: 24),
    const SizedBox(height: 4),
    skeletonLine(width: 160, height: 13),
    const SizedBox(height: 20),

    // Day selector chips
    SizedBox(
      height: 60,
      child: ListView(scrollDirection: Axis.horizontal, children: [
        skeletonBlock(width: 60, height: 60, borderRadius: 12),
        const SizedBox(width: 10),
        skeletonBlock(width: 60, height: 60, borderRadius: 12),
        const SizedBox(width: 10),
        skeletonBlock(width: 60, height: 60, borderRadius: 12),
        const SizedBox(width: 10),
        skeletonBlock(width: 60, height: 60, borderRadius: 12),
        const SizedBox(width: 10),
        skeletonBlock(width: 60, height: 60, borderRadius: 12),
        const SizedBox(width: 10),
        skeletonBlock(width: 60, height: 60, borderRadius: 12),
      ]),
    ),
    const SizedBox(height: 16),

    // Class count
    skeletonLine(width: 120, height: 12),
    const SizedBox(height: 20),

    // Class cards
    skeletonCard(height: 120),
    const SizedBox(height: 12),
    skeletonCard(height: 120),
    const SizedBox(height: 12),
    skeletonCard(height: 120),
  ]),
);

Widget reportSkeleton() => SingleChildScrollView(
  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
  child: Column(children: [
    // Header ring + stats
    skeletonCard(height: 160),
    const SizedBox(height: 16),

    // Overview grid - 3 cards in 2 rows
    Row(children: [
      Expanded(child: skeletonCard(height: 80, borderRadius: 12)),
      const SizedBox(width: 10),
      Expanded(child: skeletonCard(height: 80, borderRadius: 12)),
    ]),
    const SizedBox(height: 10),
    Row(children: [
      Expanded(child: skeletonCard(height: 80, borderRadius: 12)),
      const SizedBox(width: 10),
      Expanded(child: skeletonCard(height: 80, borderRadius: 12)),
    ]),
    const SizedBox(height: 20),

    // Advice card
    skeletonCard(height: 100),
    const SizedBox(height: 20),

    // Subject breakdown header
    skeletonLine(width: 160, height: 16),
    const SizedBox(height: 12),

    // Subject cards
    skeletonCard(height: 60),
    const SizedBox(height: 10),
    skeletonCard(height: 60),
    const SizedBox(height: 10),
    skeletonCard(height: 60),
  ]),
);

Widget profileSkeleton() => SingleChildScrollView(
  child: Column(children: [
    // Header
    Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      decoration: const BoxDecoration(
        color: AppTheme.primary,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          skeletonLine(width: 80, height: 22),
          skeletonBlock(width: 40, height: 40, borderRadius: 10),
        ]),
        const SizedBox(height: 20),
        Shimmer.fromColors(
          baseColor: Colors.white.withOpacity(0.3),
          highlightColor: Colors.white.withOpacity(0.6),
          child: skeletonCircle(45),
        ),
        const SizedBox(height: 14),
        Shimmer.fromColors(
          baseColor: Colors.white.withOpacity(0.3),
          highlightColor: Colors.white.withOpacity(0.6),
          child: skeletonLine(width: 150, height: 20),
        ),
        const SizedBox(height: 4),
        Shimmer.fromColors(
          baseColor: Colors.white.withOpacity(0.3),
          highlightColor: Colors.white.withOpacity(0.6),
          child: skeletonLine(width: 200, height: 13),
        ),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Shimmer.fromColors(
            baseColor: Colors.white.withOpacity(0.3),
            highlightColor: Colors.white.withOpacity(0.6),
            child: skeletonBlock(width: 100, height: 26, borderRadius: 20),
          ),
          const SizedBox(width: 12),
          Shimmer.fromColors(
            baseColor: Colors.white.withOpacity(0.3),
            highlightColor: Colors.white.withOpacity(0.6),
            child: skeletonBlock(width: 100, height: 26, borderRadius: 20),
          ),
        ]),
      ]),
    ),
    const SizedBox(height: 20),
    Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(children: [
        skeletonCard(height: 100),
        const SizedBox(height: 16),
        skeletonCard(height: 200),
        const SizedBox(height: 16),
        skeletonCard(height: 100),
        const SizedBox(height: 16),
        skeletonCard(height: 220),
        const SizedBox(height: 16),
        skeletonCard(height: 56),
      ]),
    ),
  ]),
);

Widget personalDetailsSkeleton() => SingleChildScrollView(
  padding: const EdgeInsets.all(16),
  child: Column(children: [
    // Info tiles
    ...List.generate(12, (_) => Padding(
      padding: const EdgeInsets.only(bottom: 1),
      child: Row(children: [
        skeletonCircle(10),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          skeletonLine(width: 80, height: 11),
          const SizedBox(height: 4),
          skeletonLine(height: 14),
        ])),
      ]),
    )),
  ]),
);

Widget editDetailsSkeleton() => SingleChildScrollView(
  padding: const EdgeInsets.all(16),
  child: Column(children: [
    ...List.generate(6, (_) => Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: skeletonCard(height: 56, borderRadius: 12),
    )),
  ]),
);
