import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/theme.dart';
import 'layout.dart';

class _TipoSpec {
  final String key;
  final String label;
  final Color color;
  const _TipoSpec(this.key, this.label, this.color);
}

const List<_TipoSpec> _tipoMap = [
  _TipoSpec('rodovia', 'Rodovias', Color(0xFFF97316)),
  _TipoSpec('comercio', 'Comércios', Color(0xFFA855F7)),
  _TipoSpec('via_secundaria', 'Via Secundária', Color(0xFF3B82F6)),
  _TipoSpec('avenida_extensa', 'Av. Extensas', Color(0xFFEAB308)),
  _TipoSpec('residencial', 'Residencial', Color(0xFF22C55E)),
];

class AnalysisChart extends StatelessWidget {
  final int total;
  final int nuances;
  final List<dynamic> detalhes;
  const AnalysisChart({
    super.key,
    required this.total,
    required this.nuances,
    required this.detalhes,
  });

  @override
  Widget build(BuildContext context) {
    final int ok = (total - nuances).clamp(0, total);
    final double pctNuance = total > 0 ? (nuances / total) * 100 : 0;

    final tipoCounts = <String, int>{};
    final tipoNuances = <String, int>{};
    for (final row in detalhes) {
      if (row is! Map) continue;
      final t = (row['tipo_endereco'] ?? 'residencial').toString();
      tipoCounts[t] = (tipoCounts[t] ?? 0) + 1;
      if (row['is_nuance'] == true) {
        tipoNuances[t] = (tipoNuances[t] ?? 0) + 1;
      }
    }

    return CardSection(
      header: const CardHeaderLabel('Análise Visual da Rota'),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
      child: LayoutBuilder(
        builder: (ctx, c) {
          final wide = c.maxWidth > 420;
          final donut = _DonutBlock(
            pctNuance: pctNuance,
            nuances: nuances,
            ok: ok,
          );
          final bars = _BarsBlock(
            tipoCounts: tipoCounts,
            tipoNuances: tipoNuances,
            total: total,
          );
          if (wide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(width: 140, child: donut),
                const SizedBox(width: 20),
                Expanded(child: bars),
              ],
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(child: donut),
              const SizedBox(height: 20),
              bars,
            ],
          );
        },
      ),
    );
  }
}

class _DonutBlock extends StatelessWidget {
  final double pctNuance;
  final int nuances;
  final int ok;
  const _DonutBlock({
    required this.pctNuance,
    required this.nuances,
    required this.ok,
  });

  @override
  Widget build(BuildContext context) {
    final accent = context.accent;
    final okColor = context.ok;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 112,
          height: 112,
          child: CustomPaint(
            painter: _DonutPainter(
              pctNuance: pctNuance,
              okColor: okColor,
              nuanceColor: accent,
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${pctNuance.round()}%',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: context.text,
                      height: 1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Nuances',
                    style: TextStyle(
                      fontSize: 9.5,
                      color: context.textFaint,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 12,
          runSpacing: 4,
          children: [
            _legendDot(context, accent, 'Nuances ($nuances)'),
            _legendDot(context, okColor, 'OK ($ok)'),
          ],
        ),
      ],
    );
  }

  Widget _legendDot(BuildContext context, Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: context.textMuted,
          ),
        ),
      ],
    );
  }
}

class _DonutPainter extends CustomPainter {
  final double pctNuance;
  final Color okColor;
  final Color nuanceColor;
  _DonutPainter({
    required this.pctNuance,
    required this.okColor,
    required this.nuanceColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 14.0;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - stroke / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final pctOk = (100 - pctNuance).clamp(0, 100);
    final okSweep = (pctOk / 100) * 2 * math.pi;
    final nuanceSweep = (pctNuance / 100) * 2 * math.pi;
    const start = -math.pi / 2;

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.butt;

    paint.color = okColor;
    canvas.drawArc(rect, start, okSweep, false, paint);

    paint.color = nuanceColor;
    canvas.drawArc(rect, start + okSweep, nuanceSweep, false, paint);
  }

  @override
  bool shouldRepaint(covariant _DonutPainter old) =>
      old.pctNuance != pctNuance ||
      old.okColor != okColor ||
      old.nuanceColor != nuanceColor;
}

class _BarsBlock extends StatelessWidget {
  final Map<String, int> tipoCounts;
  final Map<String, int> tipoNuances;
  final int total;
  const _BarsBlock({
    required this.tipoCounts,
    required this.tipoNuances,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    final hasAnyNuance = tipoNuances.values.any((v) => v > 0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'DISTRIBUIÇÃO POR TIPO',
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: context.textFaint,
          ),
        ),
        const SizedBox(height: 12),
        for (final t in _tipoMap) ...[
          _bar(context, t),
          const SizedBox(height: 10),
        ],
        if (hasAnyNuance) ...[
          const SizedBox(height: 4),
          Container(
            height: 1,
            color: context.border,
          ),
          const SizedBox(height: 12),
          Text(
            'NUANCES POR TIPO',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
              color: context.textFaint,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final t in _tipoMap)
                if ((tipoNuances[t.key] ?? 0) > 0)
                  _pill(context, t, tipoNuances[t.key]!),
            ],
          ),
        ],
      ],
    );
  }

  Widget _bar(BuildContext context, _TipoSpec t) {
    final count = tipoCounts[t.key] ?? 0;
    final pct = total > 0 ? (count / total) * 100 : 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                t.label,
                style: TextStyle(
                  fontSize: 11.5,
                  color: context.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Text(
              '$count',
              style: TextStyle(
                fontSize: 11.5,
                color: context.textFaint,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(width: 4),
            Text(
              '(${pct.toStringAsFixed(0)}%)',
              style: TextStyle(
                fontSize: 11,
                color: context.textFaint.withValues(alpha: 0.7),
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: Stack(
            children: [
              Container(
                height: 6,
                color: context.borderStrong,
              ),
              FractionallySizedBox(
                widthFactor: (pct.clamp(0, 100)) / 100.0,
                child: Container(
                  height: 6,
                  color: t.color,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _pill(BuildContext context, _TipoSpec t, int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: t.color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: t.color.withValues(alpha: 0.28)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: t.color,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(width: 5),
          Text(
            '${t.label}: $count',
            style: TextStyle(
              fontSize: 11,
              color: context.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
