// lib/screens/chatbot/chat_service.dart
//
// ─────────────────────────────────────────────────────────────────
// WHAT THIS FILE DOES
// ─────────────────────────────────────────────────────────────────
// This is the "brain connector" between the chat UI and your backend.
//
// RIGHT NOW  → It uses smart mock responses so the UI works fully
//              even before your Node.js + RAG backend is ready.
//
// LATER      → You swap ONE function (sendMessage) to make a real
//              HTTP call. Everything else stays exactly the same.
//
// Flow when backend IS connected:
//   ChatScreen types message
//        ↓
//   ChatService.sendMessage()
//        ↓
//   HTTP POST → your Node.js /api/chat
//        ↓
//   Node.js → RAG Python service → LLM
//        ↓
//   Reply comes back as JSON { "reply": "..." }
//        ↓
//   ChatScreen shows the bubble
// ─────────────────────────────────────────────────────────────────

// ignore: depend_on_referenced_packages
import 'dart:math';

class ChatService {
  // ── STEP 1: Change this URL to your real backend later ───────────
  // static const String _baseUrl = 'http://YOUR_BACKEND_IP:3000';
  // ─────────────────────────────────────────────────────────────────

  // Simulated delay so the UI behaves like a real network call
  static const Duration _fakeDelay = Duration(milliseconds: 1400);

  // ─────────────────────────────────────────────────────────────────
  // MAIN FUNCTION: Send a message, get a reply
  //
  // To switch to real backend later, replace the mock block with:
  //
  //   final response = await http.post(
  //     Uri.parse('$_baseUrl/api/chat'),
  //     headers: {'Content-Type': 'application/json',
  //               'Authorization': 'Bearer YOUR_TOKEN'},
  //     body: jsonEncode({'message': userMessage}),
  //   );
  //   if (response.statusCode == 200) {
  //     final data = jsonDecode(response.body);
  //     return data['reply'];
  //   }
  //   return 'Sorry, I could not get a response right now.';
  // ─────────────────────────────────────────────────────────────────
  static Future<String> sendMessage(String userMessage) async {
    // Simulate network delay
    await Future.delayed(_fakeDelay);
    // Return a smart mock reply based on keywords in the question
    return _getMockReply(userMessage.toLowerCase());
  }

