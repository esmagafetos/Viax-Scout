import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useColors } from '../../lib/theme';

interface Props {
  variant?: 'pill' | 'icon';
}

export default function ThemeToggle({ variant = 'pill' }: Props) {
  const { mode, toggle } = useTheme();
  const c = useColors();
  const dark = mode === 'dark';

  if (variant === 'icon') {
    return (
      <Pressable
        onPress={toggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: dark }}
        accessibilityLabel="Alternar tema"
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={15} color={c.textMuted} />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={toggle} accessibilityRole="switch" accessibilityState={{ checked: dark }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 99,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.borderStrong,
        }}
      >
        <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={13} color={c.textMuted} />
        <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 11, color: c.textMuted }}>
          {dark ? 'Claro' : 'Escuro'}
        </Text>
      </View>
    </Pressable>
  );
}
