// lib/screens/chatbot/chat_service.dart
//
// Talks to the backend's authenticated chatbot proxy at /api/student/chat.
// The backend identifies the student from their JWT and only ever returns
// data scoped to that student — the chatbot port is not exposed to clients.

import 'package:shared_preferences/shared_preferences.dart';
import '../../services/api_client.dart';

class ChatService {
  static String? _sessionId;

  /// Initialises (or resumes) a session ID from local storage.
  /// Call once from the screen's initState.
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _sessionId = prefs.getString('chat_session_id');
    if (_sessionId == null) {
      _sessionId = 'stu_${DateTime.now().millisecondsSinceEpoch}_${_randomString(8)}';
      await prefs.setString('chat_session_id', _sessionId!);
    }
  }

  static String _randomString(int len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final r = DateTime.now().microsecondsSinceEpoch;
    return List.generate(len, (i) => chars[(r >> (i * 3)) % chars.length]).join();
  }

  /// Sends a user message and returns the assistant reply.
  /// Throws if the network request itself fails — the screen catches it and
  /// shows a friendly error bubble.
  static Future<String> sendMessage(String userMessage) async {
    final body = <String, dynamic>{'message': userMessage};
    if (_sessionId != null) body['session_id'] = _sessionId;

    final response = await ApiClient.post(
      '/api/student/chat',
      body: body,
    );

    final reply = response['reply'] as String?;
    if (reply == null || reply.isEmpty) {
      return "I didn't catch that. Could you rephrase the question?";
    }
    return reply;
  }

  /// Suggested starter questions shown on empty chat screen.
  static List<String> get suggestedQuestions => const [
        'What is my attendance?',
        'Am I eligible for exams?',
        'Which subjects am I at risk in?',
        'How am I doing this semester?',
        'What is my rank in my batch?',
        'Give me tips to improve my attendance',
      ];
}
