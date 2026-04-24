import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { useColors } from '../../lib/theme';

export default function TabsLayout() {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
