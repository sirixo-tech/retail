import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/outbox.dart';
import 'package:pos_app/products_screen.dart';
import 'package:pos_app/printers_screen.dart';
import 'package:pos_app/theme.dart';
import 'package:uuid/uuid.dart';

class PosItem {
  PosItem({required this.id, required this.name, required this.sku, required this.paise});
  final String id;
  final String name;
  final String sku;
  final int paise;
}

class PosScreen extends StatefulWidget {
  const PosScreen({
    super.key,
    required this.profile,
    required this.onSignedOut,
    this.onSwitchStore,
  });
  final Map<String, dynamic> profile;
  final Future<void> Function() onSignedOut;
  final VoidCallback? onSwitchStore;

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final _outbox = Outbox();
  final _search = TextEditingController();
  final _discount = TextEditingController();
  final _reason = TextEditingController();
  List<PosItem> _items = [];
  final Map<String, int> _qty = {};
  bool _shiftOpen = false;
  String? _note;
  String _client = const Uuid().v4();

  String get _storeId => (widget.profile['store'] as Map<String, dynamic>)['id'] as String;
  String get _storeName => (widget.profile['store'] as Map<String, dynamic>)['name'] as String? ?? 'Counter';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final shift = await Api.instance.get('/api/v1/stores/$_storeId/shifts/current');
      final items = await Api.instance.get('/api/v1/stores/$_storeId/items');
      final rows = (items['data'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
      final parsed = rows
          .map((row) => PosItem(
                id: row['id'] as String,
                name: row['name'] as String? ?? row['sku'] as String,
                sku: row['sku'] as String,
                paise: (row['selling_price_paise'] as num?)?.toInt() ?? 0,
              ))
          .toList();
      await _outbox.saveCatalog(parsed.map((item) => {'id': item.id, 'name': item.name, 'sku': item.sku, 'paise': item.paise}).toList());
      if (!mounted) return;
      setState(() {
        _shiftOpen = shift['status'] == 'open';
        _items = parsed;
      });
    } on ApiException catch (error) {
      if (error.code == 'offline') {
        final cached = await _outbox.catalog();
        if (!mounted) return;
        setState(() {
          _items = cached
              .map((row) => PosItem(id: row['id'] as String, name: row['name'] as String, sku: row['sku'] as String, paise: row['paise'] as int))
              .toList();
          _note = 'Showing saved items. Cash bills will wait until the connection returns.';
        });
      } else if (mounted) {
        setState(() => _note = error.message);
      }
    }
  }

  int get _total => _items.fold(0, (sum, item) => sum + item.paise * (_qty[item.id] ?? 0));

  List<PosItem> get _cart => _items.where((item) => (_qty[item.id] ?? 0) > 0).toList();

  List<PosItem> get _visible {
    final q = _search.text.trim().toLowerCase();
    if (q.isEmpty) return _items;
    return _items.where((item) => item.name.toLowerCase().contains(q) || item.sku.contains(q)).toList();
  }

  Future<void> _openShift() async {
    try {
      await Api.instance.post('/api/v1/stores/$_storeId/shifts/open', body: {'opening_cash_paise': 0});
      setState(() {
        _shiftOpen = true;
        _note = 'Shift open.';
      });
    } on ApiException catch (error) {
      setState(() => _note = error.message);
    }
  }

  Future<void> _pay() async {
    if (_cart.isEmpty) return;
    final lines = _cart.map((item) => {'store_item_id': item.id, 'qty': _qty[item.id]}).toList();
    final discount = ((double.tryParse(_discount.text) ?? 0) * 100).round();
    final body = {
      'client_uuid': _client,
      'cash_tender_paise': _total,
      'discount_paise': discount,
      'discount_reason': _reason.text,
      'lines': lines,
    };
    try {
      final sale = await Api.instance.post('/api/v1/stores/$_storeId/sales', body: body);
      setState(() {
        _qty.clear();
        _client = const Uuid().v4();
        _note = 'Invoice ${sale['number']}';
      });
      if (!mounted) return;
      await _showReceipt(sale['id'] as String);
    } on ApiException catch (error) {
      if (error.code == 'offline') {
        await _outbox.park(_client, _total, jsonEncode(lines));
        setState(() {
          _qty.clear();
          _client = const Uuid().v4();
          _note = 'Saved on this counter. Send parked bills when you are online.';
        });
      } else {
        setState(() => _note = error.message);
      }
    }
  }

  Future<void> _sync() async {
    final parked = await _outbox.pending();
    if (parked.isEmpty) {
      setState(() => _note = 'No bills are waiting.');
      return;
    }
    try {
      await Api.instance.post('/api/v1/stores/$_storeId/sales/sync', body: {
        'sales': parked
            .map((row) => {
                  'client_uuid': row['client_uuid'],
                  'cash_tender_paise': row['cash_tender_paise'],
                  'lines': jsonDecode(row['lines'] as String),
                })
            .toList(),
      });
      await _outbox.clear();
      setState(() => _note = 'Sent ${parked.length} parked bills.');
    } on ApiException catch (error) {
      setState(() => _note = error.message);
    }
  }

