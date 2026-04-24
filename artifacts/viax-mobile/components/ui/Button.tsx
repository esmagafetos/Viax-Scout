import React from "react";
import { ActivityIndicator, Pressable, Text, View, type PressableProps, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme, radii } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

type Props = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
};

export default function Button({
  label, variant = "primary", loading, fullWidth, size = "md",
  leftIcon, rightIcon, onPress, disabled, style, ...rest
}: Props) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: { bg: t.accent, fg: "#fff", border: t.accent },
    secondary: { bg: t.surface2, fg: t.text, border: t.borderStrong },
    ghost: { bg: "transparent", fg: t.text, border: "transparent" },
    danger: { bg: "transparent", fg: t.accent, border: t.accent },
    outline: { bg: "transparent", fg: t.text, border: t.borderStrong },
  }[variant];

  const sizes = {
    sm: { py: 8, px: 14, fs: 13 },
    md: { py: 12, px: 18, fs: 14 },
    lg: { py: 14, px: 22, fs: 15 },
  }[size];

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      onPress={(e) => {
        if (!isDisabled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }
      }}
      style={({ pressed }) => [{
        backgroundColor: palette.bg,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: radii.pill,
        paddingVertical: sizes.py,
        paddingHorizontal: sizes.px,
        opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        ...style,
      }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {leftIcon}
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: sizes.fs, color: palette.fg, letterSpacing: 0.2 }}>
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}
