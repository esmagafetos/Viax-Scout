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
  String? _shownErrorOnce;

  // ── Guided delivery navigation ────────────────────────────────────────────
  bool _navigating = false;
  int _currentDeliveryIdx = 0;
  final Set<int> _deliveredLines = {};
  final Set<int> _skippedLines = {};
  bool _completed = false;

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

  // ── Navigation helpers ────────────────────────────────────────────────────

  List<Map<String, dynamic>> _getRouteRows(Map<String, dynamic> r) {
    final detalhes = (r['detalhes'] as List?) ?? const [];
    final routable = detalhes
        .where((d) => (d as Map)['ordem'] != null)
        .map((d) => Map<String, dynamic>.from(d as Map))
        .toList();
    routable.sort((a, b) =>
        ((a['ordem'] as num).compareTo(b['ordem'] as num)));
    return routable;
  }

  List<Map<String, dynamic>> _getNuanceRows(Map<String, dynamic> r) {
    final detalhes = (r['detalhes'] as List?) ?? const [];
    return detalhes
        .where((d) => (d as Map)['classificacao'] == 'nuance')
        .map((d) => Map<String, dynamic>.from(d as Map))
        .toList();
  }

  void _iniciarRota() {
    setState(() {
      _navigating = true;
      _completed = false;
      _currentDeliveryIdx = 0;
      _deliveredLines.clear();
      _skippedLines.clear();
    });
  }

  void _handleEntregue(List<Map<String, dynamic>> routeRows) {
    final row = routeRows[_currentDeliveryIdx];
    setState(() {
      _deliveredLines.add(row['linha'] as int);
      final next = _currentDeliveryIdx + 1;
      if (next >= routeRows.length) {
        _completed = true;
      } else {
        _currentDeliveryIdx = next;
      }
    });
  }

  void _handlePular(List<Map<String, dynamic>> routeRows) {
    final row = routeRows[_currentDeliveryIdx];
    setState(() {
      _skippedLines.add(row['linha'] as int);
      final next = _currentDeliveryIdx + 1;
      if (next >= routeRows.length) {
        _completed = true;
      } else {
        _currentDeliveryIdx = next;
      }
    });
  }

  void _handleAnterior(List<Map<String, dynamic>> routeRows) {
    if (_currentDeliveryIdx == 0) return;
    final prevIdx = _currentDeliveryIdx - 1;
    final prevRow = routeRows[prevIdx];
    setState(() {
      _deliveredLines.remove(prevRow['linha'] as int);
      _skippedLines.remove(prevRow['linha'] as int);
      _currentDeliveryIdx = prevIdx;
      _completed = false;
    });
  }

  void _novaRota(ProcessingService svc) {
    svc.clear();
    setState(() {
      _navigating = false;
      _completed = false;
      _currentDeliveryIdx = 0;
      _deliveredLines.clear();
      _skippedLines.clear();
      _filePath = null;
      _fileName = null;
      _fileSize = null;
    });
  }

  // ── Helpers de label ──────────────────────────────────────────────────────

  String _quadraLoteLabel(Map<String, dynamic> row) {
    final cls = row['classificacao']?.toString() ?? '';
    if (cls == 'loja') return 'Loja / Comércio';
    final ql = row['quadraLetra']?.toString();
    final qn = row['quadra'];
    final li = row['loteId']?.toString();
    final ln = row['lote'];
    final q = ql != null ? 'Quadra $ql' : (qn != null ? 'Quadra $qn' : '—');
    final l = li != null ? 'Lote $li' : (ln != null ? 'Lote $ln' : '');
    return l.isNotEmpty ? '$q · $l' : q;
  }

  Color _classColor(String cls) {
    switch (cls) {
      case 'ordenada':
        return context.ok;
      case 'encontrada_sem_condominio':
        return const Color(0xFF7C3AED);
      case 'loja':
        return const Color(0xFF0EA5E9);
      default:
        return context.accent;
    }
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

  // ── BUILD ─────────────────────────────────────────────────────────────────

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

    // Guided navigation mode
    if (_navigating && result != null) {
      final routeRows = _getRouteRows(result);
      final nuanceRows = _getNuanceRows(result);
      if (_completed) {
        return _buildCompletedScreen(routeRows, nuanceRows, svc);
      }
      if (_currentDeliveryIdx < routeRows.length) {
        return _buildNavigationScreen(routeRows, nuanceRows, result);
      }
    }

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

          // Seletor de condomínio (só quando não há resultado)
          if (result == null) ...[
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
                  'Importar Planilha — ${selected['nome'] ?? '—'}'),
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  _dropzone(processing),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: context.text,
                        foregroundColor: context.bg,
                        disabledBackgroundColor: context.borderStrong,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(99)),
                      ),
                      onPressed: canProcess ? _process : null,
                      child: processing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2.4, color: Colors.white))
                          : const Text('Roteirizar Entregas',
                              style: TextStyle(fontWeight: FontWeight.w700)),
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
                ],
              ),
            ),
          ],

          // Resultado
          if (result != null) ...[
            _buildReadyPanel(result, svc),
          ],
        ],
      ),
    );
  }

  // ── TELA: NAVEGAÇÃO DE ENTREGA ────────────────────────────────────────────

  Widget _buildNavigationScreen(
    List<Map<String, dynamic>> routeRows,
    List<Map<String, dynamic>> nuanceRows,
    Map<String, dynamic> result,
  ) {
    final row = routeRows[_currentDeliveryIdx];
    final total = routeRows.length;
    final progress = _currentDeliveryIdx / total;
    final condoNome = (result['condominio'] as Map?)?['nome'] ?? '';
    final instrucao = row['instrucao']?.toString() ?? 'Siga as instruções do mapa.';
    final isFirst = _currentDeliveryIdx == 0;
    final cls = row['classificacao']?.toString() ?? 'nuance';
    final isSemCondo = cls == 'encontrada_sem_condominio';
    final ruaCitada = row['ruaCitada']?.toString();

    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                decoration: BoxDecoration(
                  color: context.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: context.borderStrong),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(condoNome,
                                    style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.8,
                                        color: context.textFaint)),
                                const SizedBox(height: 2),
                                Text('Entrega ${_currentDeliveryIdx + 1} de $total',
                                    style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900,
                                        color: context.text)),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () => setState(() {
                              _completed = true;
                            }),
                            style: TextButton.styleFrom(
                              foregroundColor: context.textFaint,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(99),
                                side: BorderSide(color: context.borderStrong),
                              ),
                            ),
                            child: const Text('Encerrar',
                                style: TextStyle(fontSize: 12)),
                          ),
                        ],
                      ),
                    ),
                    // Progress bar
                    ClipRRect(
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 4,
                        backgroundColor: context.border,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(context.ok),
                      ),
                    ),
                    // Progress dots
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                      child: Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: List.generate(routeRows.length, (i) {
                          final r = routeRows[i];
                          final line = r['linha'] as int;
                          final isDone = _deliveredLines.contains(line);
                          final isSkipped = _skippedLines.contains(line);
                          final isCur = i == _currentDeliveryIdx;
                          return Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDone
                                  ? context.ok
                                  : isSkipped
                                      ? context.accent
                                      : isCur
                                          ? context.text
                                          : context.borderStrong,
                            ),
                          );
                        }),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Card de instrução
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isFirst
                      ? const Color(0xFF0d2018)
                      : context.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: isFirst
                          ? const Color(0xFF2a6b45)
                          : context.borderStrong,
                      width: 1.5),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isFirst
                            ? const Color(0x662a6b45)
                            : context.accentDim,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: isFirst
                                ? const Color(0xFF2a6b45)
                                : context.borderStrong),
                      ),
                      child: Center(
                        child: Text(isFirst ? '🚪' : '➡️',
                            style: const TextStyle(fontSize: 18)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isFirst ? 'PONTO DE ENTRADA' : 'NAVEGAÇÃO',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                              color: isFirst
                                  ? const Color(0xFF5fb87a)
                                  : context.textFaint,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            instrucao,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              height: 1.4,
                              color: isFirst
                                  ? const Color(0xFFe8f5ec)
                                  : context.text,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Card de info da entrega
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: context.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: context.borderStrong),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: _classColor(cls).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(7),
                            border: Border.all(
                                color: _classColor(cls)
                                    .withValues(alpha: 0.3)),
                          ),
                          child: Center(
                            child: Text('${row['ordem'] ?? '?'}',
                                style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: _classColor(cls))),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _quadraLoteLabel(row),
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: context.text),
                          ),
                        ),
                        if (isSemCondo)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color:
                                  const Color(0xFF7C3AED).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Text('SEM COND.',
                                style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF7C3AED))),
                          ),
                      ],
                    ),
                    if (ruaCitada != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.home_outlined,
                              size: 13, color: Color(0xFF7C3AED)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(ruaCitada,
                                style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF7C3AED))),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 8),
                    Text(
                      row['enderecoOriginal']?.toString() ?? '',
                      style: TextStyle(
                          fontSize: 12, color: context.textFaint, height: 1.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // ENTREGUE button
              SizedBox(
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () => _handleEntregue(routeRows),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16a34a),
                    foregroundColor: Colors.white,
                    elevation: 4,
                    shadowColor: const Color(0xFF16a34a).withValues(alpha: 0.4),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.check_circle, size: 22),
                  label: const Text('ENTREGUE',
                      style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5)),
                ),
              ),
              const SizedBox(height: 10),

              // Anterior / Pular
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _currentDeliveryIdx > 0
                          ? () => _handleAnterior(routeRows)
                          : null,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: context.text,
                        side: BorderSide(color: context.borderStrong),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: const Icon(Icons.chevron_left, size: 18),
                      label: const Text('Anterior',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _handlePular(routeRows),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: context.accent,
                        side: BorderSide(color: context.borderStrong),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      label: const Text('Pular',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      icon: const Icon(Icons.chevron_right, size: 18),
                    ),
                  ),
                ],
              ),

              if (nuanceRows.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: context.accentDim,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: context.accent.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    '⚠ ${nuanceRows.length} endereço${nuanceRows.length != 1 ? 's' : ''} não roteado${nuanceRows.length != 1 ? 's' : ''} — verifique manualmente.',
                    style: TextStyle(fontSize: 12, color: context.accent),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ── TELA: ROTA CONCLUÍDA ──────────────────────────────────────────────────

  Widget _buildCompletedScreen(
    List<Map<String, dynamic>> routeRows,
    List<Map<String, dynamic>> nuanceRows,
    ProcessingService svc,
  ) {
    final totalEntregues = _deliveredLines.length;
    final totalPuladas = _skippedLines.length;
    final skippedRows =
        routeRows.where((r) => _skippedLines.contains(r['linha'] as int)).toList();

    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                    vertical: 36, horizontal: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFF0d2018),
                  borderRadius: BorderRadius.circular(20),
                  border: const Border.fromBorderSide(
                      BorderSide(color: Color(0xFF2a6b45), width: 1.5)),
                ),
                child: Column(
                  children: [
                    const Text('✅',
                        style: TextStyle(fontSize: 48), textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    const Text('Rota concluída!',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFFe8f5ec))),
                    const SizedBox(height: 4),
                    Text(
                      (routeRows.isNotEmpty
                              ? (routeRows.first['condominio'] ?? '')
                              : '') as String,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontSize: 13, color: Color(0xFF5fb87a)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Stats grid
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 1.3,
                children: [
                  StatTile(
                      value: '$totalEntregues',
                      label: 'Entregues',
                      accent: context.ok),
                  StatTile(
                      value: '$totalPuladas',
                      label: 'Puladas',
                      accent: context.accent),
                  StatTile(
                      value: '${nuanceRows.length}',
                      label: 'Não roteadas',
                      accent: context.textFaint),
                ],
              ),

              if (skippedRows.isNotEmpty) ...[
                const SizedBox(height: 16),
                CardSection(
                  header: CardHeaderLabel('Entregas puladas',
                      color: context.accent),
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: skippedRows.map((r) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          border: Border(
                              top: BorderSide(color: context.border)),
                        ),
                        child: Row(
                          children: [
                            Text('#${r['ordem']}',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: context.accent)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(_quadraLoteLabel(r),
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: context.text)),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],

              const SizedBox(height: 16),
              SizedBox(
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () => _novaRota(svc),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: context.text,
                    foregroundColor: context.bg,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.refresh, size: 18),
                  label: const Text('Nova Rota',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── PAINEL READY (resultado disponível) ──────────────────────────────────

  Widget _buildReadyPanel(Map<String, dynamic> result, ProcessingService svc) {
    final routeRows = _getRouteRows(result);
    final nuanceRows = _getNuanceRows(result);
    final condoNome =
        (result['condominio'] as Map?)?['nome']?.toString() ?? '';
    final totalOriginal = result['totalOriginal'] as int?;
    final totalLinhas = result['totalLinhas'] as int? ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header do resultado
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(condoNome,
                      style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: context.text)),
                  if (totalOriginal != null && totalOriginal > totalLinhas)
                    Text(
                      '🏘️ $totalLinhas de $totalOriginal endereços em Nova Califórnia',
                      style:
                          TextStyle(fontSize: 12, color: context.textFaint),
                    ),
                ],
              ),
            ),
            TextButton(
              onPressed: () => _novaRota(svc),
              style: TextButton.styleFrom(
                foregroundColor: context.textFaint,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(99),
                  side: BorderSide(color: context.borderStrong),
                ),
              ),
              child: const Text('Nova planilha', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Stats
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 2.4,
          children: [
            StatTile(
                value: '${routeRows.length}',
                label: 'Para entregar',
                accent: context.ok),
            StatTile(
                value: '${nuanceRows.length}',
                label: 'Nuances',
                accent: context.accent),
            StatTile(
                value: '${result['totalLojas'] ?? 0}',
                label: 'Lojas',
                accent: const Color(0xFF0EA5E9)),
            StatTile(
                value: '${result['metricas']?['tempo_ms'] ?? 0}ms',
                label: 'Tempo'),
          ],
        ),
        const SizedBox(height: 12),

        // Aviso nuances
        if (nuanceRows.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: context.accentDim,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: context.accent.withValues(alpha: 0.4)),
            ),
            child: Text(
              '⚠ ${nuanceRows.length} endereço${nuanceRows.length != 1 ? 's' : ''} não roteado${nuanceRows.length != 1 ? 's' : ''} — verifique manualmente.',
              style: TextStyle(fontSize: 13, color: context.accent),
            ),
          ),

        // BOTÃO INICIAR ROTA
        if (routeRows.isNotEmpty) ...[
          SizedBox(
            height: 56,
            child: ElevatedButton.icon(
              onPressed: _iniciarRota,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF16a34a),
                foregroundColor: Colors.white,
                elevation: 6,
                shadowColor:
                    const Color(0xFF16a34a).withValues(alpha: 0.45),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.play_arrow_rounded, size: 26),
              label: Text('INICIAR ROTA (${routeRows.length} entregas)',
                  style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.3)),
            ),
          ),
          const SizedBox(height: 16),
        ] else
          Container(
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: context.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: context.borderStrong),
            ),
            child: Text(
              'Nenhuma entrega roteável encontrada. Verifique se o arquivo contém endereços deste condomínio.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: context.textFaint),
            ),
          ),

        // Preview da sequência
        CardSection(
          header: const CardHeaderLabel('Sequência de Entregas'),
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              if (routeRows.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                      child: Text('Nenhuma entrega roteável.',
                          style: TextStyle(
                              color: context.textFaint, fontSize: 13))),
                ),
              for (int i = 0; i < routeRows.length && i < 200; i++)
                _seqRow(routeRows[i], i == 0),

              // Nuances section
              if (nuanceRows.isNotEmpty) ...[
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: context.accentDim,
                    border: Border(
                        top: BorderSide(color: context.border)),
                  ),
                  child: Row(children: [
                    Text('NÃO ROTEADAS — VERIFICAR',
                        style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                            color: context.accent)),
                  ]),
                ),
                for (final r in nuanceRows)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: context.border)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: context.accentDim,
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: Center(
                              child: Text('⚠',
                                  style: TextStyle(
                                      fontSize: 14,
                                      color: context.accent))),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                r['enderecoOriginal']?.toString() ?? '',
                                style: TextStyle(
                                    fontSize: 12, color: context.textFaint),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                r['motivo']?.toString() ?? '',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: context.accent,
                                    fontStyle: FontStyle.italic),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _seqRow(Map<String, dynamic> row, bool first) {
    final cls = row['classificacao']?.toString() ?? 'nuance';
    final color = _classColor(cls);
    final instrucao = row['instrucao']?.toString();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        border: first ? null : Border(top: BorderSide(color: context.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(7),
              border: Border.all(color: color.withValues(alpha: 0.25)),
            ),
            child: Center(
              child: Text(
                cls == 'loja' ? '🏪' : (row['ordem']?.toString() ?? '—'),
                style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: cls == 'loja' ? 14 : 12,
                    color: color),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_quadraLoteLabel(row),
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: context.text)),
                if (instrucao != null) ...[
                  const SizedBox(height: 2),
                  Text('➜ $instrucao',
                      style: TextStyle(
                          fontSize: 11, color: context.textMuted)),
                ],
                const SizedBox(height: 2),
                Text(
                  row['enderecoOriginal']?.toString() ?? '',
                  style: TextStyle(fontSize: 11, color: context.textFaint),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (cls != 'ordenada')
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                _classLabel(cls),
                style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: color),
              ),
            ),
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
            Text(_fileName ?? 'Toque para selecionar arquivo',
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
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.1),
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
