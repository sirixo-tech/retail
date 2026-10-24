import 'package:dio/dio.dart';
import 'package:dio/browser.dart';

Future<void> attachCookies(Dio dio) async {
  dio.httpClientAdapter = BrowserHttpClientAdapter(withCredentials: true);
}

Future<void> clearCookies() async {}
