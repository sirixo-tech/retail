import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class Outbox {
  static const _pendingKey = 'pos_outbox';
  static const _catalogKey = 'pos_catalog';

  Future<void> saveCatalog(List<Map<String, Object?>> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_catalogKey, jsonEncode(items));
  }

  Future<List<Map<String, Object?>>> catalog() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_catalogKey);
    if (raw == null) return [];
    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded.cast<Map<String, dynamic>>().map((row) => Map<String, Object?>.from(row)).toList();
  }

  Future<void> park(String clientUuid, int tender, String linesJson) async {
    final rows = await pending();
    rows.add({
      'client_uuid': clientUuid,
      'cash_tender_paise': tender,
      'lines': linesJson,
      'created_at': DateTime.now().toIso8601String(),
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_pendingKey, jsonEncode(rows));
  }

  Future<List<Map<String, Object?>>> pending() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_pendingKey);
    if (raw == null) return [];
    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded.cast<Map<String, dynamic>>().map((row) => Map<String, Object?>.from(row)).toList();
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingKey);
  }
}
