// lib/screens/chatbot/chatbot_screen.dart
//
// ─────────────────────────────────────────────────────────────
// THE MAIN CHATBOT SCREEN
// This is the "Ask Campus AI" screen. It has:
//
//   1. Header          — title, subtitle, AI avatar
//   2. Message list    — scrollable list of chat bubbles
//   3. Empty state     — suggestion chips when no messages yet
//   4. Typing bubble   — animated dots while AI is "thinking"
//   5. Input bar       — text field + send button at bottom
// ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../models/message.dart';
import 'chat_service.dart';

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen>
    with TickerProviderStateMixin {
  // Holds every message in the conversation
  final List<ChatMessage> _messages = [];

  // Controls the text input field
  final TextEditingController _controller = TextEditingController();

  // Used to auto-scroll to the bottom when new messages arrive
  final ScrollController _scrollController = ScrollController();

  // Focus node keeps the keyboard from being dismissed unexpectedly
  final FocusNode _focusNode = FocusNode();

  // True while waiting for AI reply → disables send button
  bool _isLoading = false;

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // ── Auto-scroll to bottom after new message is added ─────────
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

  // ── Called when user taps Send or presses Enter ───────────────
  Future<void> _sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isLoading) return;

    // 1. Clear the input field immediately
    _controller.clear();

    // 2. Add the user's message bubble
    setState(() {
      _messages.add(ChatMessage.fromUser(trimmed));
      _isLoading = true;
      // 3. Add the animated "typing" bubble while AI thinks
      _messages.add(ChatMessage.typingIndicator());
    });
    _scrollToBottom();

    // 4. Ask the service for a reply (mock or real API)
    final reply = await ChatService.sendMessage(trimmed);

    // 5. Replace typing bubble with the actual AI reply
    setState(() {
      _messages.removeWhere((m) => m.isTyping);
      _messages.add(ChatMessage.fromAssistant(reply));
      _isLoading = false;
    });
    _scrollToBottom();
  }

  // ─────────────────────────────────────────────────────────────
  // BUILD
  // ─────────────────────────────────────────────────────────────
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

  // ── TOP HEADER ────────────────────────────────────────────────
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        border: Border(bottom: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          // AI Avatar circle
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, AppTheme.primaryLight],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Campus AI Assistant',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: AppTheme.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    const Text(
                      'Online · Powered by RAG AI',
                      style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Clear chat button
          if (_messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.refresh_outlined,
                  size: 20, color: AppTheme.textSecondary),
              tooltip: 'Clear chat',
              onPressed: () => setState(() => _messages.clear()),
            ),
        ],
      ),
    );
  }

  // ── EMPTY STATE — shown before first message ──────────────────
  Widget _buildEmptyState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          // Big AI icon
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, AppTheme.primaryLight],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primary.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 38),
          ),
          const SizedBox(height: 20),
          const Text(
            'Ask Campus AI',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Your intelligent academic assistant.\nAsk about attendance, schedule, policies, and more.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 32),
          // Capability cards
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
            child: Text(
              'SUGGESTED QUESTIONS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppTheme.textSecondary,
                letterSpacing: 1.0,
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Suggestion chips — tap to auto-fill the input
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

  // ── MESSAGE LIST ──────────────────────────────────────────────
  Widget _buildMessageList() {
    return GestureDetector(
      // Tapping the message list dismisses the keyboard
      onTap: () => _focusNode.unfocus(),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        itemCount: _messages.length,
        itemBuilder: (context, index) {
          final msg = _messages[index];
          final isUser = msg.role == MessageRole.user;

          // Group messages — show timestamp only when role changes
          final showTimestamp = index == 0 ||
              _messages[index - 1].role != msg.role;

          return Column(
            children: [
              if (showTimestamp && !msg.isTyping)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    _formatTime(msg.timestamp),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.textSecondary,
                    ),
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

  // ── BOTTOM INPUT BAR ──────────────────────────────────────────
  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Text input field
          Expanded(
            child: Container(
              constraints: const BoxConstraints(maxHeight: 120),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.border),
              ),
              child: TextField(
                controller: _controller,
                focusNode: _focusNode,
                maxLines: null, // allows multi-line
                textInputAction: TextInputAction.send,
                onSubmitted: _sendMessage,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textPrimary,
                ),
                decoration: const InputDecoration(
                  hintText: 'Ask about attendance, schedule...',
                  hintStyle: TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 14,
                  ),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 12,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          // Send button
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: _isLoading
                  ? AppTheme.primary.withOpacity(0.5)
                  : AppTheme.primary,
              borderRadius: BorderRadius.circular(23),
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(23),
                onTap: _isLoading
                    ? null
                    : () => _sendMessage(_controller.text),
                child: Center(
                  child: _isLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(
                          Icons.send_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $period';
  }
}

// ─────────────────────────────────────────────────────────────
// USER BUBBLE — right-aligned, primary color
// ─────────────────────────────────────────────────────────────
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
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(18),
                  topRight: Radius.circular(18),
                  bottomLeft: Radius.circular(18),
                  bottomRight: Radius.circular(4),
                ),
              ),
              child: Text(
                message.text,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.white,
                  height: 1.5,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          // User avatar
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.person, size: 16, color: AppTheme.primary),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// ASSISTANT BUBBLE — left-aligned, white card style
// Shows animated dots when isTyping = true
// ─────────────────────────────────────────────────────────────
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
          // AI avatar
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, AppTheme.primaryLight],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.auto_awesome, size: 15, color: Colors.white),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                  : Text(
                      message.text,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.textPrimary,
                        height: 1.6,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// TYPING DOTS ANIMATION
// Three dots that animate in sequence to show AI is thinking
// ─────────────────────────────────────────────────────────────
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
        builder: (_, __) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(3, (i) {
              // Each dot has a slightly delayed animation
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
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              );
            }),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// CAPABILITY CARD — shown on empty state
// ─────────────────────────────────────────────────────────────
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
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 10,
                color: AppTheme.textSecondary,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// SUGGESTION CHIP — tappable quick-question buttons
// ─────────────────────────────────────────────────────────────
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
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.primary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
