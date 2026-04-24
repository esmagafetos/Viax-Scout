import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '../../lib/theme';

interface Props {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = 6, style }: Props) {
  const c = useColors();
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 0.85 }}
      transition={{ type: 'timing', duration: 900, loop: true, repeatReverse: true }}
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: c.surface2,
        },
        style,
      ]}
    />
  );
}

export function Spinner({ size = 32, color }: { size?: number; color?: string }) {
  const c = useColors();
  return (
    <MotiView
      from={{ rotate: '0deg' }}
      animate={{ rotate: '360deg' }}
      transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: false }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: c.borderStrong,
        borderTopColor: color ?? c.accent,
      }}
    />
  );
}
