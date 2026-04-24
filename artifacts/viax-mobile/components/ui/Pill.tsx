import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useColors } from '../../lib/theme';

interface PillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  variant?: 'default' | 'accent' | 'ok' | 'destructive' | 'custom';
  bgColor?: string;
  fgColor?: string;
}

export function Pill({ label, active, onPress, variant = 'default', bgColor, fgColor }: PillProps) {
  const c = useColors();

  let bg: string = c.surface2;
  let fg: string = c.textMuted;

  if (variant === 'accent') {
    bg = c.accentDim;
    fg = c.accent;
  } else if (variant === 'ok') {
    bg = c.okDim;
    fg = c.ok;
  } else if (variant === 'destructive') {
    bg = 'rgba(220,38,38,0.12)';
    fg = c.destructive;
  } else if (variant === 'custom' && bgColor && fgColor) {
    bg = bgColor;
    fg = fgColor;
  }

  if (active) {
    bg = c.accentDim;
    fg = c.accent;
  }

  const Component: any = onPress ? Pressable : View;

  return (
    <Component onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <View
        style={{
          backgroundColor: bg,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 99,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ fontSize: 11, color: fg, fontFamily: active ? 'Poppins_600SemiBold' : 'Poppins_500Medium', letterSpacing: 0.3 }}>
          {label}
        </Text>
      </View>
    </Component>
  );
}
