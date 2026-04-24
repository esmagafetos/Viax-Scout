import React from 'react';
import { View, type ViewProps } from 'react-native';
import { MotiView } from 'moti';
import { useColors } from '../../lib/theme';

interface CardProps extends ViewProps {
  padding?: number;
  animate?: boolean;
  delay?: number;
}

export function Card({ children, style, padding = 0, animate = false, delay = 0, ...rest }: CardProps) {
  const c = useColors();
  const Component: any = animate ? MotiView : View;
  const animProps = animate
    ? {
        from: { opacity: 0, translateY: 8 },
        animate: { opacity: 1, translateY: 0 },
        transition: { type: 'timing' as const, duration: 280, delay },
      }
    : {};
  return (
    <Component
      {...animProps}
      {...rest}
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.borderStrong,
          borderWidth: 1,
          borderRadius: 14,
          padding,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
          overflow: 'hidden',
        },
        style as any,
      ]}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, style }: ViewProps) {
  const c = useColors();
  return (
    <View
      style={[
        { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
        style as any,
      ]}
    >
      {children}
    </View>
  );
}

export function CardBody({ children, style, padding = 18 }: ViewProps & { padding?: number }) {
  return <View style={[{ padding }, style as any]}>{children}</View>;
}
