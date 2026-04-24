import React, { useMemo } from "react";
import { View } from "react-native";
import { Canvas, Path, Skia, LinearGradient, vec } from "@shopify/react-native-skia";
import { useTheme } from "@/lib/theme";

export function Sparkline({ values, width = 120, height = 44, stroke }: { values: number[]; width?: number; height?: number; stroke?: string }) {
  const t = useTheme();
  const { line, fill } = useMemo(() => {
    if (values.length < 2) {
      const p = Skia.Path.Make(); p.moveTo(0, height / 2); p.lineTo(width, height / 2);
      return { line: p, fill: Skia.Path.Make() };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const stepX = width / (values.length - 1);

    const line = Skia.Path.Make();
    const fill = Skia.Path.Make();
    values.forEach((v, i) => {
      const x = i * stepX;
      const y = height - 4 - ((v - min) / span) * (height - 8);
      if (i === 0) { line.moveTo(x, y); fill.moveTo(x, height); fill.lineTo(x, y); }
      else { line.lineTo(x, y); fill.lineTo(x, y); }
    });
    fill.lineTo(width, height); fill.close();
    return { line, fill };
  }, [values, width, height]);

  const color = stroke ?? t.accent;
  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        <Path path={fill} style="fill">
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[`${color}40`, `${color}00`]} />
        </Path>
        <Path path={line} style="stroke" strokeWidth={2} color={color} />
      </Canvas>
    </View>
  );
}

export function BarChart({ values, labels, width, height = 160, color }: { values: number[]; labels?: string[]; width: number; height?: number; color?: string }) {
  const t = useTheme();
  const c = color ?? t.accent;
  const { bars, max } = useMemo(() => {
    const m = Math.max(1, ...values);
    const padX = 8;
    const gap = 6;
    const innerW = width - padX * 2 - gap * (values.length - 1);
    const bw = Math.max(4, innerW / Math.max(1, values.length));
    const innerH = height - 24;
    return {
      max: m,
      bars: values.map((v, i) => {
        const h = Math.max(2, (v / m) * innerH);
        return { x: padX + i * (bw + gap), y: innerH - h + 8, w: bw, h, v };
      }),
    };
  }, [values, width, height]);

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    bars.forEach((b) => {
      p.addRRect({ rect: { x: b.x, y: b.y, width: b.w, height: b.h }, rx: 3, ry: 3 });
    });
    return p;
  }, [bars]);

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        <Path path={path} style="fill" color={c} />
      </Canvas>
    </View>
  );
}

export function Donut({ value, size = 120, stroke = 12, color, trackColor }: { value: number; size?: number; stroke?: number; color?: string; trackColor?: string }) {
  const t = useTheme();
  const c = color ?? t.accent;
  const tc = trackColor ?? t.surface2;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const v = Math.max(0, Math.min(1, value));

  const track = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(cx, cy, r);
    return p;
  }, [cx, cy, r]);

  const arc = useMemo(() => {
    const p = Skia.Path.Make();
    const sweep = 360 * v;
    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, -90, sweep);
    return p;
  }, [cx, cy, r, v]);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={track} style="stroke" strokeWidth={stroke} color={tc} />
      <Path path={arc} style="stroke" strokeWidth={stroke} color={c} strokeCap="round" />
    </Canvas>
  );
}
