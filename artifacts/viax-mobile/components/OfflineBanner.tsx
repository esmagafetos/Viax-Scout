import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/**
 * Mobile-only offline banner. Mounted globally inside `_layout.tsx`.
 *
 * Visible when NetInfo reports `isConnected === false` *or* when it has
 * verified internet reachability is `false`. We treat `null` (unknown) as
 * online to avoid a false-positive flash on cold start.
 */
export function OfflineBanner() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const translate = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    const handle = (s: NetInfoState) => {
      const connected = s.isConnected;
      const reachable = s.isInternetReachable;
      // null = unknown → treat as online (no banner). false = confirmed offline.
      const isOffline = connected === false || reachable === false;
      setOffline(isOffline);
    };
    const unsub = NetInfo.addEventListener(handle);
    NetInfo.fetch().then(handle).catch(() => {});
    return () => unsub();
  }, []);

  useEffect(() => {
    Animated.timing(translate, {
      toValue: offline ? 0 : -80,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [offline, translate]);

  return (
    <Animated.View
      pointerEvents={offline ? 'auto' : 'none'}
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 8,
          backgroundColor: '#dc2626',
          transform: [{ translateY: translate }],
        },
      ]}
    >
      <View style={styles.inner}>
        <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
        <Text style={styles.text}>Sem conexão com a internet</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
});
