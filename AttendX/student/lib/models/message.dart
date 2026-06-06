// lib/models/message.dart
//
// This file defines the "shape" of one chat message.
// Every bubble you see in the chat screen is one ChatMessage object.
//
// role → who sent the message:
//   MessageRole.user      = the student typed this
//   MessageRole.assistant = the AI replied with this
//
// isTyping → a special "loading" bubble shown while AI is thinking

enum MessageRole { user, assistant }

class ChatMessage {
  final String id;
  final String text;
  final MessageRole role;
  final DateTime timestamp;
  final bool isTyping; // true = show animated dots, not text

  ChatMessage({
    required this.id,
    required this.text,
    required this.role,
    required this.timestamp,
    this.isTyping = false,
  });

  // Quick factory for a user bubble
  factory ChatMessage.fromUser(String text) {
    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: text,
      role: MessageRole.user,
      timestamp: DateTime.now(),
    );
  }

  // Quick factory for an AI reply bubble
  factory ChatMessage.fromAssistant(String text) {
    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: text,
      role: MessageRole.assistant,
      timestamp: DateTime.now(),
    );
  }

  // Special loading bubble shown while waiting for AI reply
  factory ChatMessage.typingIndicator() {
    return ChatMessage(
      id: 'typing',
      text: '',
      role: MessageRole.assistant,
      timestamp: DateTime.now(),
      isTyping: true,
    );
  }
}
