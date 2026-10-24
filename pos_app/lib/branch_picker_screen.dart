import 'package:flutter/material.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/pos_ui.dart';
import 'package:pos_app/theme.dart';

class BranchPickerScreen extends StatefulWidget {
  const BranchPickerScreen({
    super.key,
    required this.branches,
    this.currentStoreId,
    required this.onSelected,
    this.onSignOut,
  });

  final List<Map<String, dynamic>> branches;
  final String? currentStoreId;
  final Future<void> Function() onSelected;
  final VoidCallback? onSignOut;

  @override
  State<BranchPickerScreen> createState() => _BranchPickerScreenState();
}

class _BranchPickerScreenState extends State<BranchPickerScreen> {
  late String? _selectedId;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Default to currently selected or first default or first branch
    _selectedId = widget.currentStoreId ??
        widget.branches.firstWhere(
          (b) => b['is_default'] == true,
          orElse: () => widget.branches.isNotEmpty ? widget.branches.first : <String, dynamic>{},
        )['id'] as String?;

    if (_selectedId == null && widget.branches.isNotEmpty) {
      _selectedId = widget.branches.first['id'] as String?;
    }
  }

  Future<void> _submit() async {
    final selected = _selectedId;
    if (selected == null) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await Api.instance.switchStore(selected);
      await widget.onSelected();
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = e.message);
        showPosSnackBar(context, e.message, error: true);
      }
    } catch (_) {
      if (mounted) {
        const msg = 'Failed to switch branch. Please try again.';
        setState(() => _error = msg);
        showPosSnackBar(context, msg, error: true);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final form = PosSurfaceCard(
      padding: const EdgeInsets.all(28),
      maxWidth: 480,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: posAccentSoft(PosTheme.accent).bg,
                  borderRadius: BorderRadius.circular(PosTheme.radiusMd),
                ),
                child: const Icon(
                  Icons.storefront_rounded,
                  color: PosTheme.accent,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Choose store location',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: PosTheme.inkLight,
                        letterSpacing: -0.3,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Select the branch for this counter session',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: PosTheme.inkMutedLight,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Divider(height: 1, color: PosTheme.borderLight),
          const SizedBox(height: 18),

          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 340),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: widget.branches.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final b = widget.branches[index];
                final id = b['id'] as String;
                final name = b['name'] as String? ?? 'Branch';
                final code = b['code'] as String?;
                final city = b['city'] as String?;
                final address = b['address'] as String?;
                final isDefault = b['is_default'] == true;

                final sub = [
                  if (address != null && address.isNotEmpty) address,
                  if (city != null && city.isNotEmpty) city,
                  if (code != null && code.isNotEmpty) 'Code: $code',
                ].join(' · ');

                return PosSelectTile(
                  title: name,
                  subtitle: sub.isNotEmpty ? sub : null,
                  tag: isDefault ? 'DEFAULT' : null,
                  selected: id == _selectedId,
                  enabled: !_loading,
                  onTap: () => setState(() => _selectedId = id),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: id == _selectedId
                          ? PosTheme.accent.withValues(alpha: 0.12)
                          : PosTheme.surfaceMutedLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.location_on_outlined,
                      size: 20,
                      color: id == _selectedId ? PosTheme.accent : PosTheme.inkMutedLight,
                    ),
                  ),
                );
              },
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
            label: 'Continue to Register',
            icon: Icons.arrow_forward_rounded,
            loading: _loading,
            onPressed: _selectedId == null ? null : _submit,
          ),

          if (widget.onSignOut != null) ...[
            const SizedBox(height: 12),
            Center(
              child: TextButton.icon(
                onPressed: _loading ? null : widget.onSignOut,
                icon: const Icon(Icons.logout_rounded, size: 16),
                label: const Text(
                  'Sign out / Switch user',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ),
            ),
          ],
        ],
      ),
    );

    return PosAuthScaffold(
      statusLabel: 'Branch Selection',
      statusIcon: Icons.storefront_rounded,
      headline: 'Select Active Branch',
      subtitle: 'Switch between store locations linked to your credentials seamlessly.',
      form: form,
    );
  }
}
