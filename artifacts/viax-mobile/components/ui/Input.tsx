import React, { useState, forwardRef } from 'react';
import { TextInput, View, Text, type TextInputProps, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, style, onFocus, onBlur, ...rest },
  ref,
) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label && (
        <Text
          style={{
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 10,
            color: c.textFaint,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        placeholderTextColor={c.textFaint}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            backgroundColor: c.surface2,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: error ? c.accent : focused ? c.accent : c.borderStrong,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontFamily: 'Poppins_400Regular',
            fontSize: 14,
            color: c.text,
          },
          style as any,
        ]}
        {...rest}
      />
      {error && (
        <Text style={{ fontSize: 11, color: c.accent, marginTop: 4, fontFamily: 'Poppins_500Medium' }}>{error}</Text>
      )}
      {!error && hint && (
        <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>{hint}</Text>
      )}
    </View>
  );
});

interface PasswordInputProps extends Omit<InputProps, 'secureTextEntry'> {}

export function PasswordInput({ label, error, hint, ...rest }: PasswordInputProps) {
  const c = useColors();
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label && (
        <Text
          style={{
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 10,
            color: c.textFaint,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      )}
      <View style={{ position: 'relative' }}>
        <TextInput
          placeholderTextColor={c.textFaint}
          secureTextEntry={!show}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            backgroundColor: c.surface2,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: error ? c.accent : focused ? c.accent : c.borderStrong,
            paddingHorizontal: 14,
            paddingRight: 42,
            paddingVertical: 12,
            fontFamily: 'Poppins_400Regular',
            fontSize: 14,
            color: c.text,
          }}
          {...rest}
        />
        <Pressable
          onPress={() => setShow((s) => !s)}
          style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.textFaint} />
        </Pressable>
      </View>
      {error && (
        <Text style={{ fontSize: 11, color: c.accent, marginTop: 4, fontFamily: 'Poppins_500Medium' }}>{error}</Text>
      )}
      {!error && hint && (
        <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>{hint}</Text>
      )}
    </View>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const c = useColors();
  if (!password) return null;
  const checks = [
    { ok: password.length >= 8, label: '8+' },
    { ok: /[A-Za-z]/.test(password), label: 'Letra' },
    { ok: /[0-9]/.test(password), label: 'Número' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'Símbolo' },
  ];
  const score = checks.filter((c) => c.ok).length;
  const levels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const colors = [c.accent, c.accent, '#f59e0b', '#22c55e', '#16a34a'];
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 5 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 99,
              backgroundColor: i < score ? colors[score] : c.borderStrong,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        <Text style={{ fontSize: 10, color: score >= 3 ? '#22c55e' : c.textFaint, fontFamily: 'Poppins_500Medium' }}>
          {levels[score]}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {checks.map((ck) => (
            <Text
              key={ck.label}
              style={{
                fontSize: 9,
                color: ck.ok ? '#22c55e' : c.textFaint,
                fontFamily: ck.ok ? 'Poppins_600SemiBold' : 'Poppins_400Regular',
              }}
            >
              {ck.ok ? '✓ ' : '· '}
              {ck.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}
