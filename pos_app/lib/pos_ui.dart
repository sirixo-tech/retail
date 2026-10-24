import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/theme.dart';

/// Soft background and foreground colors derived from an accent color.
({Color bg, Color fg}) posAccentSoft(Color accent) {
  return (
    bg: accent.withValues(alpha: 0.08),
    fg: Color.lerp(accent, const Color(0xFF0F172A), 0.25)!,
  );
}

/// Floating SnackBar with modern rounded shape and clean typography.
void showPosSnackBar(
  BuildContext context,
  String message, {
  bool error = false,
  Duration duration = const Duration(seconds: 4),
}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return;

  messenger.clearSnackBars();
  messenger.showSnackBar(
    SnackBar(
      behavior: SnackBarBehavior.floating,
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(PosTheme.radiusMd),
      ),
      backgroundColor: error ? const Color(0xFF991B1B) : const Color(0xFF0F172A),
      duration: duration,
      content: Row(
        children: [
          Icon(
            error ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded,
            color: Colors.white,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 13.5,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

/// Primary button with brand gradient, subtle elevation glow, and smooth loading state.
class PosPrimaryButton extends StatelessWidget {
  const PosPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
    this.expanded = true,
    this.color,
    this.height = 50,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;
  final bool expanded;
  final Color? color;
  final double height;

  @override
  Widget build(BuildContext context) {
    final accent = color ?? PosTheme.accent;
    final enabled = onPressed != null && !loading;

    final button = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(PosTheme.radiusMd),
        gradient: enabled ? PosTheme.ctaGradient(accent) : null,
        color: enabled ? null : PosTheme.borderLight,
        boxShadow: enabled ? PosTheme.buttonShadow(accent) : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: enabled ? onPressed : null,
          borderRadius: BorderRadius.circular(PosTheme.radiusMd),
          child: Container(
            height: height,
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: loading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: Colors.white,
                    ),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (icon != null) ...[
                        Icon(icon, size: 20, color: Colors.white),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        label,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );

    if (!expanded) return button;
    return SizedBox(width: double.infinity, child: button);
  }
}

/// High-contrast surface card for auth forms, modals, and settings.
class PosSurfaceCard extends StatelessWidget {
  const PosSurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(24),
    this.maxWidth = 440,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: PosTheme.surfaceLight,
          borderRadius: BorderRadius.circular(PosTheme.radiusXl),
          border: Border.all(color: PosTheme.borderLight, width: 1.2),
          boxShadow: PosTheme.cardShadow(),
        ),
        child: child,
      ),
    );
  }
}

/// Selectable branch/terminal tile with prominent title, address subtitle, and active checkmark.
class PosSelectTile extends StatelessWidget {
  const PosSelectTile({
    super.key,
    required this.title,
    this.subtitle,
    this.tag,
    this.selected = false,
    required this.onTap,
    this.leading,
    this.enabled = true,
  });

  final String title;
  final String? subtitle;
  final String? tag;
  final bool selected;
  final VoidCallback onTap;
  final Widget? leading;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final accent = PosTheme.accent;
    final soft = posAccentSoft(accent);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(PosTheme.radiusMd),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: selected ? soft.bg : PosTheme.surfaceLight,
            borderRadius: BorderRadius.circular(PosTheme.radiusMd),
            border: Border.all(
              color: selected ? accent : PosTheme.borderLight,
              width: selected ? 1.8 : 1,
            ),
            boxShadow: selected ? PosTheme.cardShadow(accent) : null,
          ),
          child: Row(
            children: [
              if (leading != null) ...[
                leading!,
                const SizedBox(width: 14),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                              color: selected ? accent : PosTheme.inkLight,
                            ),
                          ),
                        ),
                        if (tag != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: PosTheme.surfaceMutedLight,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: PosTheme.borderLight),
                            ),
                            child: Text(
                              tag!,
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w700,
                                color: PosTheme.inkMutedLight,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (subtitle != null && subtitle!.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        subtitle!,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: PosTheme.inkMutedLight,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? accent : Colors.transparent,
                  border: Border.all(
                    color: selected ? accent : PosTheme.inkFaintLight,
                    width: 1.8,
                  ),
                ),
                child: selected
                    ? const Icon(Icons.check, size: 16, color: Colors.white)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Auth layout with a rich left hero panel on tablet/desktop landscape,
/// and a centered vertical layout on phones.
class PosAuthScaffold extends StatefulWidget {
  const PosAuthScaffold({
    super.key,
    required this.form,
    required this.statusLabel,
    this.statusIcon = Icons.point_of_sale_rounded,
    this.headline = 'SelfX Retail POS',
    this.subtitle = 'High-performance cloud & offline retail terminal',
    this.showClock = true,
  });

  final Widget form;
  final String statusLabel;
  final IconData statusIcon;
  final String headline;
  final String subtitle;
  final bool showClock;

  @override
  State<PosAuthScaffold> createState() => _PosAuthScaffoldState();
}

class _PosAuthScaffoldState extends State<PosAuthScaffold> {
  Timer? _clockTimer;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    if (widget.showClock) {
      _clockTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        if (mounted) setState(() => _now = DateTime.now());
      });
    }
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 860;
    final accent = PosTheme.accent;

    if (wide) {
      return Scaffold(
        backgroundColor: PosTheme.canvasLight,
        body: Row(
          children: [
            // Left Hero Panel
            Expanded(
              flex: 5,
              child: Container(
                decoration: BoxDecoration(
                  gradient: PosTheme.brandGradient(accent),
                ),
                child: Stack(
                  children: [
                    // Ambient Glow Circles
                    Positioned(
                      right: -80,
                      top: -60,
                      child: Container(
                        width: 280,
                        height: 280,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.08),
                        ),
                      ),
                    ),
                    Positioned(
                      left: -100,
                      bottom: -80,
                      child: Container(
                        width: 320,
                        height: 320,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.06),
                        ),
                      ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(48, 40, 48, 32),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Status Pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.16),
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(widget.statusIcon, size: 15, color: Colors.white),
                                  const SizedBox(width: 8),
                                  Text(
                                    widget.statusLabel,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                      letterSpacing: 0.3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Spacer(flex: 2),

                            // Brand Logo Mark
                            Container(
                              width: 68,
                              height: 68,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.18),
                                    blurRadius: 24,
                                    offset: const Offset(0, 10),
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Text(
                                  'S',
                                  style: TextStyle(
                                    fontSize: 34,
                                    fontWeight: FontWeight.w900,
                                    color: accent,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 22),

                            // Headline
                            Text(
                              widget.headline,
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                                letterSpacing: -0.5,
                                height: 1.15,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              widget.subtitle,
                              style: TextStyle(
                                fontSize: 15,
                                color: Colors.white.withValues(alpha: 0.85),
                                height: 1.4,
                              ),
                            ),
                            const Spacer(flex: 3),

                            // Clock & Host
                            if (widget.showClock) ...[
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text(
                                    DateFormat('h:mm').format(_now),
                                    style: const TextStyle(
                                      fontSize: 44,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                      letterSpacing: -1,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    DateFormat('a').format(_now),
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white.withValues(alpha: 0.9),
                                    ),
                                  ),
                                ],
                              ),
                              Text(
                                DateFormat('EEEE · MMM d').format(_now),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white.withValues(alpha: 0.8),
                                ),
                              ),
                              const SizedBox(height: 14),
                            ],

                            // Server connection badge
                            Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Color(0xFF4ADE80),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  Api.instance.baseUrl.replaceAll(RegExp(r'^https?://'), ''),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.white.withValues(alpha: 0.75),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Right Form Column
            Expanded(
              flex: 6,
              child: SafeArea(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
                    child: widget.form,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Narrow layout (Phones / small tablets)
    return Scaffold(
      backgroundColor: PosTheme.canvasLight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top Brand Mark
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: PosTheme.buttonShadow(accent),
                  ),
                  child: const Center(
                    child: Text(
                      'S',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                widget.form,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Dialog allowing user to inspect and change server URL (defaults to retail.sirixo.com)
Future<void> showServerSelectorDialog(BuildContext context, {required VoidCallback onSaved}) async {
  final controller = TextEditingController(text: Api.instance.baseUrl);
  String? error;

  await showDialog<void>(
    context: context,
    builder: (dialogContext) {
      return StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(PosTheme.radiusLg),
            ),
            title: const Row(
              children: [
                Icon(Icons.dns_rounded, size: 22, color: PosTheme.accent),
                SizedBox(width: 10),
                Text('Server Connection', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
              ],
            ),
            content: SizedBox(
              width: 420,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Set the SelfX retail backend host. Changing this signs out the current session.',
                    style: TextStyle(color: PosTheme.inkMutedLight, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    controller: controller,
                    autofocus: true,
                    decoration: InputDecoration(
                      labelText: 'Server URL',
                      hintText: 'https://retail.sirixo.com',
                      errorText: error,
                      prefixIcon: const Icon(Icons.cloud_outlined),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  controller.text = 'https://retail.sirixo.com';
                  setDialogState(() => error = null);
                },
                child: const Text('Reset to Default'),
              ),
              FilledButton(
                onPressed: () async {
                  var url = controller.text.trim();
                  if (url.isEmpty) {
                    setDialogState(() => error = 'Please enter a valid URL');
                    return;
                  }
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://$url';
                  }
                  await Api.instance.setBaseUrl(url);
                  if (dialogContext.mounted) {
                    Navigator.of(dialogContext).pop();
                    onSaved();
                  }
                },
                child: const Text('Save & Apply'),
              ),
            ],
          );
        },
      );
    },
  );
  controller.dispose();
}
