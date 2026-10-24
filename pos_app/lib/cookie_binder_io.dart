import 'dart:io';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:path_provider/path_provider.dart';

PersistCookieJar? _jar;

Future<void> attachCookies(Dio dio) async {
  final dir = await getApplicationSupportDirectory();
  final cookieDir = Directory('${dir.path}/cookies');
  await cookieDir.create(recursive: true);
  _jar = PersistCookieJar(storage: FileStorage(cookieDir.path));
  dio.interceptors.add(CookieManager(_jar!));
}

Future<void> clearCookies() async {
  await _jar?.deleteAll();
}
