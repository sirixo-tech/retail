import 'dart:async';
import 'package:flutter/material.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/pos_ui.dart';
import 'package:pos_app/theme.dart';

class PairScreen extends StatefulWidget {
  const PairScreen({super.key, this.onPaired});
  final VoidCallback? onPaired;

  @override
  State<PairScreen> createState() => _PairScreenState();
}

class _PairScreenState extends State<PairScreen> {
  String? _pairingCode;
  bool _loading = true;
  String? _error;
  Timer? _pollTimer;
  bool _pairedSuccess = false;
  Map<String, dynamic>? _pairedCounter;

  @override
  void initState() {
    super.initState();
    _generateCode();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _generateCode() async {
    _pollTimer?.cancel();
    setState(() {
      _loading = true;
      _error = null;
      _pairedSuccess = false;
    });

    try {
      final res = await Api.instance.generatePairCode();
      if (!mounted) return;
      final raw = res['raw_code'] as String? ?? '';
      final formatted = res['pairing_code'] as String? ??
          (raw.length == 6 ? '${raw.substring(0, 3)}-${raw.substring(3)}' : raw);

      setState(() {
        _pairingCode = formatted;
        _loading = false;
      });

      // Start polling status every 3 seconds
      _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) => _pollStatus(raw));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to generate code. Please check server connection.';
        _loading = false;
      });
    }
  }

  Future<void> _pollStatus(String code) async {
    if (!mounted || _pairedSuccess) return;
    try {
      final res = await Api.instance.checkPairStatus(code);
      if (res['paired'] == true && mounted) {
        _pollTimer?.cancel();
        final counter = (res['counter'] as Map<String, dynamic>?) ?? {};
        setState(() {
          _pairedSuccess = true;
          _pairedCounter = counter;
        });

        // Save pairing metadata
        await Api.instance.savePairingInfo(
          storeId: counter['store_id']?.toString() ?? '',
          storeName: counter['store_name']?.toString() ?? 'Store',
          terminalCode: counter['counter_code']?.toString(),
          terminalName: counter['counter_name']?.toString(),
          tenantSlug: counter['tenant_slug']?.toString(),
        );

        if (mounted) {
          showPosSnackBar(
            context,
            'Successfully paired to ${counter['store_name']} (${counter['counter_code'] ?? 'Terminal'})!',
          );

          await Future<void>.delayed(const Duration(milliseconds: 1200));
          if (!mounted) return;
          if (widget.onPaired != null) {
            widget.onPaired!();
          } else {
            Navigator.of(context).pop(true);
          }
        }
      }
    } catch (_) {
      // Background poll failure: ignore and retry
    }
  }

  @override
  Widget build(BuildContext context) {
    final accent = PosTheme.accent;
    final soft = posAccentSoft(accent);

    final form = PosSurfaceCard(
      padding: const EdgeInsets.fromLTRB(28, 28, 28, 24),
      maxWidth: 440,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Icon Mark
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: soft.bg,
              borderRadius: BorderRadius.circular(PosTheme.radiusLg),
              border: Border.all(color: accent.withValues(alpha: 0.2)),
            ),
            child: Icon(
              Icons.tablet_mac_rounded,
              color: accent,
              size: 38,
            ),
          ),
          const SizedBox(height: 16),

          const Text(
            'Pair this POS Tablet',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: PosTheme.inkLight,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Link this device to a registered POS counter',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: PosTheme.inkMutedLight,
            ),
          ),
          const SizedBox(height: 18),

          // Instructions Box
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: PosTheme.surfaceMutedLight,
              borderRadius: BorderRadius.circular(PosTheme.radiusMd),
              border: Border.all(color: PosTheme.borderLight),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  size: 18,
                  color: PosTheme.inkMutedLight,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: PosTheme.inkLight,
                        height: 1.4,
                      ),
                      children: [
                        const TextSpan(text: 'On the web console, navigate to\n'),
                        TextSpan(
                          text: 'Settings / Devices → POS Terminals → Pair Tablet',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: PosTheme.inkLight,
                          ),
                        ),
                        const TextSpan(text: ' and enter this 6-digit code.'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Big 6-Digit Code Badge
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            decoration: BoxDecoration(
              color: _pairedSuccess ? const Color(0xFFF0FDF4) : soft.bg,
              borderRadius: BorderRadius.circular(PosTheme.radiusLg),
              border: Border.all(
                color: _pairedSuccess ? const Color(0xFF22C55E) : accent.withValues(alpha: 0.25),
                width: 1.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: (_pairedSuccess ? const Color(0xFF22C55E) : accent).withValues(alpha: 0.08),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: _loading
                ? const Center(
                    child: SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: PosTheme.accent),
                    ),
                  )
                : Text(
                    _pairingCode ?? '------',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 38,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 6,
                      color: _pairedSuccess ? const Color(0xFF16A34A) : accent,
                    ),
                  ),
          ),
          const SizedBox(height: 18),

          // Polling status / spinner
          if (_pairedSuccess) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle_rounded, color: Color(0xFF15803D), size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Paired to ${_pairedCounter?['store_name'] ?? 'Store'}!',
                    style: const TextStyle(
                      color: Color(0xFF15803D),
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: accent,
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Waiting for manager confirmation on web...',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: PosTheme.inkMutedLight,
                  ),
                ),
              ],
            ),
          ],

          if (_error != null) ...[
            const SizedBox(height: 14),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFFB91C1C),
                fontWeight: FontWeight.w600,
                fontSize: 12.5,
              ),
            ),
          ],

          const SizedBox(height: 24),

          // Action buttons
          OutlinedButton.icon(
            onPressed: _loading ? null : _generateCode,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Generate new code'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 46),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(PosTheme.radiusMd),
              ),
            ),
          ),
          const SizedBox(height: 10),

          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text(
              'Sign in with password instead',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
            ),
          ),
        ],
      ),
    );

    return PosAuthScaffold(
      statusLabel: 'Device Pairing',
      statusIcon: Icons.link_rounded,
      headline: 'Register Pairing',
      subtitle: 'Seamlessly bind physical tablets with your central store counter setup.',
      form: form,
    );
  }
}
