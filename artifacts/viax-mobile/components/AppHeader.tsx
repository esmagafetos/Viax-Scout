import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, usePathname } from 'expo-router';
import { MotiView } from 'moti';
import ViaXLogo from './ViaXLogo';
import ThemeToggle from './ui/ThemeToggle';
import { useColors, useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';

interface NavItem {
  href: '/(tabs)/dashboard' | '/(tabs)/process' | '/(tabs)/tool' | '/(tabs)/history' | '/docs';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  match: string;
}

const NAV: NavItem[] = [
  { href: '/(tabs)/dashboard', label: 'Dashboard', icon: 'grid-outline', match: '/dashboard' },
  { href: '/(tabs)/process', label: 'Processar', icon: 'cloud-upload-outline', match: '/process' },
  { href: '/(tabs)/tool', label: 'Ferramenta', icon: 'construct-outline', match: '/tool' },
  { href: '/(tabs)/history', label: 'Histórico', icon: 'time-outline', match: '/history' },
];

export default function AppHeader() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { mode } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <View
      style={{
        backgroundColor: mode === 'dark' ? 'rgba(28,27,25,0.92)' : 'rgba(250,249,246,0.92)',
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        paddingTop: insets.top,
      }}
    >
      {/* Row 1 — brand + actions */}
      <View
        style={{
          height: 52,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/(tabs)/dashboard" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="ViaX:Trace, ir para Dashboard">
            <ViaXLogo size="sm" dark={mode === 'dark'} showTagline />
          </Pressable>
        </Link>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle variant="icon" />
          {user && (
            <Pressable
              onPress={() => setProfileOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Abrir menu do perfil"
              accessibilityState={{ expanded: profileOpen }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: c.accentDim,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: profileOpen ? c.accent : 'transparent',
                overflow: 'hidden',
              }}
            >
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={{ width: 34, height: 34 }} />
              ) : (
                <Text style={{ color: c.accent, fontFamily: 'Poppins_700Bold', fontSize: 13 }}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Row 2 — horizontal nav pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 6 }}
      >
        {NAV.map((item) => {
          const active = pathname.includes(item.match);
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 99,
                  backgroundColor: active ? c.accentDim : c.surface2,
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={13}
                  color={active ? c.accent : c.textMuted}
                />
                <Text
                  style={{
                    color: active ? c.accent : c.textMuted,
                    fontFamily: active ? 'Poppins_600SemiBold' : 'Poppins_500Medium',
                    fontSize: 12,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>

      {/* Profile dropdown modal */}
      <Modal
        transparent
        visible={profileOpen}
        animationType="fade"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setProfileOpen(false)}>
          <View pointerEvents="box-none" style={{ flex: 1 }}>
            <MotiView
              from={{ opacity: 0, translateY: -6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 150 }}
              style={{
                position: 'absolute',
                top: insets.top + 52 + 4,
                right: 12,
                width: 240,
                backgroundColor: c.surface,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: 12,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              }}
            >
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
                <Text numberOfLines={1} style={{ color: c.text, fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>
                  {user?.name}
                </Text>
                <Text numberOfLines={1} style={{ color: c.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 }}>
                  {user?.email}
                </Text>
              </View>
              <View style={{ paddingVertical: 4 }}>
                <DropdownItem
                  icon="settings-outline"
                  label="Configurações"
                  onPress={() => {
                    setProfileOpen(false);
                    router.push('/(tabs)/settings');
                  }}
                />
                <DropdownItem
                  icon="person-outline"
                  label="Perfil"
                  onPress={() => {
                    setProfileOpen(false);
                    router.push('/(tabs)/settings?tab=perfil' as any);
                  }}
                />
                <DropdownItem
                  icon="document-text-outline"
                  label="Documentação"
                  onPress={() => {
                    setProfileOpen(false);
                    router.push('/docs');
                  }}
                />
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingVertical: 4 }}>
                <DropdownItem
                  icon="log-out-outline"
                  label="Sair"
                  destructive
                  onPress={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                />
              </View>
            </MotiView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function DropdownItem({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const c = useColors();
  const color = destructive ? c.destructive : c.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: pressed ? c.surface2 : 'transparent',
      })}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text style={{ color, fontSize: 13, fontFamily: 'Poppins_500Medium' }}>{label}</Text>
    </Pressable>
  );
}
