import 'package:flutter/material.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/branch_picker_screen.dart';
import 'package:pos_app/pair_screen.dart';
import 'package:pos_app/pos_ui.dart';
import 'package:pos_app/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, required this.onSignedIn});
  final Future<void> Function() onSignedIn;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  bool _obscure = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSavedEmail();
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  Future<void> _loadSavedEmail() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('saved_staff_email');
    if (saved != null && saved.isNotEmpty && mounted) {
      _email.text = saved;
    }
  }

  Future<void> _submit() async {
    final emailText = _email.text.trim();
    final passText = _password.text;

    if (emailText.isEmpty || passText.isEmpty) {
      setState(() => _error = 'Please enter both email and password.');
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final res = await Api.instance.login(
        email: emailText,
        password: passText,
      );

      // Save email for next time
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('saved_staff_email', emailText);

      if (!mounted) return;

      // Check if branch selection is requested
      final requireBranch = res['require_branch_selection'] == true;
      final rawBranches = res['branches'] as List<dynamic>?;
      final branches = (rawBranches ?? []).cast<Map<String, dynamic>>();

      if (requireBranch && branches.isNotEmpty) {
        // Automatically open the branch picker
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => BranchPickerScreen(
              branches: branches,
              onSelected: () async {
                Navigator.of(context).pop();
                await widget.onSignedIn();
              },
              onSignOut: () async {
                await Api.instance.clearSession();
                if (mounted) Navigator.of(context).pop();
              },
            ),
          ),
        );
      } else {
        await widget.onSignedIn();
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = e.message);
        showPosSnackBar(context, e.message, error: true);
      }
    } catch (_) {
      if (mounted) {
        const msg = 'Unable to sign in. Please verify your connection.';
        setState(() => _error = msg);
        showPosSnackBar(context, msg, error: true);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final accent = PosTheme.accent;
    final soft = posAccentSoft(accent);
    final pairedStore = Api.instance.pairedStoreName;
    final pairedCode = Api.instance.pairedTerminalCode;
    final isPaired = pairedStore != null && pairedStore.isNotEmpty;

    final form = PosSurfaceCard(
      padding: const EdgeInsets.all(28),
      maxWidth: 440,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Sign in to register',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: PosTheme.inkLight,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Enter your staff credentials to open the checkout terminal.',
            style: TextStyle(
              fontSize: 13,
              color: PosTheme.inkMutedLight,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 18),

          // Paired Device Banner (if paired)
          if (isPaired) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: soft.bg,
                borderRadius: BorderRadius.circular(PosTheme.radiusMd),
                border: Border.all(color: accent.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Icon(Icons.tablet_mac_rounded, color: soft.fg, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$pairedStore · Terminal ${pairedCode ?? "T1"}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: soft.fg,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'This device is paired to this store register.',
                          style: TextStyle(
                            fontSize: 11,
                            color: PosTheme.inkMutedLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Unpair device',
                    icon: const Icon(Icons.close_rounded, size: 16),
                    onPressed: () async {
                      await Api.instance.clearPairingInfo();
                      setState(() {});
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
          ],

          // Email
          TextField(
            controller: _email,
            focusNode: _emailFocus,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            onSubmitted: (_) => _passwordFocus.requestFocus(),
            decoration: const InputDecoration(
              labelText: 'Email Address',
              hintText: 'staff@example.com',
              prefixIcon: Icon(Icons.mail_outline_rounded),
            ),
          ),
          const SizedBox(height: 14),

          // Password
          TextField(
            controller: _password,
            focusNode: _passwordFocus,
            obscureText: _obscure,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: 'Password',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              suffixIcon: IconButton(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(
                  _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  size: 20,
                ),
              ),
            ),
          ),

          // Error box
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

          // Sign In CTA
          PosPrimaryButton(
            label: 'Sign In to Register',
            icon: Icons.login_rounded,
            loading: _busy,
            onPressed: _submit,
          ),
          const SizedBox(height: 16),

          // Divider
          Row(
            children: [
              const Expanded(child: Divider(color: PosTheme.borderLight)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'OR',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: PosTheme.inkFaintLight,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const Expanded(child: Divider(color: PosTheme.borderLight)),
            ],
          ),
          const SizedBox(height: 14),

          // Pair Tablet CTA
          OutlinedButton.icon(
            onPressed: () async {
              final paired = await Navigator.of(context).push<bool>(
                MaterialPageRoute(
                  builder: (_) => PairScreen(
                    onPaired: () {
                      Navigator.of(context).pop(true);
                    },
                  ),
                ),
              );
              if (paired == true) {
                setState(() {});
              }
            },
            icon: const Icon(Icons.tablet_mac_rounded, size: 18),
            label: const Text('Pair counter with 6-digit code'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(PosTheme.radiusMd),
              ),
              foregroundColor: PosTheme.inkLight,
              side: const BorderSide(color: PosTheme.borderLight),
            ),
          ),
          const SizedBox(height: 18),

          // Server connection chip
          Center(
            child: InkWell(
              onTap: () => showServerSelectorDialog(context, onSaved: () => setState(() {})),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: PosTheme.surfaceMutedLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: PosTheme.borderLight),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFF22C55E),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      Api.instance.baseUrl.replaceAll(RegExp(r'^https?://'), ''),
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: PosTheme.inkMutedLight,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.settings_outlined, size: 13, color: PosTheme.inkMutedLight),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );

    return PosAuthScaffold(
      statusLabel: 'SelfX Retail Cloud',
      statusIcon: Icons.store_rounded,
      headline: 'SelfX Retail POS',
      subtitle: 'Fast cloud & offline checkout designed for multi-store retail brands.',
      form: form,
    );
  }
}
