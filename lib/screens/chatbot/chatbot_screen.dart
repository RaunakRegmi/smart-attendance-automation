// lib/screens/chatbot/chatbot_screen.dart
//
// Bug fixes & improvements in this version:
//
// FIX 1 — Removed unused TickerProviderStateMixin from _ChatbotScreenState.
//          The state owns no AnimationController; _TypingDots has its own vsync.
//          Using it here caused a misleading lint warning and wasted resources.
//
// FIX 2 — mounted guard after every await: without `if (!mounted) return`,
//          navigating away mid-request called setState on a disposed widget
//          and threw a fatal "setState() called after dispose()" error.
//
// FIX 3 — Typing bubble stuck forever: no try/catch meant any exception from
//          ChatService.sendMessage() left _isLoading=true and the typing bubble
//          permanently on screen, freezing the input bar.
//
// FIX 4 — Enter key ignored on Android: maxLines:null + TextInputAction.send
//          conflicts on many Android keyboards — Enter inserts a newline instead
//          of triggering onSubmitted. Fixed with minLines:1 / maxLines:5.
//
// FIX 5 — Enter key bypassed loading guard: onSubmitted was always wired up,
//          so pressing Enter while the AI was still replying queued a duplicate
//          request. Fixed by passing null when _isLoading is true.
//
// FIX 6 — Timestamp shown on every message: old logic showed a timestamp on
//          every sender-role change. Now only on the first message and after a
//          5-minute gap (standard messaging app behaviour).
//
// FIX 7 — Misleading clear icon + no confirm: Icons.refresh_outlined looks like
//          "reload", not "delete". Replaced with Icons.delete_outline and added
//          a confirm dialog to prevent accidental data loss.
//
// FIX 8 — Send button always active: button appeared enabled even with an empty
//          field. Added a text listener so it dims correctly when nothing is typed.
 
import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../models/message.dart';
import 'chat_service.dart';
 
class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});
 
  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}
 
// FIX 1: plain State — no mixin needed here
class _ChatbotScreenState extends State<ChatbotScreen> {
  final List<ChatMessage> _messages = [];
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();
 
