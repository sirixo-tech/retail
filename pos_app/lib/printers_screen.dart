import 'package:flutter/material.dart';
import 'package:pos_app/api.dart';
import 'package:pos_app/theme.dart';

class PrintersScreen extends StatefulWidget {
  const PrintersScreen({super.key, required this.storeId});
  final String storeId;

  @override
  State<PrintersScreen> createState() => _PrintersScreenState();
}

class _PrintersScreenState extends State<PrintersScreen> {
  List<Map<String, dynamic>> _printers = [];
  final _code = TextEditingController();
  String? _note;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final body = await Api.instance.get('/api/v1/printers', query: {'store_id': widget.storeId});
      setState(() => _printers = (body['data'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>());
    } on ApiException catch (error) {
      setState(() => _note = error.message);
    }
  }

  Future<void> _pair() async {
    try {
      await Api.instance.post('/api/v1/printers/pair', body: {
        'code': _code.text.trim(),
        'store_id': widget.storeId,
      });
      setState(() => _note = 'Printer paired.');
      await _load();
    } on ApiException catch (error) {
      setState(() => _note = error.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Printers'), backgroundColor: Colors.white, foregroundColor: ink, elevation: 0),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Enter the 4-digit code shown by the print agent on this counter.', style: TextStyle(color: muted)),
          const SizedBox(height: 8),
          Row(
            children: [
              SizedBox(width: 160, child: TextField(controller: _code, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Code'))),
              const SizedBox(width: 8),
              FilledButton(onPressed: _pair, child: const Text('Pair')),
            ],
          ),
          if (_note != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_note!)),
          const SizedBox(height: 16),
          ..._printers.map((printer) => ListTile(
                title: Text(printer['name'] as String? ?? 'Printer'),
                subtitle: Text(printer['status'] as String? ?? ''),
                trailing: TextButton(
                  onPressed: () async {
                    try {
                      await Api.instance.post('/api/v1/printers/${printer['id']}/test-print');
                      setState(() => _note = 'Test print queued.');
                    } on ApiException catch (error) {
                      setState(() => _note = error.message);
                    }
                  },
                  child: const Text('Test'),
                ),
              )),
        ],
      ),
    );
  }
}
