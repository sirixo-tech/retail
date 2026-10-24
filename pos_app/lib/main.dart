import 'package:flutter/material.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/branch_picker_screen.dart';
import 'package:pos_app/password_screen.dart';
import 'package:pos_app/pos_screen.dart';
import 'package:pos_app/sign_in_screen.dart';
import 'package:pos_app/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.instance.init();
  runApp(const PosApp());
}

class PosApp extends StatelessWidget {
  const PosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SelfX Retail POS',
      debugShowCheckedModeBanner: false,
      theme: posTheme(),
      home: const Gate(),
    );
  }
}

class Gate extends StatefulWidget {
  const Gate({super.key});

  @override
  State<Gate> createState() => _GateState();
}

class _GateState extends State<Gate> {
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final me = await Api.instance.getMe();
      if (!mounted) return;
      setState(() {
        _profile = me;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _profile = null;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: PosTheme.canvasLight,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: PosTheme.accent,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: PosTheme.buttonShadow(PosTheme.accent),
                ),
                child: const Center(
                  child: Text(
                    'S',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: PosTheme.accent,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_profile == null) {
      return SignInScreen(onSignedIn: _load);
    }

    if (_profile!['must_change_password'] == true) {
      return PasswordScreen(onChanged: _load);
    }

    final currentStore = _profile!['store'] as Map<String, dynamic>?;
    final allStores = (_profile!['allStores'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [];

    // If somehow user has no active store assigned, show branch picker
    if (currentStore == null && allStores.isNotEmpty) {
      return BranchPickerScreen(
        branches: allStores,
        onSelected: _load,
        onSignOut: () async {
          await Api.instance.clearSession();
          await _load();
        },
      );
    }

    return PosScreen(
      profile: _profile!,
      onSignedOut: () async {
        await Api.instance.clearSession();
        await _load();
      },
      onSwitchStore: allStores.length > 1
          ? () async {
              await Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => BranchPickerScreen(
                    branches: allStores,
                    currentStoreId: currentStore?['id'] as String?,
                    onSelected: () async {
                      Navigator.of(context).pop();
                      await _load();
                    },
                    onSignOut: () async {
                      await Api.instance.clearSession();
                      if (context.mounted) {
                        Navigator.of(context).pop();
                        await _load();
                      }
                    },
                  ),
                ),
              );
            }
          : null,
    );
  }
}
