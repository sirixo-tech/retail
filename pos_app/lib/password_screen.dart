import 'package:flutter/material.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/pos_ui.dart';
import 'package:pos_app/theme.dart';

class PasswordScreen extends StatefulWidget {
  const PasswordScreen({super.key, required this.onChanged});
  final Future<void> Function() onChanged;

  @override
  State<PasswordScreen> createState() => _PasswordScreenState();
}

class _PasswordScreenState extends State<PasswordScreen> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final nextText = _next.text;
    if (nextText.length < 8) {
      setState(() => _error = 'New password must be at least 8 characters long.');
      return;
    }
    if (_confirm.text != nextText) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await Api.instance.post('/api/v1/auth/staff/password/change', body: {
        'password': nextText,
        'password_confirmation': _confirm.text,
      });
      await widget.onChanged();
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not update password. Please try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final form = PosSurfaceCard(
      padding: const EdgeInsets.all(28),
      maxWidth: 440,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Change initial password',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: PosTheme.inkLight,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'For security, you must update the temporary password before billing.',
            style: TextStyle(
              fontSize: 13,
              color: PosTheme.inkMutedLight,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _next,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'New password',
              prefixIcon: Icon(Icons.lock_outline_rounded),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirm,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Confirm new password',
              prefixIcon: Icon(Icons.lock_outline_rounded),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(PosTheme.radiusSm),
                border: Border.all(color: const Color(0xFFDC2626).withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 18, color: Color(0xFFB91C1C)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFFB91C1C),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 22),
          PosPrimaryButton(
            label: 'Save & Continue to Register',
            icon: Icons.check_circle_outline_rounded,
            loading: _busy,
            onPressed: _save,
          ),
        ],
      ),
    );

    return PosAuthScaffold(
      statusLabel: 'Security Setup',
      statusIcon: Icons.security_rounded,
      headline: 'Secure Password',
      subtitle: 'Keep your counter transactions and inventory management secure.',
      form: form,
    );
  }
}
