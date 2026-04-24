import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface LogoIconProps {
  size?: number;
  color?: string;
  accentColor?: string;
}

export function LogoIcon({ size = 28, color = '#1a1917', accentColor = '#d4521a' }: LogoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Path
        d="M7 7C7 7 7 16 14 18C20 20 21 21 21 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={7} cy={7} r={2.5} fill={color} />
      <Circle cx={21} cy={21} r={4.5} fill={accentColor} />
      <Circle cx={21} cy={21} r={1.8} fill="white" />
    </Svg>
  );
}

interface AppIconProps {
  size?: number;
  dark?: boolean;
}

export function AppIcon({ size = 40, dark = false }: AppIconProps) {
  const bg = dark ? '#121110' : '#ffffff';
  const fg = dark ? '#f0ede8' : '#1a1917';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width={40} height={40} rx={9} fill={bg} />
      <Path
        d="M10 10C10 10 10 20 17 22C23 24 24 25 24 25"
        stroke={fg}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={10} cy={10} r={3} fill={fg} />
      <Circle cx={30} cy={30} r={5.5} fill="#d4521a" />
      <Circle cx={30} cy={30} r={2.2} fill="white" />
    </Svg>
  );
}

interface ViaXLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  dark?: boolean;
  showTagline?: boolean;
}

const SIZES = {
  sm: { icon: 18, name: 13, tagline: 8, gap: 6 },
  md: { icon: 24, name: 16, tagline: 9, gap: 9 },
  lg: { icon: 32, name: 21, tagline: 10, gap: 11 },
  xl: { icon: 48, name: 30, tagline: 12, gap: 16 },
} as const;

export default function ViaXLogo({
  size = 'md',
  dark = false,
  showTagline = true,
}: ViaXLogoProps) {
  const s = SIZES[size];
  const textColor = dark ? '#f0ede8' : '#1a1917';
  const mutedColor = dark ? 'rgba(240,237,232,0.4)' : 'rgba(26,25,23,0.4)';
  const taglineColor = dark ? 'rgba(240,237,232,0.45)' : 'rgba(26,25,23,0.4)';

  return (
    <View className="flex-row items-center" style={{ gap: s.gap }}>
      <LogoIcon size={s.icon} color={textColor} />
      <View>
        <Text
          style={{
            fontFamily: 'Poppins_700Bold',
            fontSize: s.name,
            color: textColor,
            letterSpacing: -0.2,
            lineHeight: showTagline ? s.name * 1.15 : s.name,
          }}
        >
          ViaX<Text style={{ color: mutedColor, fontFamily: 'Poppins_400Regular' }}>:</Text>Trace
        </Text>
        {showTagline && (
          <Text
            style={{
              fontSize: s.tagline,
              color: taglineColor,
              letterSpacing: 1.2,
              fontFamily: 'Poppins_600SemiBold',
              textTransform: 'uppercase',
              marginTop: 1,
            }}
          >
            Auditoria de Rotas
          </Text>
        )}
      </View>
    </View>
  );
}
