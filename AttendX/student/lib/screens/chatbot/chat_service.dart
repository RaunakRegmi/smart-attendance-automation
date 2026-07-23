// lib/screens/chatbot/chat_service.dart
//
// Talks to the backend's authenticated chatbot proxy at /api/student/*.
// The backend identifies the student from their JWT and persists the whole
// conversation in Postgres, keyed to the account — so memory is durable and
// survives app restarts, reinstalls, and new devices (no client session id).

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../models/message.dart';
import '../../services/api_client.dart';

/// One Server-Sent Event from the streaming chat endpoint.
class ChatStreamEvent {
  final String type; // token | usage | done | error
  final String? delta;
  final String? message;
  final int? promptTokens;
  final int? completionTokens;
  final int? numCtx;
  ChatStreamEvent(
    this.type, {
    this.delta,
    this.message,
    this.promptTokens,
    this.completionTokens,
    this.numCtx,
  });
}

/// Context-window snapshot for the "what I remember" sheet.
class ChatContextInfo {
  final int numCtx;
  final int promptTokens;
  final int completionTokens;
  final double percentUsed;
  final int messageCount;
  final String? summary;
  ChatContextInfo({
    required this.numCtx,
    required this.promptTokens,
    required this.completionTokens,
    required this.percentUsed,
    required this.messageCount,
    this.summary,
  });
  int get used => promptTokens + completionTokens;
}

class ChatService {
  /// Restore the student's durable, server-side conversation.
  /// Returns the full transcript (user/assistant turns), oldest → newest.
  static Future<List<ChatMessage>> fetchConversation() async {
    final response = await ApiClient.get('/api/student/conversation');
    final data = response['data'] as Map<String, dynamic>?;
    final raw = (data?['messages'] as List<dynamic>?) ?? const [];
    final out = <ChatMessage>[];
    for (final e in raw) {
      final m = e as Map<String, dynamic>;
      final role = m['role'] as String?;
      if (role != 'user' && role != 'assistant') continue;
      out.add(ChatMessage(
        id: (m['id'] ?? DateTime.now().millisecondsSinceEpoch).toString(),
        text: (m['content'] as String?) ?? '',
        role: role == 'user' ? MessageRole.user : MessageRole.assistant,
        timestamp: DateTime.tryParse((m['createdAt'] as String?) ?? '') ?? DateTime.now(),
      ));
    }
    return out;
  }

  /// Clear (soft-archive) the student's conversation on the server.
  static Future<void> clearConversation() async {
    await ApiClient.delete('/api/student/conversation');
  }

  /// Context-window stats for the "what I remember" sheet.
  static Future<ChatContextInfo> fetchContext() async {
    final response = await ApiClient.get('/api/student/conversation/context');
    final data = (response['data'] as Map<String, dynamic>?) ?? const {};
    final used = (data['used'] as Map<String, dynamic>?) ?? const {};
    return ChatContextInfo(
      numCtx: (data['numCtx'] as num?)?.toInt() ?? 8192,
      promptTokens: (used['promptTokens'] as num?)?.toInt() ?? 0,
      completionTokens: (used['completionTokens'] as num?)?.toInt() ?? 0,
      percentUsed: (data['percentUsed'] as num?)?.toDouble() ?? 0,
      messageCount: (data['messageCount'] as num?)?.toInt() ?? 0,
      summary: data['runningSummary'] as String?,
    );
  }

  /// Sends a user message and returns the assistant reply. The backend persists
  /// both the question and the reply and feeds prior history to the model.
  static Future<String> sendMessage(String userMessage) async {
    final response = await ApiClient.post(
      '/api/student/chat',
      body: {'message': userMessage},
    );

    final reply = response['reply'] as String?;
    if (reply == null || reply.isEmpty) {
      return "I didn't understand. Please rephrase.";
    }
    return reply;
  }

  /// Streams the assistant reply token-by-token via SSE. Uses http.Client().send
  /// (the same streamed-response pattern as file uploads) since the reply arrives
  /// incrementally as `text/event-stream`.
  static Stream<ChatStreamEvent> streamMessage(String userMessage) async* {
    final baseUrl = await ApiClient.getBaseUrl();
    final token = await ApiClient.getToken();
    final req = http.Request('POST', Uri.parse('$baseUrl/api/student/chat/stream'))
      ..headers['Content-Type'] = 'application/json'
      ..headers['Accept'] = 'text/event-stream'
      ..body = jsonEncode({'message': userMessage});
    if (token != null) req.headers['Authorization'] = 'Bearer $token';

    final client = http.Client();
    try {
      final resp = await client.send(req);
      if (resp.statusCode < 200 || resp.statusCode >= 300) {
        yield ChatStreamEvent('error', message: 'stream failed (${resp.statusCode})');
        return;
      }
      var buffer = '';
      await for (final chunk in resp.stream.transform(utf8.decoder)) {
        buffer += chunk;
        var idx = buffer.indexOf('\n\n');
        while (idx != -1) {
          final frame = buffer.substring(0, idx);
          buffer = buffer.substring(idx + 2);
          final ev = _parseFrame(frame);
          if (ev != null) yield ev;
          idx = buffer.indexOf('\n\n');
        }
      }
    } catch (_) {
      yield ChatStreamEvent('error', message: 'Connection error. Please try again.');
    } finally {
      client.close();
    }
  }

  static ChatStreamEvent? _parseFrame(String frame) {
    String? event;
    var dataStr = '';
    for (final line in frame.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        dataStr += line.substring(5).trim();
      }
    }
    if (event == null) return null;
    Map<String, dynamic> data = {};
    if (dataStr.isNotEmpty) {
      try {
        data = jsonDecode(dataStr) as Map<String, dynamic>;
      } catch (_) {}
    }
    switch (event) {
      case 'token':
        return ChatStreamEvent('token', delta: data['delta'] as String? ?? '');
      case 'usage':
        return ChatStreamEvent('usage',
            promptTokens: data['prompt_tokens'] as int?,
            completionTokens: data['completion_tokens'] as int?,
            numCtx: data['num_ctx'] as int?);
      case 'done':
        return ChatStreamEvent('done');
      case 'error':
        return ChatStreamEvent('error', message: data['message'] as String? ?? 'error');
      default:
        return null;
    }
  }

  /// Suggested starter questions shown on empty chat screen.
  static List<String> get suggestedQuestions => const [
        'What is my attendance?',
        'Am I eligible for exams?',
        'Which subjects am I at risk in?',
        'How am I doing overall?',
        'What is my rank in my batch?',
        'Give me tips to improve my attendance',
      ];
}
