import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { getSoilZones } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Card from '../components/Card';
import SelectSheet, { SelectOption } from '../components/SelectSheet';
import IconButton from '../components/IconButton';

const ZONE_MESSAGES = [
  'Loading your sub-counties…',
  'Fetching Luwero region data…',
  'Mapping soil zones…',
  'Almost ready…',
];

const ZoneLoader = () => {
  const { colors } = useTheme();
  const [msgIdx, setMsgIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setMsgIdx((i) => (i + 1) % ZONE_MESSAGES.length);
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    return () => clearInterval(cycle);
  }, [fadeAnim]);

  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xl,
      paddingHorizontal: SPACING.xxl,
      backgroundColor: colors.background,
    }}>
      <View style={{
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: colors.iconBg,
        borderWidth: 1,
        borderColor: colors.pillBorder,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <MaterialCommunityIcons name="map-marker-outline" size={34} color={colors.primary} />
      </View>

      <ActivityIndicator size="large" color={colors.primary} />

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', gap: SPACING.sm }}>
        <Text style={{
          fontFamily: FONT_FAMILY,
          fontSize: TYPE.body,
          fontWeight: WEIGHT.bold,
          color: colors.text,
          textAlign: 'center',
        }}>
          {ZONE_MESSAGES[msgIdx]}
        </Text>
        <Text style={{
          fontFamily: FONT_FAMILY,
          fontSize: TYPE.caption,
          color: colors.lightText,
          textAlign: 'center',
          lineHeight: 18,
        }}>
          Finding the best crops for your location
        </Text>
      </Animated.View>
    </View>
  );
};

const ProfileSetupScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, userData, updateUserData, logout } = useAuth();
  const isGuest = !!userData?.isGuest;
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
        setError('Could not load sub-county list. Please check your connection.');
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
      if (!isGuest && !name.trim()) {
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

  const subCountyOptions: SelectOption<string>[] = useMemo(
    () =>
      zones.map((z) => ({
        label: z.sub_county,
        value: z.sub_county,
        description: `Mapped soil: ${z.soil_type}`,
      })),
    [zones],
  );

  if (loadingZones) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.bgAccent} />
        <View style={styles.topBar}>
          <IconButton
            icon="arrow-left"
            variant="soft"
            size="md"
            onPress={logout}
            accessibilityLabel="Go back"
          />
        </View>
        <ZoneLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <View style={styles.topBar}>
        <IconButton
          icon="arrow-left"
          variant="soft"
          size="md"
          onPress={logout}
          accessibilityLabel="Go back"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContent}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name={isGuest ? 'map-marker-outline' : 'account-cog-outline'}
              size={26}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>
            {isGuest ? 'Choose your location' : 'Complete your profile'}
          </Text>
          <Text style={styles.subtitle}>
            {isGuest
              ? 'Select your sub-county to get accurate crop predictions for your area.'
              : 'Set your sub-county to unlock accurate, location-aware recommendations.'}
          </Text>
        </View>

        <Card variant="glass" padding="lg" emphasis="md" style={styles.card}>
          {!isGuest && (
            <TextField
              label="Your name"
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              leftIcon={<MaterialCommunityIcons name="account-outline" size={18} color={colors.lightText} />}
              accessibilityLabel="Your name"
            />
          )}

          <Text style={styles.fieldLabel}>Sub-county</Text>
          <TouchableOpacity
              style={styles.selectField}
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Select sub-county"
              accessibilityHint="Opens a list of sub-counties"
            >
              <View style={styles.selectLeft}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.lightText} />
                <Text style={[styles.selectValue, !subCounty && styles.selectPlaceholder]}>
                  {subCounty || 'Select your sub-county'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.lightText} />
            </TouchableOpacity>

          {!!soilType && (
            <View style={styles.soilCard}>
              <View style={styles.soilIcon}>
                <MaterialCommunityIcons name="terrain" size={16} color={colors.secondary} />
              </View>
              <View style={styles.soilTextWrap}>
                <Text style={styles.soilLabel}>Mapped soil type</Text>
                <Text style={styles.soilValue}>{soilType}</Text>
              </View>
            </View>
          )}

          {!!error && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <Button
            label="Continue"
            onPress={handleContinue}
            loading={saving}
            disabled={(!isGuest && !name.trim()) || !subCounty}
            fullWidth
            size="lg"
            style={styles.submitBtn}
            rightIcon={<MaterialCommunityIcons name="arrow-right" size={18} color={colors.white} />}
            accessibilityLabel="Continue and save profile"
          />
        </Card>
        </View>
      </ScrollView>

      <SelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Select sub-county"
        subtitle="Soil type is mapped automatically once you choose."
        options={subCountyOptions}
        value={subCounty}
        onSelect={(value) => {
          handleSelectSubCounty(value);
          setOpen(false);
        }}
        emptyText="No sub-counties available right now."
      />
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, overflow: 'hidden' },
    topBar: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
    content: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
    innerContent: {},
    header: { alignItems: 'center', marginBottom: SPACING.md },
    headerIcon: {
      width: 60,
      height: 60,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      backgroundColor: c.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h2,
      fontWeight: WEIGHT.bold,
      color: c.primary,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 6,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      textAlign: 'center',
      maxWidth: 320,
      lineHeight: 20,
    },
    card: {},
    fieldLabel: {
      marginTop: 0,
      marginBottom: 6,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      color: c.lightText,
      letterSpacing: 0.2,
    },
    skelGroup: { marginBottom: SPACING.md },
    loadingHintText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
    selectField: {
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md - 2,
      paddingHorizontal: SPACING.md,
      backgroundColor: c.glassSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      marginBottom: SPACING.md,
    },
    selectLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      flex: 1,
    },
    selectValue: {
      color: c.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
    },
    selectPlaceholder: { color: c.lightText },
    soilCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      marginBottom: SPACING.md,
    },
    soilIcon: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    soilTextWrap: { flex: 1 },
    soilLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.secondary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontWeight: WEIGHT.semibold,
    },
    soilValue: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      fontWeight: WEIGHT.semibold,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: `${c.error}15`,
      borderWidth: 1,
      borderColor: `${c.error}40`,
      marginBottom: SPACING.md,
    },
    errorBannerText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      color: c.error,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.semibold,
    },
    submitBtn: { marginTop: SPACING.xs },
    bgAccent: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: c.iconBg,
      right: -60,
      top: -60,
      opacity: 0.5,
    },
  });

export default ProfileSetupScreen;
