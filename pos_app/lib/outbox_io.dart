import 'dart:io';

import 'package:sqflite_common_ffi/sqflite_ffi.dart';

class Outbox {
  Database? _db;
  bool _ffiReady = false;

  Future<Database> _open() async {
    if (_db != null) return _db!;
    if (!_ffiReady && (Platform.isWindows || Platform.isLinux)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
      _ffiReady = true;
    }
    final dir = await getDatabasesPath();
    _db = await openDatabase(
      '$dir/selfx_pos.db',
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE outbox (
            client_uuid TEXT PRIMARY KEY,
            cash_tender_paise INTEGER NOT NULL,
            lines TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE catalog (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT NOT NULL,
            paise INTEGER NOT NULL
          )
        ''');
      },
    );
    return _db!;
  }

  Future<void> saveCatalog(List<Map<String, Object?>> items) async {
    final db = await _open();
    final batch = db.batch();
    batch.delete('catalog');
    for (final item in items) {
      batch.insert('catalog', item);
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, Object?>>> catalog() async {
    final db = await _open();
    return db.query('catalog', orderBy: 'name');
  }

  Future<void> park(String clientUuid, int tender, String linesJson) async {
    final db = await _open();
    await db.insert('outbox', {
      'client_uuid': clientUuid,
      'cash_tender_paise': tender,
      'lines': linesJson,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, Object?>>> pending() async {
    final db = await _open();
    return db.query('outbox', orderBy: 'created_at');
  }

  Future<void> clear() async {
    final db = await _open();
    await db.delete('outbox');
  }
}
