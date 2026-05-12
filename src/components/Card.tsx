import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle, ViewProps } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';

export type CardVariant = 'glass' | 'solid' | 'soft' | 'outline' | 'flat';

type CardProps = ViewProps & {
  variant?: CardVariant;
  padding?: keyof typeof SPACING | number;
  borderRadius?: keyof typeof RADIUS | number;
  emphasis?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  accent?: 'none' | 'left' | 'top';
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
};

const Card = ({
  variant = 'glass',
  padding = 'lg',
  borderRadius = 'lg',
  emphasis = 'md',
  accent = 'none',
  style,
  children,
  ...rest
}: CardProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const padValue = typeof padding === 'number' ? padding : SPACING[padding];
  const radValue = typeof borderRadius === 'number' ? borderRadius : RADIUS[borderRadius];

  return (
    <View
      {...rest}
      style={[
        styles.base,
        styles[`v_${variant}` as const],
        emphasis !== 'none' ? elevation(colors.shadow, emphasis) : null,
        accent === 'left' ? styles.accentLeft : null,
        accent === 'top' ? styles.accentTop : null,
        { padding: padValue, borderRadius: radValue },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    base: { borderWidth: 1, borderColor: 'transparent' },
    v_glass: { backgroundColor: c.glass, borderColor: c.glassBorder },
    v_solid: { backgroundColor: c.card, borderColor: c.border },
    v_soft: { backgroundColor: c.glassSoft, borderColor: c.glassBorder },
    v_outline: { backgroundColor: 'transparent', borderColor: c.border },
    v_flat: { backgroundColor: c.surfaceAlt, borderColor: 'transparent' },
    accentLeft: { borderLeftWidth: 3, borderLeftColor: c.primary },
    accentTop: { borderTopWidth: 3, borderTopColor: c.accent },
  });

export default Card;
