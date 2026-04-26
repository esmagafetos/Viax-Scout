import 'package:flutter/material.dart';

import '../theme/theme.dart';

/// ViaX:Trace brand mark — bold "X" + orange dot accent.
///
/// Espelha o ícone do app (mesmas proporções e composição) pra garantir
/// consistência visual entre a tela inicial do dispositivo e as telas
/// internas do produto. Renderizado via [CustomPainter] pra ser nítido em
/// qualquer densidade e adaptar cores ao tema claro/escuro.
class BrandMark extends StatelessWidget {
  /// Lado do quadrado (largura = altura).
  final double size;

  /// Se `true`, desenha o fundo arredondado escuro (igual ao ícone do app).
  /// Se `false`, desenha apenas o glifo (X + ponto) na cor do tema.
  final bool withBackground;

  /// Sobrescreve a cor do "X" (default: branco se [withBackground] estiver
  /// ativo, `context.text` caso contrário).
  final Color? xColor;

  /// Sobrescreve a cor do ponto (default: laranja da marca).
  final Color? dotColor;

  /// Sobrescreve a cor do fundo (default: `#1A1917`, marrom-quase-preto da marca).
  final Color? backgroundColor;

  const BrandMark({
    super.key,
    this.size = 56,
    this.withBackground = true,
    this.xColor,
    this.dotColor,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ?? const Color(0xFF1A1917);
    final fg = xColor ?? (withBackground ? Colors.white : context.text);
    final accent = dotColor ?? const Color(0xFFD4521A);
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _BrandMarkPainter(
          bgColor: withBackground ? bg : null,
          xColor: fg,
          dotColor: accent,
        ),
      ),
    );
  }
}

class _BrandMarkPainter extends CustomPainter {
  final Color? bgColor;
  final Color xColor;
  final Color dotColor;

  _BrandMarkPainter({
    required this.bgColor,
    required this.xColor,
    required this.dotColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Tudo escalado a partir do design 1024x1024 do ícone do app.
    final s = size.width;
    final scale = s / 1024.0;

    if (bgColor != null) {
      final radius = 230.0 * scale;
      final rect = Rect.fromLTWH(0, 0, s, s);
      final rrect = RRect.fromRectAndRadius(rect, Radius.circular(radius));
      canvas.drawRRect(rrect, Paint()..color = bgColor!);
    }

    final cx = s / 2;
    final cy = s / 2;

    // Tamanhos do glifo: usar a mesma proporção do app icon completo
    // (versão "legacy" com fundo, que ocupa toda a área).
    final hasBg = bgColor != null;
    final reach = (hasBg ? 200.0 : 150.0) * scale;
    final strokeW = (hasBg ? 120.0 : 100.0) * scale;
    final dotOffset = (hasBg ? 248.0 : 180.0) * scale;
    final dotR = (hasBg ? 58.0 : 46.0) * scale;

    final stroke = Paint()
      ..color = xColor
      ..strokeWidth = strokeW
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    canvas.drawLine(Offset(cx - reach, cy - reach), Offset(cx + reach, cy + reach), stroke);
    canvas.drawLine(Offset(cx + reach, cy - reach), Offset(cx - reach, cy + reach), stroke);

    canvas.drawCircle(
      Offset(cx + dotOffset, cy + dotOffset),
      dotR,
      Paint()..color = dotColor,
    );
  }

  @override
  bool shouldRepaint(covariant _BrandMarkPainter old) =>
      old.bgColor != bgColor || old.xColor != xColor || old.dotColor != dotColor;
}

/// Logotipo composto: brand mark + wordmark empilhados verticalmente.
/// Usado nas telas de boas-vindas/login/cadastro pra apresentação da marca.
class BrandLockup extends StatelessWidget {
  final double markSize;
  final double wordmarkSize;
  final bool showSubtitle;

  const BrandLockup({
    super.key,
    this.markSize = 64,
    this.wordmarkSize = 26,
    this.showSubtitle = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        BrandMark(size: markSize),
        const SizedBox(height: 14),
        // Wordmark inline (sem o widget ViaXLogo pra manter alinhamento central)
        DefaultTextStyle.merge(
          style: TextStyle(
            fontSize: wordmarkSize,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
            color: context.text,
          ),
          child: RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: TextStyle(
                fontSize: wordmarkSize,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                color: context.text,
              ),
              children: [
                const TextSpan(text: 'ViaX'),
                TextSpan(
                  text: ':',
                  style: TextStyle(color: context.textFaint, fontWeight: FontWeight.w300),
                ),
                TextSpan(text: 'Trace', style: TextStyle(color: context.accent)),
              ],
            ),
          ),
        ),
        if (showSubtitle)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Auditoria inteligente de rotas',
              style: TextStyle(fontSize: 12, color: context.textFaint),
            ),
          ),
      ],
    );
  }
}
