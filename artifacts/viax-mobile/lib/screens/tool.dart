import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../state/foreground_processing.dart';
import '../state/processing_service.dart';
import '../theme/theme.dart';
import '../widgets/layout.dart';
import '../widgets/spinner.dart';
import '../widgets/toast.dart';

class ToolScreen extends StatefulWidget {
  const ToolScreen({super.key});
  @override
  State<ToolScreen> createState() => _ToolScreenState();
}

class _ToolScreenState extends State<ToolScreen> {
  List<Map<String, dynamic>> _condos = [];
  String _selectedId = 'bougainville-iii';
  String? _filePath;
  String? _fileName;
  int? _fileSize;
  bool _loading = true;
  String _activeFilter = 'all';
  String? _shownErrorOnce;

  @override
  void initState() {
    super.initState();
    _loadCondos();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _loadCondos() async {
    setState(() => _loading = true);
    try {
      final list = await context.read<ApiClient>().condominiumList();
      setState(() {
        _condos = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } catch (_) {
      _condos = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['xlsx', 'csv'],
      withData: false,
    );
    if (result != null && result.files.isNotEmpty) {
      final f = result.files.first;
      setState(() {
        _filePath = f.path;
        _fileName = f.name;
        _fileSize = f.size;
        _shownErrorOnce = null;
      });
      final svc = context.read<ProcessingService>();
      if (svc.kind == 'condominium') svc.clear();
    }
  }

  Future<void> _process() async {
    final selected =
        _condos.firstWhere((c) => c['id'] == _selectedId, orElse: () => {});
    if (selected.isEmpty || _filePath == null) return;
    if (selected['status'] != 'ativo') {
      showToast(context, 'Este condomínio ainda está em desenvolvimento.');
      return;
    }
    final api = context.read<ApiClient>();
    final svc = context.read<ProcessingService>();
    setState(() => _shownErrorOnce = null);

    await ForegroundProcessing.ensureNotificationPermission();
    final batteryOk =
        await ForegroundProcessing.ensureBatteryOptimizationDisabled();
    if (!batteryOk && mounted) {
      showToast(context,
          'Para acompanhar o processamento em tempo real mesmo com o app fechado, desabilite a otimização de bateria do ViaX:Trace.');
    }

    await svc.start(
      api: api,
      endpointPath: '/condominium/process',
      filePath: _filePath!,
      label: _fileName ?? 'Processando rota',
      returnPath: '/tool',
      kind: 'condominium',
      extraFields: {'condominioId': _selectedId},
    );
  }

  @override
  Widget build(BuildContext context) {
    final svc = context.watch<ProcessingService>();
    final isMine = svc.kind == 'condominium';
    final processing = isMine && svc.active;
    final steps = isMine ? svc.steps : const <String>[];
    final result = isMine ? svc.result : null;
    final svcError = isMine ? svc.error : null;

    if (svcError != null && _shownErrorOnce != svcError) {
      _shownErrorOnce = svcError;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) showToast(context, svcError);
      });
    }

    final selected =
        _condos.firstWhere((c) => c['id'] == _selectedId, orElse: () => {});
    final canProcess = _filePath != null &&
        !processing &&
        selected['status'] == 'ativo';

    return AppLayout(
      currentPath: '/tool',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Ferramenta de Condomínios',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                  color: context.text)),
          const SizedBox(height: 4),
          Text(
              'Roteirização semântica de entregas em condomínios fechados — Nova Califórnia (Tamoios).',
              style: TextStyle(
                  fontSize: 13, color: context.textFaint, height: 1.5)),
          const SizedBox(height: 16),
          CardSection(
            header: const CardHeaderLabel('Selecionar Condomínio'),
            padding: const EdgeInsets.all(14),
            child: _loading
                ? const Padding(
                    padding: EdgeInsets.all(20),
                    child: Center(child: AppSpinner()))
                : Column(
                    children: [
                      for (final c in _condos) _condoCard(c),
                    ],
                  ),
          ),
          const SizedBox(height: 16),
          CardSection(
            header: CardHeaderLabel(
                'Importar Rota — ${selected['nome'] ?? '—'}'),
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                _dropzone(processing),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 42,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: context.text,
                      foregroundColor: context.bg,
                      disabledBackgroundColor: context.borderStrong,
                    ),
                    onPressed: canProcess ? _process : null,
                    child: processing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2.4, color: Colors.white))
                        : const Text('Iniciar Roteirização'),
                  ),
                ),
                if (processing && steps.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  for (final s in steps)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                              margin: const EdgeInsets.only(top: 5),
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                  color: context.accent,
                                  shape: BoxShape.circle)),
                          const SizedBox(width: 8),
                          Expanded(
                              child: Text(s,
                                  style: TextStyle(
                                      fontSize: 12,
                                      color: context.textFaint))),
                        ],
                      ),
                    ),
                ],
                if (!processing && result != null && steps.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  const Divider(height: 1),
                  const SizedBox(height: 10),
                  for (final s in steps)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 1),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.check_circle_outline,
                              size: 12, color: context.ok),
                          const SizedBox(width: 6),
                          Expanded(
                              child: Text(s,
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: context.textFaint))),
                        ],
                      ),
                    ),
                ],
              ],
            ),
          ),
          if (result != null) ...[
            const SizedBox(height: 16),
            _resultPanel(result),
          ],
        ],
      ),
    );
  }

  Widget _dropzone(bool processing) {
    return InkWell(
      onTap: processing ? null : _pickFile,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
              color: _filePath != null
                  ? context.accent
                  : context.borderStrong,
              style: BorderStyle.solid,
              width: 1.4),
        ),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: context.accentDim,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.borderStrong),
              ),
              child: Icon(Icons.upload_file_outlined,
                  color: context.accent, size: 26),
            ),
            const SizedBox(height: 10),
            Text(_fileName ?? 'Arraste o arquivo aqui',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: context.text),
                textAlign: TextAlign.center),
            const SizedBox(height: 4),
            Text(
                _fileSize == null
                    ? 'XLSX ou CSV · máx 10MB'
                    : '${(_fileSize! / 1024).toStringAsFixed(1)} KB',
                style: TextStyle(fontSize: 11, color: context.textFaint),
                textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: processing ? null : _pickFile,
              style: ElevatedButton.styleFrom(
                backgroundColor: context.accent,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 8),
                minimumSize: const Size(0, 36),
                textStyle: const TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: -0.1),
              ),
              child: Text(_filePath == null
                  ? 'Selecionar arquivo'
                  : 'Trocar arquivo'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _condoCard(Map<String, dynamic> c) {
    final isActive = c['id'] == _selectedId;
    final isAvail = c['status'] == 'ativo';
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: isAvail ? () => setState(() => _selectedId = c['id']) : null,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isActive ? context.accentDim : context.surface2,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isActive ? context.accent : context.borderStrong,
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(c['nome'] ?? '',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: context.text)),
                    const SizedBox(height: 2),
                    Text(
                      isAvail
                          ? 'Disponível${c['totalLotes'] != null ? " · ${c['totalLotes']} lotes" : ""}'
                          : 'Em desenvolvimento',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: isAvail ? context.ok : context.textFaint,
                      ),
                    ),
                  ],
                ),
              ),
              if (isActive)
                Icon(Icons.check_circle, color: context.accent, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resultPanel(Map<String, dynamic> r) {
    final classColor = {
      'ordenada': context.ok,
      'encontrada_sem_condominio': const Color(0xFF7C3AED),
      'loja': const Color(0xFF0EA5E9),
      'nuance': context.accent,
    };
    final classLabel = {
      'all': 'Todos',
      'ordenada': 'Ordenadas',
      'encontrada_sem_condominio': 'Sem condomínio',
      'loja': 'Lojas',
      'nuance': 'Nuances',
    };
    final detalhes = (r['detalhes'] as List?) ?? const [];
    final filtered = detalhes.where((row) {
      if (_activeFilter == 'all') return true;
      return (row as Map)['classificacao'] == _activeFilter;
    }).toList();

    int countFor(String cls) =>
        detalhes.where((d) => (d as Map)['classificacao'] == cls).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 2.2,
          children: [
            StatTile(value: '${r['totalLinhas'] ?? 0}', label: 'Total'),
            StatTile(
                value: '${r['totalOrdenadas'] ?? 0}',
                label: 'Ordenadas',
                accent: context.ok),
            StatTile(
                value: '${r['totalSemCondominio'] ?? 0}',
                label: 'Sem condomínio',
                accent: const Color(0xFF7C3AED)),
            StatTile(
                value: '${r['totalLojas'] ?? 0}',
                label: 'Lojas',
                accent: const Color(0xFF0EA5E9)),
            StatTile(
                value: '${r['totalNuances'] ?? 0}',
                label: 'Nuances',
                accent: context.accent),
            StatTile(
                value: '${r['metricas']?['tempo_ms'] ?? 0}ms',
                label: 'Tempo'),
          ],
        ),
        const SizedBox(height: 14),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final f in const [
                'all',
                'ordenada',
                'encontrada_sem_condominio',
                'loja',
                'nuance',
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () => setState(() => _activeFilter = f),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _activeFilter == f
                            ? (classColor[f] ?? context.accent)
                            : context.surface2,
                        borderRadius: BorderRadius.circular(AppRadii.pill),
                        border: Border.all(
                            color: _activeFilter == f
                                ? (classColor[f] ?? context.accent)
                                : context.borderStrong),
                      ),
                      child: Text(
                        f == 'all'
                            ? '${classLabel[f]} (${detalhes.length})'
                            : '${classLabel[f]} (${countFor(f)})',
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _activeFilter == f
                                ? Colors.white
                                : context.textMuted),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        CardSection(
          header: CardHeaderLabel(
              'Sequência — ${(r['condominio'] as Map?)?['nome'] ?? ''}'),
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              if (filtered.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                      child: Text('Nenhum item.',
                          style: TextStyle(
                              color: context.textFaint, fontSize: 13))),
                ),
              for (int i = 0; i < filtered.length && i < 200; i++)
                _row(Map<String, dynamic>.from(filtered[i] as Map),
                    classColor, i == 0),
            ],
          ),
        ),
      ],
    );
  }

  Widget _row(
      Map<String, dynamic> row, Map<String, Color> colors, bool first) {
    final clsf = row['classificacao']?.toString() ?? 'nuance';
    final color = colors[clsf] ?? context.accent;
    final conf = (row['confiancaParse'] as num?)?.toInt() ?? 0;
    final ruaCitada = row['ruaCitada']?.toString();
    final quadraLetra = row['quadraLetra']?.toString();
    final quadraNum = row['quadra'];
    final lote = row['lote'];
    final loteId = row['loteId']?.toString();

    String quadraLabel;
    if (clsf == 'loja') {
      quadraLabel = 'Loja / Comércio';
    } else if (quadraLetra != null) {
      quadraLabel = 'Quadra $quadraLetra${loteId != null ? " · Lote $loteId" : lote != null ? " · Lote $lote" : ""}';
    } else if (quadraNum != null) {
      quadraLabel = 'Quadra $quadraNum${lote != null ? " · Lote $lote" : ""}';
    } else {
      quadraLabel = '—';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        border: first ? null : Border(top: BorderSide(color: context.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: color.withValues(alpha: 0.25), width: 1),
            ),
            child: Center(
              child: Text(
                clsf == 'loja' ? '🏪' : (row['ordem']?.toString() ?? '—'),
                style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: clsf == 'loja' ? 14 : 12,
                    color: color),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(quadraLabel,
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: context.text)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        _classLabel(clsf),
                        style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.4,
                            color: color),
                      ),
                    ),
                  ],
                ),
                if (row['instrucao'] != null) ...[
                  const SizedBox(height: 3),
                  Text('➜ ${row['instrucao']}',
                      style: TextStyle(
                          fontSize: 11, color: context.textMuted)),
                ],
                if (ruaCitada != null) ...[
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Icon(Icons.home_outlined,
                          size: 10, color: const Color(0xFF7C3AED)),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text(ruaCitada,
                            style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF7C3AED))),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 3),
                Text(row['enderecoOriginal']?.toString() ?? '',
                    style: TextStyle(fontSize: 11, color: context.textFaint),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
                if (row['motivo'] != null &&
                    row['motivo'].toString().isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(row['motivo'].toString(),
                      style: TextStyle(
                          fontSize: 10.5,
                          color: context.textFaint,
                          fontStyle: FontStyle.italic)),
                ],
                if (conf > 0) ...[
                  const SizedBox(height: 5),
                  _confidenceBar(conf),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _classLabel(String cls) {
    switch (cls) {
      case 'ordenada':
        return 'Ordenada';
      case 'encontrada_sem_condominio':
        return 'Sem cond.';
      case 'loja':
        return 'Loja';
      case 'nuance':
        return 'Nuance';
      default:
        return cls;
    }
  }

  Widget _confidenceBar(int value) {
    Color barColor;
    if (value >= 80) {
      barColor = context.ok;
    } else if (value >= 50) {
      barColor = const Color(0xFFF59E0B);
    } else {
      barColor = context.accent;
    }

    return Row(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: value / 100,
              minHeight: 3,
              backgroundColor: context.borderStrong,
              valueColor: AlwaysStoppedAnimation<Color>(barColor),
            ),
          ),
        ),
        const SizedBox(width: 6),
        Text('$value%',
            style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w700,
                color: barColor)),
      ],
    );
  }
}
