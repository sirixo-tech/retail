import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'cookie_binder_web.dart' if (dart.library.io) 'cookie_binder_io.dart';

class ApiException implements Exception {
  ApiException(this.message, {this.status, this.code});
  final String message;
  final int? status;
  final String? code;

  @override
  String toString() => message;
}

class Api {
  Api._();
  static final Api instance = Api._();

  static const String defaultUrl = 'https://retail.sirixo.com';

  late Dio dio;
  String baseUrl = defaultUrl;

  // Cached pairing metadata
  String? pairedStoreId;
  String? pairedStoreName;
  String? pairedTerminalCode;
  String? pairedTerminalName;
  String? pairedTenantSlug;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedBase = prefs.getString('api_base');
    if (savedBase != null &&
        savedBase.isNotEmpty &&
        !savedBase.contains('127.0.0.1') &&
        !savedBase.contains('localhost')) {
      baseUrl = savedBase;
    } else {
      baseUrl = defaultUrl;
      await prefs.setString('api_base', baseUrl);
    }

    await loadPairingInfo();

    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 25),
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    ));
    await attachCookies(dio);
  }

  Future<void> setBaseUrl(String url) async {
    baseUrl = url.replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_base', baseUrl);
    dio.options.baseUrl = baseUrl;
  }

  Future<void> loadPairingInfo() async {
    final prefs = await SharedPreferences.getInstance();
    pairedStoreId = prefs.getString('paired_store_id');
    pairedStoreName = prefs.getString('paired_store_name');
    pairedTerminalCode = prefs.getString('paired_terminal_code');
    pairedTerminalName = prefs.getString('paired_terminal_name');
    pairedTenantSlug = prefs.getString('paired_tenant_slug');
  }

  Future<void> savePairingInfo({
    required String storeId,
    required String storeName,
    String? terminalCode,
    String? terminalName,
    String? tenantSlug,
  }) async {
    pairedStoreId = storeId;
    pairedStoreName = storeName;
    pairedTerminalCode = terminalCode;
    pairedTerminalName = terminalName;
    pairedTenantSlug = tenantSlug;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('paired_store_id', storeId);
    await prefs.setString('paired_store_name', storeName);
    if (terminalCode != null) await prefs.setString('paired_terminal_code', terminalCode);
    if (terminalName != null) await prefs.setString('paired_terminal_name', terminalName);
    if (tenantSlug != null) await prefs.setString('paired_tenant_slug', tenantSlug);
  }

  Future<void> clearPairingInfo() async {
    pairedStoreId = null;
    pairedStoreName = null;
    pairedTerminalCode = null;
    pairedTerminalName = null;
    pairedTenantSlug = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('paired_store_id');
    await prefs.remove('paired_store_name');
    await prefs.remove('paired_terminal_code');
    await prefs.remove('paired_terminal_name');
    await prefs.remove('paired_tenant_slug');
  }

  Future<void> clearSession() async {
    await clearCookies();
  }

  // Auth & Pairing convenience methods
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? slug,
    String? storeId,
  }) async {
    final payload = <String, dynamic>{
      'email': email.trim(),
      'password': password,
    };
    if (slug != null && slug.trim().isNotEmpty) {
      payload['slug'] = slug.trim();
    } else if (pairedTenantSlug != null && pairedTenantSlug!.isNotEmpty) {
      payload['slug'] = pairedTenantSlug;
    }
    if (storeId != null && storeId.trim().isNotEmpty) {
      payload['store_id'] = storeId.trim();
    } else if (pairedStoreId != null && pairedStoreId!.isNotEmpty) {
      payload['store_id'] = pairedStoreId;
    }

    return post('/api/v1/auth/staff/login', body: payload);
  }

  Future<Map<String, dynamic>> getMe() async {
    return get('/api/v1/auth/staff/me');
  }

  Future<Map<String, dynamic>> switchStore(String storeId) async {
    return post('/api/v1/auth/switch-store', body: {'store_id': storeId});
  }

  Future<Map<String, dynamic>> generatePairCode() async {
    return get('/api/v1/public/terminals/generate-pair-code');
  }

  Future<Map<String, dynamic>> checkPairStatus(String code) async {
    final cleaned = code.replaceAll(RegExp(r'[^0-9]'), '');
    return get('/api/v1/public/terminals/check-pair-status', query: {'code': cleaned});
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? query}) async {
    return _send(() => dio.get(path, queryParameters: query));
  }

  Future<Map<String, dynamic>> post(String path, {Object? body}) async {
    return _send(() => dio.post(path, data: body));
  }

  Future<Map<String, dynamic>> put(String path, {Object? body}) async {
    return _send(() => dio.put(path, data: body));
  }

  Future<Map<String, dynamic>> delete(String path) async {
    return _send(() => dio.delete(path));
  }

  Future<Map<String, dynamic>> _send(Future<Response<dynamic>> Function() call) async {
    try {
      final response = await call();
      final body = response.data;
      if (body is Map<String, dynamic>) {
        if (body['error'] != null) {
          final error = body['error'] as Map<String, dynamic>;
          throw ApiException(
            error['message'] as String? ?? 'Request failed',
            status: response.statusCode,
            code: error['code'] as String?,
          );
        }
        final data = body['data'];
        if (data is Map<String, dynamic>) return data;
        return {'data': data};
      }
      return {};
    } on DioException catch (error) {
      final response = error.response;
      if (response?.data is Map<String, dynamic>) {
        final body = response!.data as Map<String, dynamic>;
        final apiError = body['error'];
        if (apiError is Map<String, dynamic>) {
          throw ApiException(
            apiError['message'] as String? ?? 'Request failed',
            status: response.statusCode,
            code: apiError['code'] as String?,
          );
        }
      }
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout) {
        if (kIsWeb) {
          throw ApiException(
            'Cannot connect to $baseUrl. If running on Chrome Web, ensure backend CORS is deployed or run natively.',
            status: 0,
            code: 'offline',
          );
        }
        throw ApiException('No connection to server ($baseUrl)', status: 0, code: 'offline');
      }
      throw ApiException(
        error.message ?? 'Request failed',
        status: response?.statusCode,
      );
    }
  }
}
