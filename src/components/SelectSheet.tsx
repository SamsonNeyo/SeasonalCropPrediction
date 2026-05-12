import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Sheet from './Sheet';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';

export type SelectOption<T> = {
  label: string;
  value: T;
  description?: string;
};

type SelectSheetProps<T> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: SelectOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  emptyText?: string;
};

function SelectSheet<T>({
  visible,
  onClose,
  title,
  subtitle,
  options,
  value,
  onSelect,
  emptyText = 'No options available.',
}: SelectSheetProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle} variant="bottom">
      <FlatList
        data={options}
        keyExtractor={(opt, idx) => String(opt.value) + '-' + idx}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
        renderItem={({ item }) => {
          const selected = item.value === value;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              onPress={() => onSelect(item.value)}
              style={[styles.option, selected && styles.optionActive]}
            >
              <View style={styles.optionTextWrap}>
                <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
                {!!item.description && <Text style={styles.description}>{item.description}</Text>}
              </View>
              {selected && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          );
        }}
      />
    </Sheet>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    list: { maxHeight: 380 },
    listContent: { paddingBottom: SPACING.sm, gap: SPACING.sm },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.glassBorder,
      backgroundColor: c.glassSoft,
    },
    optionActive: {
      borderColor: c.primary,
      backgroundColor: c.pillBg,
    },
    optionTextWrap: { flex: 1, paddingRight: SPACING.sm },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.semibold,
      color: c.text,
    },
    labelActive: { color: c.primary },
    description: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
    },
    empty: {
      fontFamily: FONT_FAMILY,
      color: c.lightText,
      textAlign: 'center',
      paddingVertical: SPACING.lg,
      fontSize: TYPE.bodySmall,
    },
  });

export default SelectSheet;