  Future<void> _showReceipt(String saleId) async {
    final bill = await Api.instance.get('/api/v1/sales/$saleId/receipt');
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(bill['number'] as String? ?? 'Receipt'),
        content: Text('${bill['store']}\n${inr((bill['total_paise'] as num?)?.toInt() ?? 0)}\n${bill['footer'] ?? ''}'),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: canvas,
      body: Column(
        children: [
          _header(),
          Expanded(
            child: Row(
              children: [
                SizedBox(width: 380, child: _cartPane()),
                Expanded(child: _grid()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _header() {
    return Container(
      height: 60,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: PosTheme.borderLight)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              gradient: PosTheme.brandGradient(PosTheme.accent),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Center(
              child: Text(
                'S',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          _chip(
            _shiftOpen ? 'SHIFT OPEN' : 'SHIFT CLOSED',
            _shiftOpen ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
            _shiftOpen ? null : _openShift,
            icon: _shiftOpen ? Icons.check_circle_outline_rounded : Icons.lock_clock_rounded,
          ),
          const SizedBox(width: 8),
          _chip(
            _storeName,
            PosTheme.accent,
            widget.onSwitchStore,
            icon: Icons.storefront_rounded,
            trailingIcon: widget.onSwitchStore != null ? Icons.keyboard_arrow_down_rounded : null,
          ),
          const Spacer(),
          IconButton(
            tooltip: 'Products Catalog',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => ProductsScreen(storeId: _storeId)),
            ),
            icon: const Icon(Icons.inventory_2_outlined, color: PosTheme.inkLight),
          ),
          IconButton(
            tooltip: 'Printers Setup',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => PrintersScreen(storeId: _storeId)),
            ),
            icon: const Icon(Icons.print_outlined, color: PosTheme.inkLight),
          ),
          IconButton(
            tooltip: 'Sync Parked Bills',
            onPressed: _sync,
            icon: const Icon(Icons.cloud_upload_outlined, color: PosTheme.inkLight),
          ),
          IconButton(
            tooltip: 'Sign Out',
            onPressed: widget.onSignedOut,
            icon: const Icon(Icons.logout_rounded, color: Color(0xFFDC2626)),
          ),
        ],
      ),
    );
  }

  Widget _chip(
    String label,
    Color color,
    VoidCallback? onTap, {
    IconData? icon,
    IconData? trailingIcon,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withValues(alpha: 0.25)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 15, color: color),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontSize: 12.5,
                ),
              ),
              if (trailingIcon != null) ...[
                const SizedBox(width: 4),
                Icon(trailingIcon, size: 16, color: color),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _cartPane() {
    return ColoredBox(
      color: Colors.white,
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(children: [Icon(Icons.shopping_cart_outlined, size: 18, color: muted), SizedBox(width: 8), Text('Current cart', style: TextStyle(fontWeight: FontWeight.w700))]),
          ),
          Expanded(
            child: _cart.isEmpty
                ? const Center(child: Text('No items added\nSelect products from the right panel', textAlign: TextAlign.center, style: TextStyle(color: muted)))
                : ListView(
                    children: _cart.map((item) {
                      final count = _qty[item.id] ?? 0;
                      return ListTile(
                        title: Text(item.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text(item.sku, style: const TextStyle(color: muted, fontSize: 12)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(onPressed: () => setState(() => _qty[item.id] = count - 1), icon: const Icon(Icons.remove)),
                            Text('$count'),
                            IconButton(onPressed: () => setState(() => _qty[item.id] = count + 1), icon: const Icon(Icons.add)),
                            SizedBox(width: 72, child: Text(inr(item.paise * count), textAlign: TextAlign.right, style: const TextStyle(fontFeatures: [FontFeature.tabularFigures()]))),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
          ),
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFFFF4EE), borderRadius: BorderRadius.circular(12)),
            child: Column(
              children: [
                Row(children: [
                  Expanded(child: TextField(controller: _discount, decoration: const InputDecoration(labelText: 'Discount'), keyboardType: TextInputType.number)),
                  const SizedBox(width: 8),
                  Expanded(child: TextField(controller: _reason, decoration: const InputDecoration(labelText: 'Reason'))),
                ]),
                if (_note != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_note!, style: const TextStyle(color: muted, fontSize: 12))),
                const SizedBox(height: 8),
                Row(children: [const Text('Subtotal', style: TextStyle(color: muted)), const Spacer(), Text(inr(_total), style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]))]),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: Row(
              children: [
                TextButton(onPressed: () => setState(_qty.clear), child: const Text('Reset')),
                const Spacer(),
                Text('TOTAL  ${inr(_total)}', style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()])),
                const SizedBox(width: 8),
                PayMark(
                  child: TextButton(
                    onPressed: _cart.isEmpty ? null : _pay,
                    child: const Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text('Pay now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _grid() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Scan or search by code or name'),
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 220, mainAxisExtent: 148, crossAxisSpacing: 12, mainAxisSpacing: 12),
            itemCount: _visible.length,
            itemBuilder: (context, index) {
              final item = _visible[index];
              return Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => setState(() => _qty[item.id] = (_qty[item.id] ?? 0) + 1),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                        const Spacer(),
                        Text(item.sku, style: const TextStyle(color: muted, fontSize: 11)),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Text(inr(item.paise), style: const TextStyle(color: orange, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()])),
                            const Spacer(),
                            const Icon(Icons.add, color: orange, size: 18),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
