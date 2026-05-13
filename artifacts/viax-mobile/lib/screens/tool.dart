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
  String? _filePath;
  String? _fileName;
  int? _fileSize;
  String? _shownErrorOnce;

  // ── Navegação guiada — escopada ao grupo ativo selecionado ───────────────
  Map<String, dynamic>? _navGroup; // o grupo "ativo" em navegação
  bool _navigating = false;
  int _currentDeliveryIdx = 0;
  final Set<int> _deliveredLines = {};
  final Set<int> _skippedLines = {};
  bool _completed = false;

  // ── Expansão de grupos colapsáveis ───────────────────────────────────────
  final Set<String> _expandedGroups = {};

  @override
  void dispose() {
    super.dispose();
  }

  // ── Seleção de arquivo ───────────────────────────────────────────────────

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

  // ── Processar — sem condominioId, detecção automática no servidor ─────────

  Future<void> _process() async {
    if (_filePath == null) return;
    final api = context.read<ApiClient>();
    final svc = context.read<ProcessingService>();
    setState(() => _shownErrorOnce = null);

    await ForegroundProcessing.ensureNotificationPermission();
    final batteryOk =
        await ForegroundProcessing.ensureBatteryOptimizationDisabled();
    if (!batteryOk && mounted) {
      showToast(context,
          'Para acompanhar em tempo real com o app fechado, desabilite a otimização de bateria do ViaX:Trace.');
    }

    await svc.start(
      api: api,
      endpointPath: '/condominium/process',
      filePath: _filePath!,
      label: _fileName ?? 'Processando rota',
      returnPath: '/tool',
      kind: 'condominium',
      // Sem extraFields — servidor detecta o condomínio automaticamente
    );
  }

  // ── Helpers de label ─────────────────────────────────────────────────────

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

  // ── Helpers de rota ──────────────────────────────────────────────────────

  List<Map<String, dynamic>> _getRouteRows(Map<String, dynamic> route) {
    final detalhes = (route['detalhes'] as List?) ?? const [];
    final routable = detalhes
        .where((d) => (d as Map)['ordem'] != null)
        .map((d) => Map<String, dynamic>.from(d as Map))
        .toList();
    routable.sort(
        (a, b) => ((a['ordem'] as num).compareTo(b['ordem'] as num)));
    return routable;
  }

  List<Map<String, dynamic>> _getNuanceRows(Map<String, dynamic> route) {
    final detalhes = (route['detalhes'] as List?) ?? const [];
    return detalhes
        .where((d) => (d as Map)['classificacao'] == 'nuance')
        .map((d) => Map<String, dynamic>.from(d as Map))
        .toList();
  }

  // ── Navegação ────────────────────────────────────────────────────────────

  void _iniciarRota(Map<String, dynamic> grupo) {
    setState(() {
      _navGroup = grupo;
      _navigating = true;
      _completed = false;
      _currentDeliveryIdx = 0;
      _deliveredLines.clear();
      _skippedLines.clear();
    });
  }

  void _voltarResultados() {
    setState(() {
      _navigating = false;
      _completed = false;
      _navGroup = null;
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
      _navGroup = null;
      _currentDeliveryIdx = 0;
      _deliveredLines.clear();
      _skippedLines.clear();
      _filePath = null;
      _fileName = null;
      _fileSize = null;
      _expandedGroups.clear();
    });
  }

  // ── BUILD ────────────────────────────────────────────────────────────────

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

    // ── Modo navegação ────────────────────────────────────────────────────
    if (_navigating && _navGroup != null) {
      final route = Map<String, dynamic>.from(_navGroup!['route'] as Map);
      final routeRows = _getRouteRows(route);
      final nuanceRows = _getNuanceRows(route);

      if (_completed) {
        return _buildCompletedScreen(routeRows, nuanceRows, svc);
      }
      if (_currentDeliveryIdx < routeRows.length) {
        return _buildNavigationScreen(routeRows, nuanceRows);
      }
    }

    // ── Tela principal ────────────────────────────────────────────────────
    return AppLayout(
      currentPath: '/tool',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Cabeçalho
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Ferramenta de Condomínios',
                        style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                            color: context.text)),
                    const SizedBox(height: 4),
                    Text(
                      'Suba a planilha — o sistema detecta os condomínios automaticamente.',
                      style: TextStyle(
                          fontSize: 13, color: context.textFaint, height: 1.5),
                    ),
                  ],
                ),
              ),
              if (result != null)
                TextButton(
                  onPressed: () => _novaRota(svc),
                  style: TextButton.styleFrom(
                    foregroundColor: context.textFaint,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(99),
                      side: BorderSide(color: context.borderStrong),
                    ),
                  ),
                  child: const Text('Nova planilha',
                      style: TextStyle(fontSize: 12)),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // ── Upload (só quando sem resultado) ─────────────────────────
          if (result == null) ...[
            CardSection(
              header: const CardHeaderLabel('Importar Planilha'),
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  _dropzone(processing),
                  if (_filePath != null && !processing) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: context.accent,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(99)),
                        ),
                        onPressed: _process,
                        icon: const Icon(Icons.route_outlined, size: 18),
                        label: const Text('Processar Planilha',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],

          // ── Log de processamento ──────────────────────────────────────
          if (processing || (result == null && steps.isNotEmpty)) ...[
            const SizedBox(height: 14),
            CardSection(
              header: Row(
                children: [
                  const Expanded(child: CardHeaderLabel('Processamento')),
                  if (processing)
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2.2),
                    ),
                ],
              ),
              padding: const EdgeInsets.fromLTRB(14, 6, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: steps
                    .map((s) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.check_circle_outline,
                                  size: 13, color: context.ok),
                              const SizedBox(width: 6),
                              Expanded(
                                  child: Text(s,
                                      style: TextStyle(
                                          fontSize: 12,
                                          color: context.textFaint))),
                            ],
                          ),
                        ))
                    .toList(),
              ),
            ),
          ],

          // ── Resultado agrupado ────────────────────────────────────────
          if (result != null) ...[
            const SizedBox(height: 16),
            _buildReadyPanel(result, svc),
          ],
        ],
      ),
    );
  }

  // ── Dropzone ─────────────────────────────────────────────────────────────

  Widget _dropzone(bool processing) {
    return GestureDetector(
      onTap: processing ? null : _pickFile,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: _filePath != null
              ? context.ok.withValues(alpha: 0.06)
              : context.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: _filePath != null
                ? context.ok.withValues(alpha: 0.4)
                : context.borderStrong,
            width: 1.5,
            strokeAlign: BorderSide.strokeAlignInside,
          ),
        ),
        child: processing
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const AppSpinner(),
                  const SizedBox(width: 10),
                  Flexible(
                    child: Text(
                      _fileName ?? 'Processando...',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: context.textMuted),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              )
            : Column(
                children: [
                  Icon(
                    _filePath != null
                        ? Icons.description_outlined
                        : Icons.upload_file_outlined,
                    size: 28,
                    color: _filePath != null
                        ? context.ok
                        : context.textFaint,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _filePath != null
                        ? (_fileName ?? 'Arquivo selecionado')
                        : 'Toque para selecionar',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _filePath != null
                          ? context.text
                          : context.textMuted,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _filePath != null && _fileSize != null
                        ? '${(_fileSize! / 1024).toStringAsFixed(1)} KB · .xlsx ou .csv'
                        : '.xlsx ou .csv · máx 10 MB',
                    style: TextStyle(fontSize: 12, color: context.textFaint),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
      ),
    );
  }

  // ── Painel de resultado (grupos) ──────────────────────────────────────────

  Widget _buildReadyPanel(Map<String, dynamic> result, ProcessingService svc) {
    final totalOriginal = result['totalOriginal'] as int? ?? 0;
    final grupos = (result['grupos'] as List?)
            ?.map((g) => Map<String, dynamic>.from(g as Map))
            .toList() ??
        [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Resumo
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: context.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: context.borderStrong),
          ),
          child: Row(
            children: [
              Icon(Icons.check_circle_outline, size: 16, color: context.ok),
              const SizedBox(width: 8),
              Text(
                '$totalOriginal endereço(s) · ${grupos.length} grupo(s) identificado(s)',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: context.textMuted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Um card por grupo
        for (final grupo in grupos) ...[
          _buildGrupoCard(grupo, svc),
          const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _buildGrupoCard(Map<String, dynamic> grupo, ProcessingService svc) {
    final status = grupo['status']?.toString() ?? '';
    switch (status) {
      case 'ativo':
        return _buildActiveCard(grupo, svc);
      case 'em_desenvolvimento':
        return _buildDevCard(grupo);
      default:
        return _buildNaoLocalizadoCard(grupo);
    }
  }

  // ── Card: condomínio ativo ────────────────────────────────────────────────

  Widget _buildActiveCard(
      Map<String, dynamic> grupo, ProcessingService svc) {
    final condoNome = grupo['condoNome']?.toString() ?? '—';
    final condoId = grupo['condoId']?.toString() ?? 'ativo';
    final route = Map<String, dynamic>.from(grupo['route'] as Map? ?? {});
    final routeRows = _getRouteRows(route);
    final nuanceRows = _getNuanceRows(route);
    final isExpanded = _expandedGroups.contains(condoId);

    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.borderStrong),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(color: context.ok, width: 3),
                bottom: BorderSide(color: context.border),
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(14),
                topRight: Radius.circular(14),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: context.ok.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text('ATIVO',
                      style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                          color: context.ok)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(condoNome,
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: context.text)),
                ),
              ],
            ),
          ),

          // Stats
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            child: Row(
              children: [
                _miniStat('${routeRows.length}', 'Entregas', context.ok),
                const SizedBox(width: 16),
                _miniStat('${nuanceRows.length}', 'Nuances', context.accent),
                const SizedBox(width: 16),
                _miniStat('${route['totalLojas'] ?? 0}', 'Lojas',
                    const Color(0xFF0EA5E9)),
              ],
            ),
          ),

          // Botão Iniciar Rota
          if (routeRows.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: SizedBox(
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () => _iniciarRota(grupo),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16a34a),
                    foregroundColor: Colors.white,
                    elevation: 4,
                    shadowColor:
                        const Color(0xFF16a34a).withValues(alpha: 0.35),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.play_arrow_rounded, size: 22),
                  label: Text('Iniciar Rota (${routeRows.length} entregas)',
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w800)),
                ),
              ),
            ),

          // Toggle lista
          GestureDetector(
            onTap: () => setState(() {
              if (isExpanded) {
                _expandedGroups.remove(condoId);
              } else {
                _expandedGroups.add(condoId);
              }
            }),
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: context.border)),
              ),
              child: Row(
                children: [
                  Text(
                    isExpanded
                        ? 'Ocultar sequência'
                        : 'Ver sequência (${route['totalLinhas'] ?? 0} endereços)',
                    style: TextStyle(
                        fontSize: 12, color: context.textFaint),
                  ),
                  const Spacer(),
                  Icon(
                    isExpanded
                        ? Icons.expand_less
                        : Icons.expand_more,
                    size: 18,
                    color: context.textFaint,
                  ),
                ],
              ),
            ),
          ),

          // Lista expandida
          if (isExpanded) ...[
            for (int i = 0; i < routeRows.length && i < 200; i++)
              _seqRow(routeRows[i], i == 0),
            if (nuanceRows.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 6),
                color: context.accentDim,
                child: Text('NÃO ROTEADAS — VERIFICAR',
                    style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                        color: context.accent)),
              ),
              for (final r in nuanceRows) _nuanceRow(r),
            ],
          ],
        ],
      ),
    );
  }

  // ── Card: condomínio em desenvolvimento ───────────────────────────────────

  Widget _buildDevCard(Map<String, dynamic> grupo) {
    const amber = Color(0xFFd97706);
    final condoNome = grupo['condoNome']?.toString() ?? 'Condomínio';
    final enderecos = (grupo['enderecos'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];
    final condoId = grupo['condoId']?.toString() ?? 'dev';
    final isExpanded = _expandedGroups.contains('dev_$condoId');

    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.borderStrong),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            decoration: BoxDecoration(
              border: Border(
                left: const BorderSide(color: amber, width: 3),
                bottom: BorderSide(color: context.border),
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(14),
                topRight: Radius.circular(14),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: amber.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: const Text('EM BREVE',
                      style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                          color: amber)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(condoNome,
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: context.text)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: context.surface,
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(color: context.borderStrong),
                  ),
                  child: Text('${enderecos.length} end.',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: context.textFaint)),
                ),
              ],
            ),
          ),

          // Mensagem
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info_outline, size: 15, color: amber),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Encontramos ${enderecos.length} entrega(s) para $condoNome, mas ainda estamos '
                    'mapeando este condomínio. A roteização automática estará disponível em breve.',
                    style: TextStyle(
                        fontSize: 13,
                        color: context.textMuted,
                        height: 1.5),
                  ),
                ),
              ],
            ),
          ),

          // Toggle lista
          if (enderecos.isNotEmpty) ...[
            GestureDetector(
              onTap: () => setState(() {
                final k = 'dev_$condoId';
                if (_expandedGroups.contains(k)) {
                  _expandedGroups.remove(k);
                } else {
                  _expandedGroups.add(k);
                }
              }),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: context.border)),
                ),
                child: Row(
                  children: [
                    Text(
                      isExpanded ? 'Ocultar endereços' : 'Ver endereços',
                      style: TextStyle(fontSize: 12, color: context.textFaint),
                    ),
                    const Spacer(),
                    Icon(
                        isExpanded ? Icons.expand_less : Icons.expand_more,
                        size: 18,
                        color: context.textFaint),
                  ],
                ),
              ),
            ),
            if (isExpanded)
              for (final e in enderecos) _enderecoRow(e),
          ],
        ],
      ),
    );
  }

  // ── Card: não localizado ──────────────────────────────────────────────────

  Widget _buildNaoLocalizadoCard(Map<String, dynamic> grupo) {
    final enderecos = (grupo['enderecos'] as List?)
            ?.map((e) => Map<String, dynamic>.from(e as Map))
            .toList() ??
        [];
    final isExpanded = _expandedGroups.contains('nao_loc');

    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.borderStrong),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(color: context.borderStrong, width: 3),
                bottom: BorderSide(color: context.border),
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(14),
                topRight: Radius.circular(14),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: context.surface,
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(color: context.borderStrong),
                  ),
                  child: Text('NÃO IDENTIFICADO',
                      style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                          color: context.textFaint)),
                ),
                const SizedBox(width: 8),
                Text('${enderecos.length} endereço(s)',
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: context.textMuted)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              '${enderecos.length} endereço(s) não foram identificados em nenhum condomínio mapeado. '
              'Pode ser que ainda estejamos mapeando essa região, ou que o endereço esteja fora da área de cobertura.',
              style: TextStyle(
                  fontSize: 13, color: context.textFaint, height: 1.5),
            ),
          ),
          if (enderecos.isNotEmpty) ...[
            GestureDetector(
              onTap: () => setState(() {
                if (_expandedGroups.contains('nao_loc')) {
                  _expandedGroups.remove('nao_loc');
                } else {
                  _expandedGroups.add('nao_loc');
                }
              }),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: context.border)),
                ),
                child: Row(
                  children: [
                    Text(
                      isExpanded ? 'Ocultar endereços' : 'Ver endereços',
                      style:
                          TextStyle(fontSize: 12, color: context.textFaint),
                    ),
                    const Spacer(),
                    Icon(
                        isExpanded ? Icons.expand_less : Icons.expand_more,
                        size: 18,
                        color: context.textFaint),
                  ],
                ),
              ),
            ),
            if (isExpanded)
              for (final e in enderecos) _enderecoRow(e),
          ],
        ],
      ),
    );
  }

  // ── Rows compartilhados ───────────────────────────────────────────────────

  Widget _miniStat(String value, String label, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: color,
                letterSpacing: -0.5)),
        Text(label,
            style: TextStyle(
                fontSize: 10,
                color: context.textFaint,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.2)),
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
                      style:
                          TextStyle(fontSize: 11, color: context.textMuted)),
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
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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

  Widget _nuanceRow(Map<String, dynamic> r) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration:
          BoxDecoration(border: Border(top: BorderSide(color: context.border))),
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
            child:
                Center(child: Icon(Icons.warning_amber, size: 14, color: context.accent)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(r['enderecoOriginal']?.toString() ?? '',
                    style: TextStyle(fontSize: 12, color: context.textFaint),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis),
                Text(r['motivo']?.toString() ?? '',
                    style: TextStyle(
                        fontSize: 11,
                        color: context.accent,
                        fontStyle: FontStyle.italic)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _enderecoRow(Map<String, dynamic> e) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration:
          BoxDecoration(border: Border(top: BorderSide(color: context.border))),
      child: Row(
        children: [
          Icon(Icons.location_on_outlined, size: 13, color: context.textFaint),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              e['endereco']?.toString() ?? '',
              style: TextStyle(fontSize: 12, color: context.textFaint),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Text('linha ${e['linha']}',
              style: TextStyle(fontSize: 10, color: context.textFaint)),
        ],
      ),
    );
  }

  // ── TELA: NAVEGAÇÃO ───────────────────────────────────────────────────────

  Widget _buildNavigationScreen(
    List<Map<String, dynamic>> routeRows,
    List<Map<String, dynamic>> nuanceRows,
  ) {
    final row = routeRows[_currentDeliveryIdx];
    final total = routeRows.length;
    final progress = _currentDeliveryIdx / total;
    final condoNome = _navGroup?['condoNome']?.toString() ?? '';
    final instrucao =
        row['instrucao']?.toString() ?? 'Siga as instruções do mapa.';
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
              // Header com progresso
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
                                Text(
                                    'Entrega ${_currentDeliveryIdx + 1} de $total',
                                    style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900,
                                        color: context.text)),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              TextButton(
                                onPressed: _voltarResultados,
                                style: TextButton.styleFrom(
                                  foregroundColor: context.textFaint,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(99),
                                    side:
                                        BorderSide(color: context.borderStrong),
                                  ),
                                ),
                                child: const Text('← Voltar',
                                    style: TextStyle(fontSize: 11)),
                              ),
                              const SizedBox(width: 6),
                              TextButton(
                                onPressed: () =>
                                    setState(() => _completed = true),
                                style: TextButton.styleFrom(
                                  foregroundColor: context.textFaint,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(99),
                                    side:
                                        BorderSide(color: context.borderStrong),
                                  ),
                                ),
                                child: const Text('Encerrar',
                                    style: TextStyle(fontSize: 11)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    ClipRRect(
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 4,
                        backgroundColor: context.border,
                        valueColor: AlwaysStoppedAnimation<Color>(context.ok),
                      ),
                    ),
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
                            width: isCur ? 20 : 8,
                            height: 8,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(99),
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

              // Instrução
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

              // Info do endereço
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
                                color: _classColor(cls).withValues(alpha: 0.3)),
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
                              color: const Color(0xFF7C3AED)
                                  .withValues(alpha: 0.12),
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
                          fontSize: 12,
                          color: context.textFaint,
                          height: 1.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // ENTREGUE
              SizedBox(
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: () => _handleEntregue(routeRows),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16a34a),
                    foregroundColor: Colors.white,
                    elevation: 4,
                    shadowColor:
                        const Color(0xFF16a34a).withValues(alpha: 0.4),
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
    final skippedRows = routeRows
        .where((r) => _skippedLines.contains(r['linha'] as int))
        .toList();

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
                        style: TextStyle(fontSize: 48),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    const Text('Rota concluída!',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFFe8f5ec))),
                    const SizedBox(height: 4),
                    Text(
                      _navGroup?['condoNome']?.toString() ?? '',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontSize: 13, color: Color(0xFF5fb87a)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 1.3,
                children: [
                  _statTile('$totalEntregues', 'Entregues', context.ok),
                  _statTile('$totalPuladas', 'Puladas', context.accent),
                  _statTile('${nuanceRows.length}', 'Não roteadas',
                      context.textFaint),
                ],
              ),

              if (skippedRows.isNotEmpty) ...[
                const SizedBox(height: 16),
                CardSection(
                  header: const CardHeaderLabel('Entregas puladas'),
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
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _voltarResultados,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: context.textMuted,
                        side: BorderSide(color: context.borderStrong),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                      icon: const Icon(Icons.arrow_back, size: 16),
                      label: const Text('Ver resultados',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _novaRota(svc),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: context.text,
                        foregroundColor: context.bg,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Nova Rota',
                          style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statTile(String value, String label, Color accent) {
    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderStrong),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(value,
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: accent)),
          const SizedBox(height: 2),
          Text(label,
              style: TextStyle(
                  fontSize: 10,
                  color: context.textFaint,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
