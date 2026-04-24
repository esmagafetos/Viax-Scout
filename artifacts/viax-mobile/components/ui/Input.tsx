import React, { forwardRef } from "react";
import { TextInput, View, Text, type TextInputProps, type ViewStyle } from "react-native";
import { useTheme, radii } from "@/lib/theme";

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  containerStyle?: ViewStyle;
};

const Input = forwardRef<TextInput, Props>(function Input(
  { label, hint, error, leftIcon, rightAdornment, containerStyle, style, ...rest },
  ref
) {
  const t = useTheme();
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && (
        <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: t.textMuted, letterSpacing: 0.2 }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: t.surface,
          borderColor: error ? t.accent : t.borderStrong,
          borderWidth: 1,
          borderRadius: radii.md,
          paddingHorizontal: 14,
          minHeight: 46,
        }}
      >
        {leftIcon && <View style={{ marginRight: 10 }}>{leftIcon}</View>}
        <TextInput
          ref={ref}
          placeholderTextColor={t.textFaint}
          style={[{
            flex: 1,
            fontFamily: "Poppins_400Regular",
            fontSize: 14,
            color: t.text,
            paddingVertical: 10,
          }, style]}
          {...rest}
        />
        {rightAdornment}
      </View>
      {error ? (
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: t.accent }}>{error}</Text>
      ) : hint ? (
        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 11, color: t.textFaint }}>{hint}</Text>
      ) : null}
    </View>
  );
});

export default Input;
