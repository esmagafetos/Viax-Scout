import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export function LogoIcon({ size = 36 }: { size?: number }) {
  const c = useColors();
  return (
    <View
      style={[
        styles.iconWrap,
        { width: size, height: size, borderRadius: size / 2.4, backgroundColor: c.accentDim },
      ]}
    >
      <Ionicons name="navigate" size={size * 0.55} color={c.accent} />
    </View>
  );
}

export function ViaXLogo({ tagline = true }: { tagline?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <LogoIcon size={36} />
      <View>
        <Text style={[styles.brand, { color: c.text }]}>ViaX:Trace</Text>
        {tagline && (
          <Text style={[styles.tag, { color: c.textMuted }]}>AUDITORIA DE ROTAS</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, letterSpacing: -0.3 },
  tag: { fontFamily: 'Poppins_500Medium', fontSize: 9, letterSpacing: 1.4, marginTop: -2 },
});
