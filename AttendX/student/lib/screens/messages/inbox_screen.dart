import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/message_thread.dart';
import '../../services/messages_provider.dart';
import '../../theme/app_theme.dart';
import 'thread_screen.dart';

/// Student message inbox: threads with teachers, unread badges, and a
/// "Message a teacher" compose flow. Async — refreshes on open, no live chat.
class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MessagesProvider>().loadThreads();
    });
  }

  void _openThread(ThreadSummary thread) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ThreadScreen(threadId: thread.id, title: _threadTitle(thread))),
    );
  }

  String _threadTitle(ThreadSummary t) {
    if (t.contextType == 'ADMIN_BROADCAST') return t.title ?? 'Notification';
    return t.otherName;
  }

  String _timeLabel(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inDays < 1) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    return '${time.day}/${time.month}';
  }

  void _openCompose() {
    final provider = context.read<MessagesProvider>();
    provider.loadContacts();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _ComposeSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MessagesProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Messages',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCompose,
        backgroundColor: AppTheme.primary,
        icon: const Icon(Icons.edit_outlined, color: Colors.white, size: 18),
        label: const Text('Message a teacher', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadThreads(),
        color: AppTheme.primary,
        child: provider.isLoading && provider.threads.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
            : provider.threads.isEmpty
                ? ListView(children: const [
                    SizedBox(height: 120),
                    Icon(Icons.forum_outlined, size: 48, color: AppTheme.textSecondary),
                    SizedBox(height: 12),
                    Center(
                        child: Text('No conversations yet.\nMessage a teacher to get started.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 14))),
                  ])
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
                    itemCount: provider.threads.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final t = provider.threads[index];
                      return _ThreadCard(
                        thread: t,
                        title: _threadTitle(t),
                        timeLabel: _timeLabel(t.updatedAt),
                        onTap: () => _openThread(t),
                      );
                    },
                  ),
      ),
    );
  }
}

class _ThreadCard extends StatelessWidget {
  final ThreadSummary thread;
  final String title;
  final String timeLabel;
  final VoidCallback onTap;

  const _ThreadCard({required this.thread, required this.title, required this.timeLabel, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final unread = thread.unreadCount;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: unread > 0 ? AppTheme.primaryLight : AppTheme.border),
        ),
        child: Row(children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: unread > 0 ? AppTheme.primary : AppTheme.background,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                title.isNotEmpty ? title[0].toUpperCase() : '?',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: unread > 0 ? Colors.white : AppTheme.textSecondary),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w600,
                          color: AppTheme.textPrimary)),
                ),
                Text(timeLabel, style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
              ]),
              const SizedBox(height: 3),
              if (thread.subjectCode != null)
                Text('${thread.subjectCode}${thread.subjectName != null ? ' · ${thread.subjectName}' : ''}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.accent)),
              if (thread.lastMessageBody != null) ...[
                const SizedBox(height: 3),
                Row(children: [
                  Expanded(
                    child: Text(thread.lastMessageBody!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12,
                            color: unread > 0 ? AppTheme.textPrimary : AppTheme.textSecondary)),
                  ),
                  if (unread > 0)
                    Container(
                      margin: const EdgeInsets.only(left: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: const BoxDecoration(color: AppTheme.error, shape: BoxShape.circle),
                      child: Text(unread > 9 ? '9+' : '$unread',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
                    ),
                ]),
              ],
            ]),
          ),
        ]),
      ),
    );
  }
}

/// "Message a teacher": pick one of your subject teachers, the shared subject,
/// and write the first message. Eligibility is enforced again server-side.
class _ComposeSheet extends StatefulWidget {
  const _ComposeSheet();

  @override
  State<_ComposeSheet> createState() => _ComposeSheetState();
}

class _ComposeSheetState extends State<_ComposeSheet> {
  TeacherContact? _teacher;
  SubjectRef? _subject;
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final provider = context.read<MessagesProvider>();
    if (_teacher == null || _subject == null || _controller.text.trim().isEmpty) return;
    final threadId = await provider.startThread(
      teacherUserId: _teacher!.userId,
      subjectId: _subject!.id,
      body: _controller.text,
    );
    if (!mounted) return;
    Navigator.of(context).pop();
    if (threadId != null) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ThreadScreen(threadId: threadId, title: _teacher!.name)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error ?? 'Could not send message'), backgroundColor: AppTheme.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MessagesProvider>();
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppTheme.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Message a teacher',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
            const SizedBox(height: 4),
            const Text('You can message the teachers of your subjects.',
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            const SizedBox(height: 16),
            if (provider.contactsLoading)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: AppTheme.primary)))
            else if (provider.contacts.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text('No teachers available to message yet.',
                    style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
              )
            else ...[
              const Text('TEACHER',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1.0)),
              const SizedBox(height: 6),
              DropdownButtonFormField<TeacherContact>(
                value: _teacher,
                isExpanded: true,
                decoration: _inputDecoration('Select teacher'),
                items: provider.contacts
                    .map((t) => DropdownMenuItem(value: t, child: Text(t.name, overflow: TextOverflow.ellipsis)))
                    .toList(),
                onChanged: (t) => setState(() {
                  _teacher = t;
                  _subject = (t != null && t.subjects.length == 1) ? t.subjects.first : null;
                }),
              ),
              const SizedBox(height: 12),
              const Text('SUBJECT',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1.0)),
              const SizedBox(height: 6),
              DropdownButtonFormField<SubjectRef>(
                value: _subject,
                isExpanded: true,
                decoration: _inputDecoration('Select subject'),
                items: (_teacher?.subjects ?? [])
                    .map((s) => DropdownMenuItem(
                        value: s,
                        child: Text('${s.subjectCode}${s.subjectName != null ? ' — ${s.subjectName}' : ''}',
                            overflow: TextOverflow.ellipsis)))
                    .toList(),
                onChanged: (s) => setState(() => _subject = s),
              ),
              const SizedBox(height: 12),
              const Text('MESSAGE',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1.0)),
              const SizedBox(height: 6),
              TextField(
                controller: _controller,
                maxLines: 4,
                minLines: 3,
                decoration: _inputDecoration('Write your message...'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: provider.sending ? null : _send,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(provider.sending ? 'Sending...' : 'Send message',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ]),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
      filled: true,
      fillColor: const Color(0xFFF1F5F9),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
    );
  }
}
