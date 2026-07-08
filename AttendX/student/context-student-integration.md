# Student Portal Integration — Context Summary

## Goal
Integrate Flutter Student Portal with real backend APIs and database data while preserving exact existing UI/UX, complete missing backend functionality, implement secure student-only data access, fix frontend validation bugs, and update Swagger documentation.

## Constraints
- UI/UX is finalized — DO NOT redesign, change themes/colors/fonts/layouts/component styling
- Only integrate APIs, state management, auth, connectivity, loading/error handling in Flutter
- Only fix logic/integration issues in Angular admin; preserve existing UI/theme
- NEVER trust frontend-provided student IDs — derive identity from JWT token, filter server-side
- All new endpoints must have full Swagger docs

## Architecture
- Backend: Express/Sequelize/PostgreSQL on port 5001 (Docker), JWT auth with ADMIN/STUDENT roles
- Flutter: Provider + ChangeNotifier state management, http package for API calls, SharedPreferences for token storage
- Angular admin: standalone components, signals, ReactiveForms

## Changes Made

### Backend — New Student Portal APIs
- `backend/src/controllers/studentPortalController.js`: 3 endpoints deriving student identity from JWT
  - `getDashboard` — combined profile, attendance %, today's schedule, recent logs, notification count
  - `getAttendanceSummary` — overall % + subject-wise breakdown with at-risk detection
  - `getAttendanceLogs` — paginated logs
- `backend/src/routes/studentPortalRoutes.js`: route definitions with full Swagger JSDoc, registered at `/api/student/`
- `backend/src/index.js`: registered student portal routes after reports routes
- `backend/src/config/swagger.js`: added 11 named OpenAPI schemas (StudentInfo, SubjectAttendanceStat, StudentDashboardResponse, etc.)

### Flutter App — API Integration
- Added `http`, `shared_preferences`, `provider` to pubspec.yaml
- `lib/services/api_client.dart`: HTTP client with token management, base URL detection (web=localhost:5001, android=10.0.2.2:5001)
- `lib/services/auth_service.dart`: login, getProfile, changePassword, logout, isLoggedIn
- `lib/services/dashboard_provider.dart`: DashboardData model + ChangeNotifier
- `lib/services/attendance_provider.dart`: AttendanceSummary + SubjectAttData + ChangeNotifier
- `lib/services/schedule_provider.dart`: weekly/today schedule loading ChangeNotifier
- `lib/services/notification_provider.dart`: AppNotification + markAsRead/markAllAsRead
- `lib/main.dart`: MultiProvider wrapping all 4 providers
- Updated all 5 screens to use providers instead of MockData:
  - `login_screen.dart`: AuthService.login, error display
  - `dashboard_screen.dart`: DashboardProvider, NotificationProvider, loading/error/RefreshIndicator
  - `attendance_screen.dart`: AttendanceProvider, empty-state, SubjectAttData
  - `profile_screen.dart`: DashboardProvider data, real logout
  - `routine_screen.dart`: ScheduleProvider weekly data, day-name mapping

### Angular Admin — Validation Fixes
- Fixed `profile.component.ts` `mustMatch` validator — replaced `setErrors()`/`setErrors(null)` with clean group-level validation
- Added `<span class="error">` validation messages to 5 forms: students, lecturers, subjects, sections, sheets-add
- Added `form.invalid` disabled state to submit buttons on login, batches, profile, sheets-add, and all 5 modal forms

### Bug Fixes
- Routine screen: removed `const` from non-const-expressions (`Colors.grey.shade500`)
- Attendance screen: removed unused import of `attendance.dart` model
- API port: corrected from 5000 to 5001 to match Docker compose mapping

## Docker Setup Note
- Backend in Docker (`backend/docker-compose.yml`) maps container port 5000 → host port 5001 (`BACKEND_PUBLISH_PORT:-5001`)
- Flutter default URL uses port 5001 for both web (`localhost:5001`) and Android (`10.0.2.2:5001`)

## Key Files
| File | Purpose |
|------|---------|
| `lib/services/api_client.dart` | HTTP client, JWT token, base URL |
| `lib/services/auth_service.dart` | Login/logout/profile API calls |
| `lib/services/dashboard_provider.dart` | Dashboard data state management |
| `lib/services/attendance_provider.dart` | Attendance state management |
| `lib/services/schedule_provider.dart` | Schedule state management |
| `lib/services/notification_provider.dart` | Notification state management |
| `backend/src/controllers/studentPortalController.js` | Student API controllers |
| `backend/src/routes/studentPortalRoutes.js` | Student API routes + Swagger docs |
| `backend/src/config/swagger.js` | OpenAPI schema definitions |
