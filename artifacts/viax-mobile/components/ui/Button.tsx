import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useColors } from '../../lib/theme';

type Variant = 'primary' | 'ghost' | 'dark' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = true,
}: ButtonProps) {
  const c = useColors();
  const isDisabled = disabled || loading;

  const sizes = {
    sm: { py: 8, px: 14, fontSize: 12, iconSize: 13 },
    md: { py: 12, px: 18, fontSize: 13, iconSize: 14 },
    lg: { py: 14, px: 20, fontSize: 14, iconSize: 16 },
  } as const;
  const sz = sizes[size];

  let bg: string = c.accent;
  let fg: string = '#ffffff';
  let borderColor: string = 'transparent';
  let borderWidth = 0;
  let shadow: any = { shadowColor: c.accent, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } };

  if (variant === 'ghost') {
    bg = 'transparent';
    fg = c.textMuted;
    borderColor = c.borderStrong;
    borderWidth = 1;
    shadow = {};
  } else if (variant === 'dark') {
    bg = c.text;
    fg = c.bg;
    shadow = {};
  } else if (variant === 'destructive') {
    bg = c.destructive;
    fg = '#ffffff';
    shadow = {};
  }

  return (
    <Pressable onPress={onPress} disabled={isDisabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: isDisabled, busy: loading }}>
      {({ pressed }) => (
        <MotiView
          animate={{ opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1, scale: pressed && !isDisabled ? 0.98 : 1 }}
          transition={{ type: 'timing', duration: 120 }}
          style={[
            {
              backgroundColor: bg,
              borderColor,
              borderWidth,
              borderRadius: 99,
              paddingVertical: sz.py,
              paddingHorizontal: sz.px,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              alignSelf: fullWidth ? 'stretch' : 'flex-start',
              elevation: shadow.shadowOpacity ? 2 : 0,
            },
            shadow,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={fg} />
          ) : (
            <>
              {iconLeft && <Ionicons name={iconLeft} size={sz.iconSize} color={fg} />}
              <Text style={{ color: fg, fontFamily: 'Poppins_600SemiBold', fontSize: sz.fontSize, letterSpacing: 0.1 }}>
                {label}
              </Text>
              {iconRight && <Ionicons name={iconRight} size={sz.iconSize} color={fg} />}
            </>
          )}
        </MotiView>
      )}
    </Pressable>
  );
}
