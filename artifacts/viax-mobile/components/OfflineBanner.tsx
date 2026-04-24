import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const off =
        state.isConnected === false ||
        state.isInternetReachable === false;
      setOffline(off);
    });
    return () => unsub();
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <MotiView
          from={{ translateY: -50, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          exit={{ translateY: -50, opacity: 0 }}
          transition={{ type: 'timing', duration: 220 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            elevation: 100,
            backgroundColor: '#dc2626',
            paddingTop: insets.top + 8,
            paddingBottom: 10,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>
            Sem conexão · operando offline
          </Text>
        </MotiView>
      )}
    </AnimatePresence>
  );
}