  // ─────────────────────────────────────────────────────────────────
  // MOCK REPLY ENGINE
  // Matches keywords in the user's question and returns a realistic
  // AI reply. This makes the demo look fully functional.
  // ─────────────────────────────────────────────────────────────────
  static String _getMockReply(String msg) {
    // Attendance percentage / eligibility
    if (msg.contains('eligible') || msg.contains('exam')) {
      return 'Based on your current records, your overall attendance is 85%, which is above the required 75% threshold. ✅ You are eligible to sit for your upcoming exams.\n\nHowever, please note that World History (HIS101) is at 70% — just below the minimum. I recommend attending all remaining classes for that subject.';
    }

    if (msg.contains('attendance') && (msg.contains('my') || msg.contains('overall') || msg.contains('percent'))) {
      return 'Your current overall attendance stands at **85%**.\n\nBreakdown by subject:\n• Maths - Calculus II (MATH201): 91.7% ✅\n• Physics Lab (PHY101L): 91.7% ✅\n• Algorithms (CS301): 90.9% ✅\n• Software Engineering (CS401): 93.8% ✅\n• Literature (ENG202): 72.2% ⚠️\n• World History (HIS101): 70.0% ⚠️\n• Database Systems (CS302): 70.0% ⚠️\n\nYou have 3 subjects at risk. Would you like advice on improving any of them?';
    }

    if (msg.contains('low') || msg.contains('risk') || msg.contains('below') || msg.contains('danger')) {
      return '⚠️ You currently have 3 subjects with attendance below the required 75%:\n\n1. World History (HIS101) — 70%\n2. Literature (ENG202) — 72.2%\n3. Database Systems (CS302) — 70%\n\nFor World History, you need to attend at least the next 3 consecutive classes to reach 75%. I strongly recommend prioritising these subjects this week.';
    }

    // Policy questions
    if (msg.contains('policy') || msg.contains('rule') || msg.contains('minimum') || msg.contains('required')) {
      return 'According to the institutional attendance policy:\n\n📋 **Minimum Required Attendance: 75%**\n\n• Students below 75% in any subject may be barred from that subject\'s final exam.\n• A student falling below 65% receives a formal warning from the department.\n• Medical absences with valid documentation may be considered for exemption — contact the academic office.\n\nWould you like to know your current status against this policy?';
    }

    // Schedule / routine questions
    if (msg.contains('schedule') || msg.contains('routine') || msg.contains('class') || msg.contains('today') || msg.contains('tomorrow')) {
      return 'Here is your schedule for today (Monday):\n\n🕙 10:00 AM – 11:00 AM\nMaths - Calculus II (MATH201)\nDr. Sarah Wilson • Room 402 • Lecture\n\n🕦 11:30 AM – 1:00 PM\nPhysics Lab (PHY101L)\nProf. James Reed • Lab 102 • Lab\n\n🕑 2:00 PM – 3:00 PM\nWorld History (HIS101)\nDr. Emma Brown • Room 201 • Lecture\n\nYou have 3 classes today. Don\'t miss World History — your attendance there is currently at risk!';
    }

    if (msg.contains('next class') || msg.contains('upcoming')) {
      return 'Your next class is:\n\n📚 **Maths - Calculus II** (MATH201)\n🕙 10:00 AM – 11:00 AM\n📍 Room 402\n👨‍🏫 Dr. Sarah Wilson\n\nIt starts in approximately 45 minutes. Would you like to mark your attendance or set a reminder?';
    }

    // Absent / miss questions
    if (msg.contains('absent') || msg.contains('miss') || msg.contains('skip')) {
      return 'Based on your recent logs, you have been marked absent in:\n\n• World History — 5 absences out of 20 classes\n• Database Systems — 3 absences out of 10 classes\n• Literature — 3 absences out of 18 classes\n\nYour most recent absence was in World History yesterday. If this was a medical absence, please submit supporting documents to the academic office within 3 days.';
    }

    // Marks / GPA
    if (msg.contains('mark') || msg.contains('grade') || msg.contains('gpa') || msg.contains('result')) {
      return 'I can currently access your attendance records and schedule. For marks and GPA information, please check the student portal or contact your academic advisor directly.\n\nIs there anything about your attendance or schedule I can help with?';
    }

    // Greeting
    if (msg.contains('hello') || msg.contains('hi') || msg.contains('hey') || msg.contains('good')) {
      return 'Hello! 👋 I\'m your Campus AI Assistant.\n\nI can help you with:\n• Checking your attendance percentage\n• Knowing which subjects are at risk\n• Understanding attendance policy\n• Viewing your class schedule\n• Knowing if you\'re exam-eligible\n\nWhat would you like to know today?';
    }

    // Help / capabilities
    if (msg.contains('help') || msg.contains('what can') || msg.contains('how') || msg.contains('capabilit')) {
      return 'Here\'s what I can help you with:\n\n📊 **Attendance**\n  — "What is my attendance?"\n  — "Which subjects am I failing?"\n  — "Am I eligible for exams?"\n\n📅 **Schedule**\n  — "What classes do I have today?"\n  — "What is my next class?"\n\n📋 **Policy**\n  — "What is the attendance policy?"\n  — "What happens if I miss more classes?"\n\nJust ask in plain English — I\'ll do my best to help!';
    }

    // Teacher / contact
    if (msg.contains('teacher') || msg.contains('professor') || msg.contains('contact') || msg.contains('faculty')) {
      return 'Here are your subject teachers:\n\n• MATH201 — Dr. Sarah Wilson\n• PHY101L — Prof. James Reed\n• HIS101 — Dr. Emma Brown\n• ENG202 — Prof. Mark Davis\n• CS301 — Dr. Lisa Chen\n• CS302 — Prof. Tom Harris\n• CS401 — Dr. Alex Morgan\n\nFor direct contact, please use the university email system or visit their office hours listed on the portal.';
    }

    // Default fallback
    final fallbacks = [
      'That\'s a great question! Based on your current records, your overall attendance is 85% and you\'re in good standing. Could you be more specific about what you\'d like to know? For example: your attendance %, exam eligibility, schedule, or policy details.',
      'I want to make sure I give you the right answer. Could you rephrase that? You can ask me things like "Am I eligible for exams?", "What is my attendance?", or "What classes do I have today?"',
      'I didn\'t quite catch that. I can help with attendance records, class schedules, exam eligibility, and campus policies. Try asking one of those!',
    ];
    return fallbacks[Random().nextInt(fallbacks.length)];
  }

  // Suggested starter questions shown on empty chat screen
  static List<String> get suggestedQuestions => [
    'Am I eligible for exams?',
    'What is my attendance?',
    'Which subjects are at risk?',
    'What classes do I have today?',
    'What is the attendance policy?',
    'Show my recent absences',
  ];
}
