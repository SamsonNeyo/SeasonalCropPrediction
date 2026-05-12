import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Easing,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';
import { useAuth } from '../context/AuthContext';
import { getSoilZones, predictBySubCounty } from '../services/api';
import {
  cancelWeatherAlertNotification,
  ensureNotificationPermission,
  scheduleWeatherAlertNotification,
} from '../services/notifications';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import TextField from '../components/TextField';
import Skeleton from '../components/Skeleton';
import SelectSheet, { SelectOption } from '../components/SelectSheet';
import { useToast } from '../components/Toast';

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 6) return 'First';
  if (month >= 8 && month <= 12) return 'Second';
  return 'First';
};

const ProfileScreen = () => {
  const { colors, isDark, setDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user, userData, logout, updateUserData } = useAuth();
  const toast = useToast();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [subCountyOpen, setSubCountyOpen] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(userData?.name || user?.email?.split('@')[0] || 'Farmer');
  const [zones, setZones] = useState<Array<{ sub_county: string; soil_type: string }>>([]);
  const [subCounty, setSubCounty] = useState(userData?.subCounty || 'Bamunanika');
  const [soilType, setSoilType] = useState(userData?.soilType || 'Clay Loam');
  const [region, setRegion] = useState(userData?.region || 'Luwero');
  const [photoBase64, setPhotoBase64] = useState<string | null>(userData?.photoBase64 || null);
  const [photoUri, setPhotoUri] = useState<string | null>(userData?.photoUri || null);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const headerIn = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useScrollToTop(scrollRef);

  const displayName = useMemo(() => name || user?.email?.split('@')[0] || 'Farmer', [name, user?.email]);
  const savedSubCounty = userData?.subCounty || subCounty || 'Bamunanika';
  const savedRegion = userData?.region || region || 'Luwero';

  useEffect(() => {
    if (!userData) return;
    setName(userData?.name || user?.email?.split('@')[0] || 'Farmer');
    setSubCounty(userData?.subCounty || 'Bamunanika');
    setSoilType(userData?.soilType || 'Clay Loam');
    setRegion(userData?.region || 'Luwero');
    setPhotoBase64(userData?.photoBase64 || null);
    setPhotoUri(userData?.photoUri || null);
  }, [userData, user?.email]);

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(headerIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerIn, cardIn]);

  useEffect(() => {
    const loadZones = async () => {
      try {
        setLoadingZones(true);
        const payload = await getSoilZones();
        const list = payload?.soil_zones || [];
        setZones(list);
        if (list.length > 0) {
          const existing = list.find((z: any) => z.sub_county === subCounty);
          const selected = existing || list[0];
          setSubCounty(selected.sub_county);
          setSoilType(selected.soil_type);
        }
      } catch {
        // Keep current values on failure.
      } finally {
        setLoadingZones(false);
      }
    };
    loadZones();
  }, []);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const dm = await AsyncStorage.getItem('smartcrop_dark_mode');
        const tips = await AsyncStorage.getItem('smartcrop_tips');
        const alerts = await AsyncStorage.getItem('smartcrop_weather_alerts');
        if (dm !== null) setDarkMode(dm === 'true');
        if (tips !== null) setTipsEnabled(tips === 'true');
        if (alerts !== null) setWeatherAlerts(alerts === 'true');
      } catch {
        // Ignore preference load errors.
      } finally {
        setPrefsLoaded(true);
      }
    };
    loadPrefs();
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    const syncNotifications = async () => {
      try {
        if (tipsEnabled) await scheduleTips(false);
        if (weatherAlerts) await scheduleWeatherAlerts(false);
      } catch {
        // Ignore background notification refresh failures.
      }
    };
    void syncNotifications();
  }, [prefsLoaded, savedRegion, savedSubCounty]);

  const handleSelectSubCounty = (value: string) => {
    setSubCounty(value);
    const mapped = zones.find((z) => z.sub_county === value);
    if (mapped) setSoilType(mapped.soil_type);
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission required to access photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.base64) setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
    setPhotoUri(asset.uri);
  };

  const handleSave = async () => {
    try {
      setError('');
      setSaving(true);
      await updateUserData({
        name: name.trim() || 'Farmer',
        subCounty,
        soilType,
        region: region.trim() || 'Luwero',
        photoBase64: photoBase64 || null,
        photoUri: photoUri || null,
      });
      setEditMode(false);
      toast.show({ message: 'Profile saved successfully.', tone: 'success' });
    } catch (e: any) {
      const msg = e?.message || 'Could not save profile';
      setError(msg);
      toast.show({ message: msg, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const savePref = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch {
      // Ignore preference save errors.
    }
  };

  const ensureAndroidTipsChannel = async () => {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('farming-tips', {
      name: 'Farming tips',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#4A9C5A',
    });
  };

  const buildTipsNotificationContent = async () => {
    const seasonValue = getCurrentSeason();
    const fallback = {
      title: `SmartCrop ${seasonValue} season tip`,
      body: `Plan field work in ${savedSubCounty} around soil moisture, timely planting, and regular crop scouting this week.`,
    };
    try {
      const prediction = await predictBySubCounty({
        sub_county: savedSubCounty,
        season: seasonValue,
      });
      const topCrop = prediction?.recommendations?.[0]?.crop;
      const weatherExpectation = String(prediction?.season_advice?.weather_expectation || '').trim();
      const focus = String(prediction?.season_advice?.focus || '').trim();
      if (!topCrop && !weatherExpectation && !focus) return fallback;
      const seasonLower = seasonValue.toLowerCase();
      const focusLine = weatherExpectation || focus;
      return {
        title: `SmartCrop ${seasonValue} season tip`,
        body: topCrop
          ? `${savedSubCounty}: prioritize ${topCrop} this ${seasonLower} season. ${focusLine || 'Check soil moisture before planting.'}`
          : `${savedSubCounty}: ${focusLine || fallback.body}`,
      };
    } catch {
      return fallback;
    }
  };

  const scheduleTips = async (requestPermission = true) => {
    await ensureAndroidTipsChannel();
    const ok = await ensureNotificationPermission(requestPermission);
    if (!ok) return false;
    const existing = await AsyncStorage.getItem('smartcrop_tips_notif_id');
    if (existing) {
      await Notifications.cancelScheduledNotificationAsync(existing);
    }
    const content = await buildTipsNotificationContent();
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger:
        Platform.OS === 'android'
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: 8,
              minute: 0,
              channelId: 'farming-tips',
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: 1,
              hour: 8,
              minute: 0,
            },
    });
    await AsyncStorage.setItem('smartcrop_tips_notif_id', id);
    return true;
  };

  const cancelTips = async () => {
    const existing = await AsyncStorage.getItem('smartcrop_tips_notif_id');
    if (existing) {
      await Notifications.cancelScheduledNotificationAsync(existing);
      await AsyncStorage.removeItem('smartcrop_tips_notif_id');
    }
  };

  const scheduleWeatherAlerts = async (requestPermission = true) => {
    return scheduleWeatherAlertNotification({
      subCounty: savedSubCounty,
      region: savedRegion,
      requestPermission,
    });
  };

  const cancelWeatherAlerts = async () => {
    await cancelWeatherAlertNotification();
  };

  const handleTipsToggle = async (v: boolean) => {
    try {
      if (v) {
        const ok = await scheduleTips();
        if (!ok) {
          toast.show({ message: 'Enable notifications to receive farming tips.', tone: 'warning' });
          setTipsEnabled(false);
          await savePref('smartcrop_tips', false);
          return;
        }
        setTipsEnabled(true);
        await savePref('smartcrop_tips', true);
      } else {
        await cancelTips();
        setTipsEnabled(false);
        await savePref('smartcrop_tips', false);
      }
    } catch {
      toast.show({ message: 'Could not update farming tips notification.', tone: 'error' });
    }
  };

  const handleWeatherAlertsToggle = async (v: boolean) => {
    try {
      if (v) {
        const ok = await scheduleWeatherAlerts();
        if (!ok) {
          toast.show({ message: 'Enable notifications to receive weather alerts.', tone: 'warning' });
          setWeatherAlerts(false);
          await savePref('smartcrop_weather_alerts', false);
          return;
        }
        setWeatherAlerts(true);
        await savePref('smartcrop_weather_alerts', true);
      } else {
        await cancelWeatherAlerts();
        setWeatherAlerts(false);
        await savePref('smartcrop_weather_alerts', false);
      }
    } catch {
      toast.show({ message: 'Could not update weather alerts notification.', tone: 'error' });
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerIn,
              transform: [
                { translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.avatar}
            onPress={editMode ? handlePickImage : undefined}
            accessibilityRole="button"
            accessibilityLabel={editMode ? 'Change profile photo' : 'Profile photo'}
            disabled={!editMode}
          >
            {photoBase64 || photoUri ? (
              <Image source={{ uri: photoBase64 || photoUri || undefined }} style={styles.avatarImage} />
            ) : (
              <MaterialCommunityIcons name="account-circle" size={72} color={colors.primary} />
            )}
            {editMode && (
              <View style={styles.avatarBadge}>
                <MaterialCommunityIcons name="camera" size={14} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email || 'user@smartcrop.app'}</Text>
          {editMode && <Text style={styles.tapHint}>Tap the photo to change</Text>}
          <View style={styles.profileMetaRow}>
            <Chip label={subCounty} icon="map-marker-outline" tone="success" size="sm" />
            <Chip label={soilType} icon="layers-outline" tone="neutral" size="sm" />
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: cardIn,
            transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <Card variant="glass" padding="lg" emphasis="md" style={styles.card}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionBadge}>
                <MaterialCommunityIcons name="account-edit-outline" size={13} color={colors.primary} />
                <Text style={styles.sectionBadgeText}>Identity</Text>
              </View>
              <Text style={styles.sectionTitle}>Farm profile</Text>
            </View>

            {editMode ? (
              <>
                <TextField
                  label="Name"
                  placeholder="Full name"
                  value={name}
                  onChangeText={setName}
                  leftIcon={<MaterialCommunityIcons name="account-outline" size={18} color={colors.lightText} />}
                  accessibilityLabel="Name"
                />
                <Text style={styles.fieldLabel}>Sub-county</Text>
                {loadingZones ? (
                  <Skeleton height={48} borderRadius={RADIUS.md} style={styles.skel} />
                ) : (
                  <TouchableOpacity
                    style={styles.selectField}
                    onPress={() => setSubCountyOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select sub-county"
                  >
                    <View style={styles.selectLeft}>
                      <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.lightText} />
                      <Text style={styles.selectValue}>{subCounty || 'Select sub-county'}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={colors.lightText} />
                  </TouchableOpacity>
                )}
                <View style={styles.soilCard}>
                  <View style={styles.soilIcon}>
                    <MaterialCommunityIcons name="terrain" size={16} color={colors.secondary} />
                  </View>
                  <View style={styles.soilTextWrap}>
                    <Text style={styles.soilLabel}>Mapped soil type</Text>
                    <Text style={styles.soilValue}>{soilType || 'Auto-mapped from sub-county'}</Text>
                  </View>
                </View>
                <TextField
                  label="Region"
                  placeholder="Region"
                  value={region}
                  onChangeText={setRegion}
                  leftIcon={<MaterialCommunityIcons name="earth" size={18} color={colors.lightText} />}
                  accessibilityLabel="Region"
                />
              </>
            ) : (
              <View style={styles.readGroup}>
                <ReadRow icon="account-outline" label="Name" value={displayName} colors={colors} />
                <ReadRow icon="map-marker-outline" label="Sub-county" value={subCounty} colors={colors} />
                <ReadRow icon="terrain" label="Soil type" value={soilType} colors={colors} hint="Mapped from sub-county" />
                <ReadRow icon="earth" label="Region" value={region} colors={colors} />
              </View>
            )}
          </Card>
        </Animated.View>

        <Animated.View
          style={{
            opacity: cardIn,
            transform: [{ translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
          }}
        >
          <Card variant="glass" padding="lg" emphasis="md" style={styles.card}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionBadge}>
                <MaterialCommunityIcons name="cog-outline" size={13} color={colors.primary} />
                <Text style={styles.sectionBadgeText}>Preferences</Text>
              </View>
              <Text style={styles.sectionTitle}>Settings</Text>
              <Text style={styles.sectionCaption}>Personalize how SmartCrop works for you.</Text>
            </View>

            <SettingRow
              colors={colors}
              icon="weather-night"
              title="Dark mode"
              description="Reduce eye strain in low light."
              value={isDark}
              onValueChange={setDarkMode}
            />
            <SettingRow
              colors={colors}
              icon="lightbulb-on-outline"
              title="Farming tips"
              description="Get weekly guidance and best practices."
              value={tipsEnabled}
              onValueChange={handleTipsToggle}
            />
            <SettingRow
              colors={colors}
              icon="weather-cloudy-alert"
              title="Weather alerts"
              description="Be notified about heavy rain or dry spells."
              value={weatherAlerts}
              onValueChange={handleWeatherAlertsToggle}
              isLast
            />
          </Card>
        </Animated.View>

        {!!error && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          {editMode ? (
            <>
              <Button
                label="Cancel"
                variant="tertiary"
                onPress={() => setEditMode(false)}
                disabled={saving}
                fullWidth
                style={styles.actionBtn}
                accessibilityLabel="Cancel editing"
              />
              <Button
                label="Save"
                onPress={handleSave}
                loading={saving}
                fullWidth
                style={styles.actionBtn}
                accessibilityLabel="Save profile"
              />
            </>
          ) : (
            <Button
              label="Edit profile"
              variant="secondary"
              onPress={() => setEditMode(true)}
              fullWidth
              leftIcon={<MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />}
              accessibilityLabel="Edit profile"
            />
          )}
        </View>

        <Button
          label="Sign out"
          variant="ghost"
          onPress={logout}
          fullWidth
          leftIcon={<MaterialCommunityIcons name="logout" size={18} color={colors.error} />}
          labelStyle={{ color: colors.error }}
          style={styles.logoutBtn}
          accessibilityLabel="Sign out"
        />
      </ScrollView>

      <SelectSheet
        visible={subCountyOpen}
        onClose={() => setSubCountyOpen(false)}
        title="Select sub-county"
        subtitle="Soil type updates automatically when you choose."
        options={subCountyOptions}
        value={subCounty}
        onSelect={(value) => {
          handleSelectSubCounty(value);
          setSubCountyOpen(false);
        }}
      />
    </SafeAreaView>
  );
};

type ReadRowProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  colors: ThemeColors;
};

const ReadRow = ({ icon, label, value, hint, colors }: ReadRowProps) => {
  const styles = useMemo(() => readRowStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.secondary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || '—'}</Text>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    </View>
  );
};

const readRowStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm + 2,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    body: { flex: 1 },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontWeight: WEIGHT.semibold,
    },
    value: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      fontWeight: WEIGHT.semibold,
    },
    hint: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
    },
  });

