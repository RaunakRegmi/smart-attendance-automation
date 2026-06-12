# Session Context

## Goal
Set up Android development environment, connect physical device (Huawei P10), and run the Flutter app with backend connectivity.

## What was accomplished
1. **Android SDK Installation**:
   - Installed Android SDK platform tools, command-line tools, platform 34, and build tools via apt and sdkmanager
   - Configured Flutter to use SDK at `~/Android`
   - Added `JAVA_HOME` (OpenJDK 17) and `ANDROID_HOME` env vars

2. **Android Platform Files**:
   - Regenerated missing `android/` directory for the Flutter project using `flutter create --platforms=android .`
   - Fixed build errors: added core library desugaring for `flutter_local_notifications`
   - Updated NDK version from default to `27.0.12077973` (required by plugins)

3. **Device Connection**:
   - Connected Huawei P10 (MAR-LX2J) via USB with USB debugging enabled
   - Authorized the device via RSA key prompt on the phone
   - Flutter app builds and installs successfully on the physical device

4. **Backend Connectivity (ngrok)**:
   - Installed ngrok (v3.39.7) and configured with auth token
   - Started ngrok tunnel to local backend (port 5001)
   - Public URL: `https://crowbar-unpledged-coming.ngrok-free.dev`
   - Updated `api_client.dart` default base URL to use ngrok URL
   - Added cleanup logic in `getBaseUrl()` to remove old `10.0.2.2` SharedPreferences values

5. **Dashboard Null Crash Fix** (`dashboard_provider.dart`):
   - Set initial `_isLoading = true` so the first build shows loading spinner instead of crashing on null `data!`

## Pending / Next Steps
- Verify backend is running and accessible via ngrok URL
- Test full login flow and dashboard data loading on the phone
- The app currently shows "Could not connect to server" — may need to check if backend Docker container is running

## Key Decisions
- Used ngrok to expose local backend to physical device (since `10.0.2.2` only works on Android emulator)
- Placed Android SDK in `~/Android` (user-writable) rather than system directories (requires sudo)
- Used `SharedPreferences` cleanup logic to prevent stale emulator URLs from persisting

## Files Modified
- `AttendX/student/lib/services/api_client.dart` — Updated defaultBaseUrl to ngrok, added old URL cleanup
- `AttendX/student/lib/services/dashboard_provider.dart` — Fixed initial loading state (`_isLoading = true`)
- `AttendX/student/android/app/build.gradle.kts` — Added coreLibraryDesugaring, fixed ndkVersion
