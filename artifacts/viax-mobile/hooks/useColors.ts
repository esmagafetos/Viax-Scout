import { useColorScheme } from 'react-native';
import { Colors, type Theme } from '@/constants/colors';

export function useColors(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