type SettingRowProps = {
  colors: ThemeColors;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
};

const SettingRow = ({ colors, icon, title, description, value, onValueChange, isLast }: SettingRowProps) => {
  const styles = useMemo(() => settingRowStyles(colors, !!isLast), [colors, isLast]);
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.secondary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.pillBorder }}
        thumbColor={value ? colors.primary : colors.glassSoft}
        ios_backgroundColor={colors.border}
        accessibilityLabel={title}
      />
    </View>
  );
};

const settingRowStyles = (c: ThemeColors, isLast: boolean) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md - 2,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: c.border,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    body: { flex: 1, paddingRight: SPACING.sm },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.semibold,
      color: c.text,
    },
    description: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      lineHeight: 16,
    },
  });

const createStyles = (c: ThemeColors, _isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    header: {
      alignItems: 'center',
      backgroundColor: c.glass,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: SPACING.lg + 2,
      marginBottom: SPACING.lg,
      ...elevation(c.shadow, 'md'),
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: c.iconBg,
      borderWidth: 2,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm + 2,
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.glass,
    },
    name: { fontFamily: FONT_FAMILY, fontSize: TYPE.h2, fontWeight: WEIGHT.bold, color: c.primary },
    email: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, color: c.lightText, marginTop: 4 },
    tapHint: { fontFamily: FONT_FAMILY, fontSize: TYPE.tiny, color: c.lightText, marginTop: 6 },
    profileMetaRow: {
      marginTop: SPACING.md,
      flexDirection: 'row',
      gap: SPACING.sm,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    card: { marginBottom: SPACING.md + 2 },
    sectionHead: { marginBottom: SPACING.md },
    sectionBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg,
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginBottom: SPACING.sm,
      gap: 4,
    },
    sectionBadgeText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.primary,
      fontWeight: WEIGHT.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    sectionTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.bold,
      color: c.secondary,
    },
    sectionCaption: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
    },
    readGroup: {},
    fieldLabel: {
      marginBottom: 6,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      color: c.lightText,
      letterSpacing: 0.2,
    },
    skel: { marginBottom: SPACING.md },
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
    actionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    actionBtn: { flex: 1 },
    logoutBtn: { marginTop: 2 },
    bgAccent: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.iconBg,
      right: -80,
      top: -60,
      opacity: 0.5,
    },
  });

export default ProfileScreen;
