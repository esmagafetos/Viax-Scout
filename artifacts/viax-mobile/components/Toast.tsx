import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'error') => {
      const id = ++_id;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 12,
          right: 12,
          zIndex: 9999,
          elevation: 99,
          gap: 8,
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <MotiView
              key={t.id}
              from={{ opacity: 0, translateY: -10 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -10 }}
              transition={{ type: 'timing', duration: 250 }}
            >
              <ToastItemView item={t} onClose={() => dismiss(t.id)} />
            </MotiView>
          ))}
        </AnimatePresence>
      </View>
    </ToastContext.Provider>
  );
}

function ToastItemView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const isError = item.type === 'error';
  const isSuccess = item.type === 'success';

  let bg = '#2a1410';
  let borderColor = 'rgba(212,82,26,0.4)';
  let fg = '#f4a58a';
  let icon: keyof typeof Ionicons.glyphMap = 'alert-circle-outline';

  if (isSuccess) {
    bg = '#0d2018';
    borderColor = 'rgba(26,122,74,0.4)';
    fg = '#86efac';
    icon = 'checkmark-circle-outline';
  } else if (!isError) {
    bg = '#1c1b19';
    borderColor = 'rgba(255,255,255,0.18)';
    fg = '#f0ede8';
    icon = 'information-circle-outline';
  }

  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: Platform.OS === 'ios' ? 0.3 : 0,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={{ flex: 1, color: fg, fontSize: 12, fontFamily: 'Poppins_500Medium' }}>{item.message}</Text>
      <Pressable onPress={onClose} hitSlop={10}>
        <Ionicons name="close" size={16} color={fg} style={{ opacity: 0.6 }} />
      </Pressable>
    </View>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
