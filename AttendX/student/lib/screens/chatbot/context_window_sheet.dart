// lib/screens/chatbot/context_window_sheet.dart
//
// "What I remember" bottom sheet — shows the live context window: a token meter
// (used vs the model's num_ctx), how many messages are in context, and the
// running summary of older turns.

import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import 'chat_service.dart';

Future<void> showContextWindowSheet(BuildContext context, ChatContextInfo info) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _ContextWindowBody(info: info),
  );
}

class _ContextWindowBody extends StatelessWidget {
  final ChatContextInfo info;
  const _ContextWindowBody({required this.info});

  Color _levelColor(double pct) {
    if (pct < 60) return AppTheme.success;
    if (pct < 85) return AppTheme.warning;
    return AppTheme.error;
  }

  @override
  Widget build(BuildContext context) {
    final pct = info.percentUsed.clamp(0, 100).toDouble();
    final color = _levelColor(pct);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Context window',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppTheme.textPrimary)),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: pct / 100,
              minHeight: 8,
              backgroundColor: AppTheme.background,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${info.used} / ${info.numCtx} tokens',
                  style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
              Text('${pct.toStringAsFixed(1)}%',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
            ],
          ),
          const SizedBox(height: 14),
          _pill('🧠 ${info.messageCount} messages in context'),
          const SizedBox(height: 16),
          const Text('What I remember',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppTheme.textSecondary)),
          const SizedBox(height: 6),
          Text(
            (info.summary != null && info.summary!.isNotEmpty)
                ? info.summary!
                : 'Older turns get summarised here once the conversation grows — so nothing is forgotten.',
            style: const TextStyle(fontSize: 13, height: 1.45, color: AppTheme.textPrimary),
          ),
        ],
      ),
    );
  }

  Widget _pill(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppTheme.primary.withOpacity(0.08),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(text,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primary)),
      );
}