  // FIX 8: tracks whether the field has text without rebuilding entire tree
  bool _hasText = false;
  bool _isLoading = false;
 
  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final hasText = _controller.text.trim().isNotEmpty;
      if (hasText != _hasText) setState(() => _hasText = hasText);
    });
  }
 
  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }
 
  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }
 
  Future<void> _sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isLoading) return;
 
    _controller.clear();
    setState(() => _hasText = false);
 
    setState(() {
      _messages.add(ChatMessage.fromUser(trimmed));
      _isLoading = true;
      _messages.add(ChatMessage.typingIndicator());
    });
    _scrollToBottom();
 
    // FIX 3: try/catch so typing bubble never gets stuck
    try {
      final reply = await ChatService.sendMessage(trimmed);
      // FIX 2: guard after every await
      if (!mounted) return;
      setState(() {
        _messages.removeWhere((m) => m.isTyping);
        _messages.add(ChatMessage.fromAssistant(reply));
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _messages.removeWhere((m) => m.isTyping);
        _messages.add(ChatMessage.fromAssistant(
          'Something went wrong. Please check your connection and try again.',
        ));
        _isLoading = false;
      });
    }
    _scrollToBottom();
  }
 
  // FIX 7: confirm dialog before clearing
  Future<void> _confirmClearChat() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Clear conversation?',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        content: const Text(
          'All messages will be deleted. This cannot be undone.',
          style: TextStyle(fontSize: 14, color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppTheme.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Clear',
                style: TextStyle(
                    color: AppTheme.error, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      setState(() => _messages.clear());
    }
  }
 
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: _messages.isEmpty
                  ? _buildEmptyState()
                  : _buildMessageList(),
            ),
            _buildInputBar(),
          ],
        ),
      ),
    );
  }
 
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        border: Border(bottom: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.school, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('AttendX AI Assistant',
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary)),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                          color: AppTheme.success, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 5),
                    const Text('Online ',
                        style: TextStyle(
                            fontSize: 11, color: AppTheme.textSecondary)),
                  ],
                ),
              ],
            ),
          ),
          // FIX 7: delete icon + confirm dialog
          if (_messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline,
                  size: 20, color: AppTheme.textSecondary),
              tooltip: 'Clear conversation',
              onPressed: _confirmClearChat,
            ),
        ],
      ),
    );
  }
 
  Widget _buildEmptyState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primary.withOpacity(0.35),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(Icons.school, color: Colors.white, size: 40),
          ),
          const SizedBox(height: 20),
          const Text('Ask AttendX AI',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          const Text(
            'Your intelligent academic assistant.\nAsk about attendance, schedule, policies, and more.',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 13, color: AppTheme.textSecondary, height: 1.6),
          ),
          const SizedBox(height: 32),
          Row(
            children: [
              _CapabilityCard(
                icon: Icons.fact_check_outlined,
                color: AppTheme.primary,
                title: 'Attendance',
                subtitle: 'Check your %\nand eligibility',
              ),
              const SizedBox(width: 10),
              _CapabilityCard(
                icon: Icons.calendar_today_outlined,
                color: AppTheme.accent,
                title: 'Schedule',
                subtitle: 'Today\'s classes\nand timetable',
              ),
              const SizedBox(width: 10),
              _CapabilityCard(
                icon: Icons.policy_outlined,
                color: AppTheme.warning,
                title: 'Policy',
                subtitle: 'Rules and\nrequirements',
              ),
            ],
          ),
          const SizedBox(height: 28),
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('SUGGESTED QUESTIONS',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textSecondary,
                    letterSpacing: 1.0)),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ChatService.suggestedQuestions
                .map((q) => _SuggestionChip(
                      label: q,
                      onTap: () => _sendMessage(q),
                    ))
                .toList(),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
 
  Widget _buildMessageList() {
    return GestureDetector(
      onTap: () => _focusNode.unfocus(),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        itemCount: _messages.length,
        itemBuilder: (context, index) {
          final msg = _messages[index];
          final isUser = msg.role == MessageRole.user;
          // FIX 6: only show timestamp after 5-min gap
          final showTimestamp = !msg.isTyping && _shouldShowTimestamp(index);
 
          return Column(
            children: [
              if (showTimestamp)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Text(
                    _formatTimestamp(msg.timestamp),
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textSecondary),
                  ),
                ),
              isUser
                  ? _UserBubble(message: msg)
                  : _AssistantBubble(message: msg),
              const SizedBox(height: 4),
            ],
          );
        },
      ),
    );
  }
 
  // FIX 6: show only at start or after >=5 minute silence
  bool _shouldShowTimestamp(int index) {
    if (index == 0) return true;
    return _messages[index].timestamp
            .difference(_messages[index - 1].timestamp)
            .inMinutes >=
        5;
  }
 
  String _formatTimestamp(DateTime dt) {
    final now = DateTime.now();
    final isToday =
        dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final hour12 =
        dt.hour == 0 ? 12 : dt.hour > 12 ? dt.hour - 12 : dt.hour;
    final min = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final time = '$hour12:$min $period';
    return isToday ? time : 'Yesterday $time';
  }
 
  Widget _buildInputBar() {
    // FIX 8: only active when there is text and not loading
    final canSend = _hasText && !_isLoading;
 
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Container(
              constraints: const BoxConstraints(maxHeight: 120),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.border),
              ),
              // FIX 4 & 5: minLines/maxLines + null onSubmitted when loading
              child: TextField(
                controller: _controller,
                focusNode: _focusNode,
                minLines: 1,
                maxLines: 5,
                textInputAction: TextInputAction.send,
                onSubmitted: _isLoading ? null : _sendMessage,
                style: const TextStyle(
                    fontSize: 14, color: AppTheme.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Ask about attendance, schedule...',
                  hintStyle: TextStyle(
                      color: AppTheme.textSecondary, fontSize: 14),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: canSend
                  ? AppTheme.primary
                  : AppTheme.primary.withOpacity(0.4),
              borderRadius: BorderRadius.circular(23),
            ),
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(23),
              child: InkWell(
                borderRadius: BorderRadius.circular(23),
                onTap: canSend ? () => _sendMessage(_controller.text) : null,
                child: Center(
                  child: _isLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(Icons.send_rounded,
                          color: Colors.white, size: 20),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
 
class _UserBubble extends StatelessWidget {
  final ChatMessage message;
  const _UserBubble({required this.message});
 
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.72),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(18),
                  topRight: Radius.circular(18),
                  bottomLeft: Radius.circular(18),
                  bottomRight: Radius.circular(4),
                ),
              ),
              child: Text(message.text,
                  style: const TextStyle(
                      fontSize: 14, color: Colors.white, height: 1.5)),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child:
                const Icon(Icons.person, size: 16, color: AppTheme.primary),
          ),
        ],
      ),
    );
  }
}
 
class _AssistantBubble extends StatelessWidget {
  final ChatMessage message;
  const _AssistantBubble({required this.message});
 
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: AppTheme.primary, // AttendX navy — no gradient
              borderRadius: BorderRadius.circular(8), // same as AttendX logo
            ),
            child: const Icon(Icons.school, size: 15, color: Colors.white),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.72),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(18),
                  bottomLeft: Radius.circular(18),
                  bottomRight: Radius.circular(18),
                ),
                border: Border.all(color: AppTheme.border),
              ),
              child: message.isTyping
                  ? const _TypingDots()
                  : Text(message.text,
                      style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.textPrimary,
                          height: 1.6)),
            ),
          ),
        ],
      ),
    );
  }
}
 
class _TypingDots extends StatefulWidget {
  const _TypingDots();
 
  @override
  State<_TypingDots> createState() => _TypingDotsState();
}
 
class _TypingDotsState extends State<_TypingDots>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
 
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }
 
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
 
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 44,
      height: 20,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (_, __) => Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (i) {
            final delay = i * 0.3;
            final value = (_controller.value - delay).clamp(0.0, 1.0);
            final opacity = value < 0.5 ? value * 2 : (1 - value) * 2;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Opacity(
                opacity: opacity.clamp(0.3, 1.0),
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                      color: AppTheme.primary, shape: BoxShape.circle),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
 
class _CapabilityCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
 
  const _CapabilityCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
  });
 
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.07),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 8),
            Text(title,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: color)),
            const SizedBox(height: 4),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 10,
                    color: AppTheme.textSecondary,
                    height: 1.4)),
          ],
        ),
      ),
    );
  }
}
 
class _SuggestionChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
 
  const _SuggestionChip({required this.label, required this.onTap});
 
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.primary.withOpacity(0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.chat_bubble_outline,
                size: 13, color: AppTheme.primary),
            const SizedBox(width: 6),
            Text(label,
                style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.primary,
                    fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}