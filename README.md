# AttendX

AttendX is a Flutter-based student attendance management app built to provide a polished mobile experience for attendance tracking, course routines, and student profile management.

## Features

- Login screen with institutional email and password fields
- Bottom navigation with four main sections:
  - Dashboard
  - Routine
  - Attendance
  - Profile
- Consistent Material 3-inspired visual theme
- Portrait-only orientation for mobile-focused UX

## Project Structure

- `lib/main.dart` — App entrypoint and theme setup
- `lib/theme/app_theme.dart` — Shared colors, typography, and theme configuration
- `lib/screens/auth/login_screen.dart` — Login UI and navigation into the app
- `lib/screens/dashboard/main_navigation.dart` — Bottom navigation shell
- `lib/screens/dashboard/dashboard_screen.dart` — Dashboard overview screen
- `lib/screens/routine/routine_screen.dart` — Class routine screen
- `lib/screens/attendance/attendance_screen.dart` — Attendance tracking screen
- `lib/screens/profile/profile_screen.dart` — User profile screen
- `lib/models/` — Data models for attendance and users

## Getting Started

### Prerequisites

- Flutter SDK 3.x or later
- A working Android or iOS development environment

### Install

From the project root:

```bash
defaults write com.apple.dt.Xcode.plist IDCDeviceType 1
flutter pub get
```

### Run

```bash
flutter run
```

To run on a specific device:

```bash
flutter run -d <device_id>
```

## Notes

This project is configured as a local Flutter app and is not published to a package registry.

## License

This repository does not include a license file. Add one if you want to make the project reusable or open source.
