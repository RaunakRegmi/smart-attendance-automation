// Models for student↔teacher async messaging.
// Named MessageThread/InboxMessage (not "ChatMessage") because models/message.dart
// already belongs to the AI chatbot.

class ThreadSummary {
  final int id;
  final String contextType;
  final String? subjectCode;
  final String? subjectName;
  final String? title;
  final String otherName;
  final String? otherRole;
  final String? lastMessageBody;
  final bool lastMessageIsSystem;
  final DateTime updatedAt;
  int unreadCount;

  ThreadSummary({
    required this.id,
    required this.contextType,
    this.subjectCode,
    this.subjectName,
    this.title,
    required this.otherName,
    this.otherRole,
    this.lastMessageBody,
    this.lastMessageIsSystem = false,
    required this.updatedAt,
    this.unreadCount = 0,
  });

  factory ThreadSummary.fromJson(Map<String, dynamic> json) {
    final others = (json['otherParticipants'] as List<dynamic>?) ?? [];
    final other = others.isNotEmpty ? others.first as Map<String, dynamic> : null;
    final subject = json['subject'] as Map<String, dynamic>?;
    final last = json['lastMessage'] as Map<String, dynamic>?;
    return ThreadSummary(
      id: json['id'] as int,
      contextType: json['contextType'] as String? ?? '',
      subjectCode: subject?['subjectCode'] as String?,
      subjectName: subject?['subjectName'] as String?,
      title: json['title'] as String?,
      otherName: other?['name'] as String? ?? 'Conversation',
      otherRole: other?['role'] as String?,
      lastMessageBody: last?['body'] as String?,
      lastMessageIsSystem: last?['isSystem'] as bool? ?? false,
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.now(),
      unreadCount: json['unreadCount'] as int? ?? 0,
    );
  }
}

class InboxMessage {
  final int id;
  final int? senderId;
  final String? senderName;
  final String? senderRole;
  final String body;
  final bool isSystem;
  final DateTime createdAt;

  InboxMessage({
    required this.id,
    this.senderId,
    this.senderName,
    this.senderRole,
    required this.body,
    this.isSystem = false,
    required this.createdAt,
  });

  factory InboxMessage.fromJson(Map<String, dynamic> json) {
    return InboxMessage(
      id: json['id'] as int,
      senderId: json['senderId'] as int?,
      senderName: json['senderName'] as String?,
      senderRole: json['senderRole'] as String?,
      body: json['body'] as String? ?? '',
      isSystem: json['isSystem'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class SubjectRef {
  final int id;
  final String subjectCode;
  final String? subjectName;

  SubjectRef({required this.id, required this.subjectCode, this.subjectName});

  factory SubjectRef.fromJson(Map<String, dynamic> json) {
    return SubjectRef(
      id: json['id'] as int,
      subjectCode: json['subjectCode'] as String? ?? '',
      subjectName: json['subjectName'] as String?,
    );
  }
}

/// A teacher this student may message, with the subjects they share.
class TeacherContact {
  final int userId;
  final String name;
  final String? email;
  final List<SubjectRef> subjects;

  TeacherContact({required this.userId, required this.name, this.email, required this.subjects});

  factory TeacherContact.fromJson(Map<String, dynamic> json) {
    return TeacherContact(
      userId: json['userId'] as int,
      name: json['name'] as String? ?? 'Teacher',
      email: json['email'] as String?,
      subjects: ((json['subjects'] as List<dynamic>?) ?? [])
          .map((e) => SubjectRef.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
