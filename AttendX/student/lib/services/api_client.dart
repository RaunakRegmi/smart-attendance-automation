import 'dart:async';
import 'dart:convert';
import 'dart:io' show SocketException;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String _baseUrlKey = 'api_base_url';
  static const String _tokenKey = 'auth_token';

  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:5001';
    }
    return 'https://crowbar-unpledged-coming.ngrok-free.dev';
  }

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_baseUrlKey);
    if (saved != null && saved.contains('10.0.2.2')) {
      await prefs.remove(_baseUrlKey);
      return defaultBaseUrl;
    }
    return defaultBaseUrl;
  }

  static Future<void> clearBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_baseUrlKey);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (auth) {
      final token = await getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  static Future<Map<String, dynamic>> _http(Future<http.Response> request) async {
    try {
      final response = await request.timeout(const Duration(seconds: 30));
      return _handleResponse(response);
    } on SocketException {
      throw ApiException(statusCode: 0, message: 'Cannot reach server. Check your connection.');
    } on TimeoutException {
      throw ApiException(statusCode: 0, message: 'Connection timed out. Server may be down.');
    } on http.ClientException {
      throw ApiException(statusCode: 0, message: 'Server unreachable. Please try again.');
    } on FormatException {
      throw ApiException(statusCode: 502, message: 'Server unreachable. Please try again.');
    } catch (_) {
      throw ApiException(statusCode: 0, message: 'Something went wrong. Please try again.');
    }
  }

  static Future<Map<String, dynamic>> get(String path, {Map<String, String>? queryParams}) async {
    final baseUrl = await getBaseUrl();
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: queryParams);
    return _http(http.get(uri, headers: await _headers()));
  }

  static Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body, bool auth = true}) async {
    final baseUrl = await getBaseUrl();
    final uri = Uri.parse('$baseUrl$path');
    return _http(http.post(uri, headers: await _headers(auth: auth), body: body != null ? jsonEncode(body) : null));
  }

  static Future<Map<String, dynamic>> put(String path, {Map<String, dynamic>? body}) async {
    final baseUrl = await getBaseUrl();
    final uri = Uri.parse('$baseUrl$path');
    return _http(http.put(uri, headers: await _headers(), body: body != null ? jsonEncode(body) : null));
  }

  static Future<Map<String, dynamic>> uploadFile(String path, String filePath, {required String fieldName}) async {
    final baseUrl = await getBaseUrl();
    final uri = Uri.parse('$baseUrl$path');
    final token = await getToken();
    final request = http.MultipartRequest('POST', uri);
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(await http.MultipartFile.fromPath(fieldName, filePath));
    try {
      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } on SocketException {
      throw ApiException(statusCode: 0, message: 'Cannot reach server. Check your connection.');
    } on TimeoutException {
      throw ApiException(statusCode: 0, message: 'Connection timed out. Server may be down.');
    } on http.ClientException {
      throw ApiException(statusCode: 0, message: 'Server unreachable. Please try again.');
    } on FormatException {
      throw ApiException(statusCode: 502, message: 'Server unreachable. Please try again.');
    } catch (_) {
      throw ApiException(statusCode: 0, message: 'Something went wrong. Please try again.');
    }
  }

  static Future<String> getFullImageUrl(String? relativePath) async {
    if (relativePath == null || relativePath.isEmpty) return '';
    final baseUrl = await getBaseUrl();
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      final uri = Uri.parse(relativePath);
      if (uri.host == 'localhost' || uri.host == '10.0.2.2' || uri.host == '127.0.0.1') {
        return '$baseUrl${uri.path}';
      }
      return relativePath;
    }
    return '$baseUrl$relativePath';
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    Map<String, dynamic>? data;
    try {
      data = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException(
        statusCode: response.statusCode >= 500 ? response.statusCode : 502,
        message: response.statusCode >= 500
            ? 'Something went wrong. Please try again.'
            : 'Server unreachable. Please try again.',
      );
    }
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    }
    throw ApiException(
      statusCode: response.statusCode,
      message: data['message'] as String? ?? 'Something went wrong. Please try again.',
      errors: data['errors'] as List?,
    );
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final List? errors;

  ApiException({required this.statusCode, required this.message, this.errors});

  @override
  String toString() => 'ApiException($statusCode): $message';
}
