// lib/screens/chatbot/chat_service.dart
//
// Talks to the backend's authenticated chatbot proxy at /api/student/chat.
// The backend identifies the student from their JWT and only ever returns
// data scoped to that student — the chatbot port is not exposed to clients.

import '../../services/api_client.dart';

class ChatService {
  /// Sends a user message and returns the assistant reply.
  /// Throws if the network request itself fails — the screen catches it and
  /// shows a friendly error bubble.
  static Future<String> sendMessage(String userMessage) async {
    final response = await ApiClient.post(
      '/api/student/chat',
      body: {'message': userMessage},
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
