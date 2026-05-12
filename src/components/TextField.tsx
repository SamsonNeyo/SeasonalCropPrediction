import React, { forwardRef, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

const webNoOutline = { outlineStyle: 'none', outlineWidth: 0 } as any;

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextInputProps['style'];
};

const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    helperText,
    error,
    leftIcon,
    rightAdornment,
    isPassword = false,
    containerStyle,
    inputStyle,
    onFocus,
    onBlur,
    secureTextEntry,
    accessibilityLabel,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const showPasswordToggle = isPassword;
  const effectiveSecure = isPassword ? hidden : secureTextEntry;
  const showError = !!error;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          showError && styles.fieldError,
        ]}
      >
        {leftIcon ? <View style={styles.left}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={effectiveSecure}
          placeholderTextColor={colors.lightText}
          style={[styles.input, Platform.OS === 'web' ? webNoOutline : null, inputStyle]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={accessibilityLabel || label}
        />
        {showPasswordToggle ? (
          <TouchableOpacity
            onPress={() => setHidden((prev) => !prev)}
            style={styles.right}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.secondary}
            />
          </TouchableOpacity>
        ) : null}
        {rightAdornment && !showPasswordToggle ? <View style={styles.right}>{rightAdornment}</View> : null}
      </View>
      {showError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { width: '100%', marginBottom: SPACING.md },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      color: c.lightText,
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.glassBorder,
      backgroundColor: c.glassSoft,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      minHeight: 48,
    },
    fieldFocused: {
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    fieldError: {
      borderColor: c.error,
    },
    left: { marginRight: SPACING.sm },
    right: { marginLeft: SPACING.sm, paddingVertical: 4, paddingHorizontal: 4 },
    input: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      color: c.text,
      paddingVertical: SPACING.md - 2,
    },
    helperText: {
      marginTop: 4,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
    },
    errorText: {
      marginTop: 4,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.error,
      fontWeight: WEIGHT.semibold,
    },
  });

export default TextField;
