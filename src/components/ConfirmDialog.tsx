import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Sheet from './Sheet';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

const ConfirmDialog = ({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  icon,
}: ConfirmDialogProps) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, destructive), [colors, destructive]);

  return (
    <Sheet visible={visible} onClose={onCancel} variant="center" maxWidth={400} showCloseButton={false}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={icon || (destructive ? 'alert-circle-outline' : 'help-circle-outline')}
          size={28}
          color={destructive ? colors.error : colors.primary}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <Button label={cancelLabel} variant="tertiary" onPress={onCancel} fullWidth style={styles.actionBtn} />
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
          loading={loading}
          fullWidth
          style={styles.actionBtn}
        />
      </View>
    </Sheet>
  );
};

const createStyles = (c: ThemeColors, destructive: boolean) =>
  StyleSheet.create({
    iconWrap: {
      alignSelf: 'center',
      width: 56,
      height: 56,
      borderRadius: RADIUS.pill,
      backgroundColor: destructive ? `${c.error}1A` : c.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: destructive ? `${c.error}33` : c.pillBorder,
    },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h3,
      fontWeight: WEIGHT.bold,
      color: c.text,
      textAlign: 'center',
      marginBottom: SPACING.sm,
    },
    message: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: SPACING.lg,
    },
    actions: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    actionBtn: { flex: 1 },
  });

export default ConfirmDialog;
