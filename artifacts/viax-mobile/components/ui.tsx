import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Radius } from '@/constants/colors';

export function Card({ style, children, ...rest }: ViewProps) {
  const c = useColors();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: Radius.lg,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 24, color: c.text, letterSpacing: -0.5 }}>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: c.text }}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: c.textMuted }}>
      {children}
    </Text>
  );
}

export function Input(props: TextInputProps) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.textFaint}
      {...props}
      style={[
        {
          backgroundColor: c.surface,
          color: c.text,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: Radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: 'Poppins_400Regular',
          fontSize: 14,
        },
        props.style,
      ]}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text
      style={{
        fontFamily: 'Poppins_500Medium',
        fontSize: 12,
        color: c.textMuted,
        marginBottom: 6,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </Text>
  );
}

type ButtonProps = {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ children, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const c = useColors();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: isPrimary ? c.accent : 'transparent',
          borderColor: isPrimary ? c.accent : c.border,
          borderWidth: 1,
          borderRadius: Radius.pill,
          paddingVertical: 13,
          paddingHorizontal: 22,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : c.text} />
      ) : (
        <Text
          style={{
            color: isPrimary ? '#fff' : c.text,
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 14,
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'ok' | 'accent' }) {
  const c = useColors();
  const bg = tone === 'ok' ? 'rgba(46,168,99,0.15)' : tone === 'accent' ? c.accentDim : c.surface2;
  const fg = tone === 'ok' ? c.ok : tone === 'accent' ? c.accent : c.textMuted;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: bg, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontFamily: 'Poppins_500Medium', fontSize: 11 }}>{children}</Text>
    </View>
  );
}

export const screen = StyleSheet.create({
  root: { flex: 1, padding: 18, gap: 16 },
});
