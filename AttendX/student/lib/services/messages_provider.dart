import 'package:flutter/foundation.dart';
import '../models/message_thread.dart';
import 'api_client.dart';
import 'auth_service.dart';

/// Async student↔teacher messaging. Mirrors NotificationProvider: load on
/// screen open / pull-to-refresh — no polling, no sockets. Unread state comes
/// from the server (computed by query).
class MessagesProvider extends ChangeNotifier {
  List<ThreadSummary> _threads = [];
  bool _isLoading = false;
  String? _error;

  List<TeacherContact> _contacts = [];
  bool _contactsLoading = false;

  List<InboxMessage> _messages = [];
  int? _activeThreadId;
  bool _messagesLoading = false;
  bool _sending = false;

  int? _myUserId;

  List<ThreadSummary> get threads => _threads;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get unreadCount => _threads.fold(0, (sum, t) => sum + t.unreadCount);

  List<TeacherContact> get contacts => _contacts;
  bool get contactsLoading => _contactsLoading;

  List<InboxMessage> get messages => _messages;
  int? get activeThreadId => _activeThreadId;
  bool get messagesLoading => _messagesLoading;
  bool get sending => _sending;
  int? get myUserId => _myUserId;

  Future<void> loadThreads() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _myUserId ??= await _loadMyUserId();
      final response = await ApiClient.get('/api/messages/threads');
      final data = response['data'] as List<dynamic>? ?? [];
      _threads = data.map((e) => ThreadSummary.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      _error = e is ApiException ? e.message : e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> loadContacts() async {
    _contactsLoading = true;
    notifyListeners();
    try {
      final response = await ApiClient.get('/api/messages/contacts');
      final data = response['data'] as Map<String, dynamic>? ?? {};
      final teachers = data['teachers'] as List<dynamic>? ?? [];
      _contacts = teachers.map((e) => TeacherContact.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      _contacts = [];
    }
    _contactsLoading = false;
    notifyListeners();
  }

  Future<void> openThread(int threadId) async {
    _activeThreadId = threadId;
    _messagesLoading = true;
    _messages = [];
    notifyListeners();

    try {
      final response = await ApiClient.get('/api/messages/threads/$threadId', queryParams: {'limit': '100'});
      final data = response['data'] as Map<String, dynamic>? ?? {};
      final list = data['messages'] as List<dynamic>? ?? [];
      _messages = list.map((e) => InboxMessage.fromJson(e as Map<String, dynamic>)).toList();
      await markRead(threadId);
    } catch (e) {
      _error = e is ApiException ? e.message : e.toString();
    }

    _messagesLoading = false;
    notifyListeners();
  }

  Future<void> markRead(int threadId) async {
    try {
      await ApiClient.post('/api/messages/threads/$threadId/read', body: {});
      final idx = _threads.indexWhere((t) => t.id == threadId);
      if (idx >= 0) {
        _threads[idx].unreadCount = 0;
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Reply inside an existing thread.
  Future<bool> sendMessage(int threadId, String body) async {
    if (body.trim().isEmpty || _sending) return false;
    _sending = true;
    notifyListeners();
    try {
      await ApiClient.post('/api/messages/threads/$threadId', body: {'body': body.trim()});
      await openThread(threadId);
      loadThreads();
      return true;
    } catch (e) {
      _error = e is ApiException ? e.message : e.toString();
      return false;
    } finally {
      _sending = false;
      notifyListeners();
    }
  }

  /// Start (or continue) a thread with a teacher about a subject.
  /// Returns the thread id on success, null on failure.
  Future<int?> startThread({required int teacherUserId, required int subjectId, required String body}) async {
    if (body.trim().isEmpty || _sending) return null;
    _sending = true;
    notifyListeners();
    try {
      final response = await ApiClient.post('/api/messages/threads', body: {
        'recipientUserId': teacherUserId,
        'subjectId': subjectId,
        'body': body.trim(),
      });
      final data = response['data'] as Map<String, dynamic>? ?? {};
      final thread = data['thread'] as Map<String, dynamic>?;
      await loadThreads();
      return thread?['id'] as int?;
    } catch (e) {
      _error = e is ApiException ? e.message : e.toString();
      return null;
    } finally {
      _sending = false;
      notifyListeners();
    }
  }

  Future<int?> _loadMyUserId() async {
    final saved = await AuthService.getSavedUserData();
    final user = saved?['user'] as Map<String, dynamic>? ?? saved;
    final id = user?['id'];
    return id is int ? id : int.tryParse(id?.toString() ?? '');
  }
}
