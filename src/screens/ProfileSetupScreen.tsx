import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/Topography';
import { getSoilZones } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProfileSetupScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, userData, updateUserData } = useAuth();
  const [name, setName] = useState(userData?.name || user?.email?.split('@')[0] || '');
  const [zones, setZones] = useState<Array<{ sub_county: string; soil_type: string }>>([]);
  const [subCounty, setSubCounty] = useState('');
  const [soilType, setSoilType] = useState('');
  const [open, setOpen] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadZones = async () => {
      try {
        setLoadingZones(true);
        const payload = await getSoilZones();
        const list = payload?.soil_zones || [];
        setZones(list);
      } catch {
        setError('Could not load sub-county list.');
      } finally {
        setLoadingZones(false);
      }
    };
    loadZones();
  }, []);

  const handleSelectSubCounty = (value: string) => {
    setSubCounty(value);
    const mapped = zones.find((z) => z.sub_county === value);
    setSoilType(mapped?.soil_type || '');
  };

  const handleContinue = async () => {
    try {
      if (!name.trim()) {
        setError('Name is required.');
        return;
      }
      if (!subCounty) {
        setError('Select your sub-county.');
        return;
      }
      setError('');
      setSaving(true);
      await updateUserData({
        name: name.trim(),
        region: 'Luwero',
        subCounty,
        soilType,
        profileComplete: true,
      });
    } catch (e: any) {
      setError(e?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="account-cog-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Set your sub-county to unlock accurate recommendations.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.lightText}
          />

          <Text style={styles.fieldLabel}>Sub-county</Text>
          {loadingZones ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <TouchableOpacity style={styles.selectField} onPress={() => setOpen(true)}>
              <Text style={styles.selectValue}>{subCounty || 'Select sub-county'}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.lightText} />
            </TouchableOpacity>
          )}

          <Text style={styles.fieldLabel}>Mapped Soil Type</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            editable={false}
            value={soilType}
            placeholder="Auto-mapped from sub-county"
            placeholderTextColor={colors.lightText}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, (saving || !name.trim() || !subCounty) && styles.primaryButtonDisabled]}
            onPress={handleContinue}
            disabled={saving || !name.trim() || !subCounty}
          >
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Continue</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sub-county</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color={colors.lightText} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {zones.map((zone) => {
                const active = subCounty === zone.sub_county;
                return (
                  <TouchableOpacity
                    key={zone.sub_county}
                    style={[styles.modalOption, active && styles.modalOptionActive]}
                    onPress={() => {
                      handleSelectSubCounty(zone.sub_county);
                      setOpen(false);
                    }}
                  >
                    <View style={styles.modalTextWrap}>
                      <Text style={[styles.modalOptionTitle, active && styles.modalOptionTitleActive]}>{zone.sub_county}</Text>
                      <Text style={styles.modalOptionHint}>Mapped soil: {zone.soil_type}</Text>
                    </View>
                    {active && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, padding: 20, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 16 },
    headerIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    title: { fontFamily: FONT_FAMILY, fontSize: TYPE.h2, fontWeight: WEIGHT.bold, color: colors.primary },
    subtitle: { marginTop: 5, fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, color: colors.lightText, textAlign: 'center' },
    card: {
      backgroundColor: colors.glass,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 3,
    },
    fieldLabel: { marginTop: 4, marginBottom: 6, color: colors.lightText, fontFamily: FONT_FAMILY, fontSize: TYPE.caption },
    input: {
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      backgroundColor: colors.glassSoft,
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
    },
    disabledInput: {
      backgroundColor: colors.surfaceAlt,
      color: colors.lightText,
    },
    selectField: {
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      backgroundColor: colors.glassSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectValue: {
      color: colors.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
    },
    primaryButton: {
      marginTop: 14,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.55,
    },
    primaryButtonText: { color: colors.white, fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, fontWeight: WEIGHT.semibold },
    error: { marginTop: 10, color: colors.error, fontFamily: FONT_FAMILY, fontSize: TYPE.caption },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.glass,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 14,
      maxHeight: 500,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: { fontFamily: FONT_FAMILY, fontSize: TYPE.body, color: colors.secondary, fontWeight: WEIGHT.bold },
    modalOption: {
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      backgroundColor: colors.glassSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.pillBg,
    },
    modalTextWrap: { flex: 1 },
    modalOptionTitle: { color: colors.text, fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, fontWeight: WEIGHT.semibold },
    modalOptionTitleActive: { color: colors.primary },
    modalOptionHint: { color: colors.lightText, fontFamily: FONT_FAMILY, fontSize: TYPE.caption, marginTop: 2 },
  });

export default ProfileSetupScreen;
