import 'package:flutter/material.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/theme.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key, required this.storeId});
  final String storeId;

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  List<Map<String, dynamic>> _items = [];
  String? _note;
  final _name = TextEditingController();
  final _sku = TextEditingController();
  final _price = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final body = await Api.instance.get('/api/v1/stores/${widget.storeId}/items');
    setState(() => _items = (body['data'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>());
  }

  Future<void> _create() async {
    try {
      await Api.instance.post('/api/v1/catalog/own/products', body: {
        'name': _name.text.trim(),
        'sku': _sku.text.trim(),
        'selling_price_paise': ((double.tryParse(_price.text) ?? 0) * 100).round(),
      });
      _name.clear();
      _sku.clear();
      _price.clear();
      await _load();
      setState(() => _note = 'Product saved.');
    } on ApiException catch (error) {
      setState(() => _note = error.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Products'), backgroundColor: Colors.white, foregroundColor: ink, elevation: 0),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(child: TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name'))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: _sku, decoration: const InputDecoration(labelText: 'Code'))),
                const SizedBox(width: 8),
                SizedBox(width: 120, child: TextField(controller: _price, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price'))),
                const SizedBox(width: 8),
                FilledButton(onPressed: _create, child: const Text('Save')),
              ],
            ),
          ),
          if (_note != null) Text(_note!, style: const TextStyle(color: muted)),
          Expanded(
            child: ListView.separated(
              itemCount: _items.length,
              separatorBuilder: (context, index) => const Divider(height: 1, color: line),
              itemBuilder: (context, index) {
                final item = _items[index];
                final paise = (item['selling_price_paise'] as num?)?.toInt();
                return ListTile(
                  title: Text(item['name'] as String? ?? ''),
                  subtitle: Text(item['sku'] as String? ?? ''),
                  trailing: Text(paise == null ? '' : inr(paise), style: const TextStyle(fontFeatures: [FontFeature.tabularFigures()])),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
