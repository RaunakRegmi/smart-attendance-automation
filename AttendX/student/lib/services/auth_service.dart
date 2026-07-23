import 'dart:convert';
import 'api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const _userKey = 'auth_user_data';

  static Future<Map<String, dynamic>> login(String email, String password, {bool rememberMe = false}) async {
    final response = await ApiClient.post(
      '/api/auth/login',
      body: {'email': email, 'password': password, 'rememberMe': rememberMe},
      auth: false,
    );

    final token = response['data']['token'] as String;
    await ApiClient.setToken(token);

    final userData = response['data'] as Map<String, dynamic>;
    await _saveUserData(userData);

    return userData;
  }

  static Future<Map<String, dynamic>> getProfile() async {
    return ApiClient.get('/api/auth/me');
  }

  static Future<void> updateProfile(Map<String, dynamic> data) async {
    await ApiClient.put('/api/auth/profile', body: data);
  }

  static Future<Map<String, dynamic>> updateStudentProfile(Map<String, dynamic> data) async {
    return ApiClient.put('/api/student/profile', body: data);
  }

  static Future<Map<String, dynamic>> uploadProfilePhoto(String filePath) async {
    return ApiClient.uploadFile('/api/student/profile/photo', filePath, fieldName: 'photo');
  }

  static Future<void> changePassword(String currentPassword, String newPassword, String confirmPassword) async {
    await ApiClient.put('/api/auth/password', body: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
      'confirmPassword': confirmPassword,
    });
  }

  static Future<void> logout() async {
    try {
      await ApiClient.post('/api/auth/logout', auth: true);
    } catch (_) {
      // Best-effort: even if the server is unreachable, still clear local state
    }
    await ApiClient.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
  }

  static Future<bool> isLoggedIn() async {
    final token = await ApiClient.getToken();
    return token != null && token.isNotEmpty;
  }

  static Future<Map<String, dynamic>?> getSavedUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_userKey);
    if (data != null) {
      return jsonDecode(data) as Map<String, dynamic>;
    }
    return null;
  }

  static Future<void> _saveUserData(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(data));
  }
}
