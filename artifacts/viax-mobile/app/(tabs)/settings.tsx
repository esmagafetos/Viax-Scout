import { ScrollView, View, StyleSheet, Pressable, Text, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Card, H1, H2, Muted } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/api';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const c = useColors();
  const { user, logout } = useAuth();
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <H1>Ajustes</H1>

        <Card style={{ gap: 6 }}>
          <H2>Perfil</H2>
          <Muted>{user?.name ?? user?.username}</Muted>
          {user?.email && <Muted>{user.email}</Muted>}
        </Card>

        <Card style={{ gap: 0 }}>
          <Row icon="server-outline" label="API" value={getApiUrl()} />
          <Divider />
          <Row icon="information-circle-outline" label="Versão" value={Constants.expoConfig?.version ?? '—'} />
          <Divider />
          <Pressable onPress={() => Linking.openURL('https://github.com')}>
            <Row icon="logo-github" label="Repositório" value="GitHub" />
          </Pressable>
        </Card>

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [
            styles.logout,
            { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={{ color: '#dc2626', fontFamily: 'Poppins_600SemiBold', fontSize: 14 }}>Sair</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const c = useColors();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={c.textMuted} />
      <Text style={{ color: c.text, fontFamily: 'Poppins_500Medium', fontSize: 14, flex: 1 }}>{label}</Text>
      <Text style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 12 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 18, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 13,
  },
});
