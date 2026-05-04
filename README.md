# AttendX - Smart Attendance Automation System

AttendX is a Flutter-based student attendance management app that modernizes and streamlines the traditional attendance-taking process in educational institutions. It provides a polished mobile experience for attendance tracking, course routines, student profile management, and AI-powered assistance.

## Features

- 🔐 **Login Screen** - Institutional email and password authentication
- 📊 **Dashboard** - Real-time attendance overview and insights
- 📅 **Class Routine** - Weekly schedule viewer with class details
- ✅ **Attendance Tracking** - Subject-wise attendance with progress indicators
- 👤 **Student Profile** - Personal information and academic summary
- 🤖 **AI Chatbot** - Intelligent assistant for campus queries
- 🎨 **Material 3 Design** - Modern, consistent visual theme
- 📱 **Mobile-Optimized** - Portrait-only orientation for focused UX

## Project Structure
lib/
├── main.dart # App entrypoint and theme setup
├── theme/
│ └── app_theme.dart # Shared colors, typography, and theme
├── screens/
│ ├── auth/
│ │ └── login_screen.dart # Login UI and authentication
│ ├── dashboard/
│ │ ├── main_navigation.dart # Bottom navigation shell
│ │ └── dashboard_screen.dart # Dashboard overview
│ ├── routine/
│ │ └── routine_screen.dart # Class routine display
│ ├── attendance/
│ │ └── attendance_screen.dart # Attendance tracking
│ ├── chatbot/
│ │ ├── chatbot_screen.dart # AI chat interface
│ │ └── chat_service.dart # API integration
│ └── profile/
│ └── profile_screen.dart # User profile
└── models/
├── message.dart # Chat message model
└── attendance.dart # Attendance data models

text

## Getting Started

### Prerequisites

- Flutter SDK 3.x or later
- Android Studio / VS Code with Flutter extensions
- Android or iOS emulator/physical device

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RaunakRegmi/smart-attendance-automation.git
   cd smart-attendance-automation
Switch to flutter branch

bash
git checkout flutter
Get dependencies

bash
flutter pub get
Run the app


bash
defaults write com.apple.dt.Xcode.plist IDCDeviceType 1
🤖 AI Chatbot Feature
The app includes an intelligent chatbot that can answer:

📊 Attendance queries ("What's my attendance?")

📝 Exam eligibility ("Am I eligible for exams?")

📅 Class schedules ("Show my routine")

📚 Campus policies and FAQs

Current Status
✅ UI complete with message bubbles

✅ Mock responses for testing

⏳ Backend API integration in progress

Development
Run on specific device
bash
flutter run -d <device_id>
Build APK
bash
flutter build apk --release
Debug mode with logging
bash
flutter run --verbose
Branch Information
Current branch: flutter (Frontend development)

Main branch: Contains backend and full system integration

Tech Stack
Frontend: Flutter, Dart

HTTP Client: http package

Backend (in development): Node.js, Python RAG Service



Flutter Developer - Mobile Frontend Development

Feature Status
Feature	Status
Login Screen	✅ Complete
Dashboard	✅ Complete
Class Routine	✅ Complete
Attendance Tracking	✅ Complete
Student Profile	✅ Complete
AI Chatbot UI	✅ Complete
Backend API Integration	⏳ In Progress
Push Notifications	📅 Planned
Offline Mode	📅 Planned
Dark Mode	📅 Planned

Contributing
This is a team project. Please coordinate with team members before making major changes.

License
This project is for educational purposes. Contact the team for usage rights.

Support
For issues or questions:

Create an issue on GitHub

Contact the backend or frontend team lead

Check the project documentation