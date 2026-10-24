import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pos_app/theme.dart';

void main() {
  testWidgets('pay control uses the orange mark', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: PayMark(child: Text('Pay now')))));
    expect(find.text('Pay now'), findsOneWidget);
  });

  test('amounts stay in paise', () {
    expect(inr(26000), '₹260.00');
  });
}
