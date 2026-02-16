import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/Topography';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { colors, isDark, setDarkMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, userData, logout, updateUserData } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(userData?.name || user?.email?.split('@')[0] || 'Farmer');
  const [soilType, setSoilType] = useState<'Loam' | 'Clay' | 'Sandy'>(userData?.soilType || 'Loam');
  const [region, setRegion] = useState(userData?.region || 'Luwero');
  const [photoBase64, setPhotoBase64] = useState<string | null>(userData?.photoBase64 || null);
  const [photoUri, setPhotoUri] = useState<string | null>(userData?.photoUri || null);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const headerIn = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;

  const displayName = useMemo(() => name || user?.email?.split('@')[0] || 'Farmer', [name, user?.email]);

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
      }
    };
    loadPrefs();
  }, []);


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
    if (asset.base64) {
      setPhotoBase64(`data:image/jpeg;base64,${asset.base64}`);
    }
    setPhotoUri(asset.uri);
  };

  const handleSave = async () => {
    try {
      setError('');
      setSaving(true);
      await updateUserData({
        name: name.trim() || 'Farmer',
        soilType,
        region: region.trim() || 'Luwero',
        photoBase64: photoBase64 || null,
        photoUri: photoUri || null,
      });
      setEditMode(false);
    } catch (e: any) {
      setError(e?.message || 'Could not save profile');
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

  const ensureNotifPermission = async (): Promise<boolean> => {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  };

  const scheduleTips = async () => {
    const ok = await ensureNotifPermission();
    if (!ok) return false;
    const existing = await AsyncStorage.getItem('smartcrop_tips_notif_id');
    if (existing) return true;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'SmartCrop tip',
        body: 'Weekly farm tip: check soil moisture before planting.',
      },
      trigger: { weekday: 1, hour: 8, minute: 0, repeats: true },
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


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerIn,
            transform: [
              {
                translateY: headerIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity style={styles.avatar} onPress={handlePickImage}>
          {photoBase64 || photoUri ? (
            <Image source={{ uri: photoBase64 || photoUri || undefined }} style={styles.avatarImage} />
          ) : (
            <MaterialCommunityIcons name="account-circle" size={64} color={colors.primary} />
          )}
          {editMode && (
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="camera" size={14} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{user?.email || 'user@smartcrop.app'}</Text>
        <Text style={styles.tapHint}>Tap the photo to change</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardIn,
            transform: [
              {
                translateY: cardIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Farm Profile</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={[styles.input, !editMode && styles.inputDisabled]}
            editable={editMode}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.lightText}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Soil Type</Text>
          <View style={styles.toggleRow}>
            {(['Loam', 'Clay', 'Sandy'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.toggle, soilType === s && styles.toggleActive, !editMode && styles.toggleDisabled]}
                onPress={() => editMode && setSoilType(s)}
                disabled={!editMode}
              >
                <Text style={[styles.toggleText, soilType === s && styles.toggleTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Region</Text>
          <TextInput
            style={[styles.input, !editMode && styles.inputDisabled]}
            editable={editMode}
            value={region}
            onChangeText={setRegion}
            placeholder="Region"
            placeholderTextColor={colors.lightText}
          />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardIn,
            transform: [
              {
                translateY: cardIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [22, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Farm Snapshot</Text>
        <Text style={styles.sectionCaption}>Quick profile highlights for your planning context.</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MaterialCommunityIcons name="calendar-check-outline" size={18} color={colors.secondary} />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.rowText}>Season focus</Text>
            <Text style={styles.mutedSmall}>Use First/Second season recommendations on Home.</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.secondary} />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.rowText}>Preferred region</Text>
            <Text style={styles.mutedSmall}>{region || 'Luwero'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MaterialCommunityIcons name="sprout" size={18} color={colors.secondary} />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.rowText}>Soil profile</Text>
            <Text style={styles.mutedSmall}>{soilType} soil selected</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardIn,
            transform: [
              {
                translateY: cardIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [22, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Settings</Text>
        <Text style={styles.sectionCaption}>Personalize how SmartCrop works for you.</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.rowText}>Dark mode</Text>
            <Text style={styles.mutedSmall}>Reduce eye strain in low light.</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(v) => {
              setDarkMode(v);
            }}
            trackColor={{ false: '#d9d9d9', true: '#A7D0A7' }}
            thumbColor={isDark ? colors.primary : '#f4f4f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.rowText}>Farming tips</Text>
            <Text style={styles.mutedSmall}>Get weekly guidance and best practices.</Text>
          </View>
          <Switch
            value={tipsEnabled}
            onValueChange={async (v) => {
              if (v) {
                const ok = await scheduleTips();
                setTipsEnabled(ok);
                savePref('smartcrop_tips', ok);
              } else {
                await cancelTips();
                setTipsEnabled(false);
                savePref('smartcrop_tips', false);
              }
            }}
            trackColor={{ false: '#d9d9d9', true: '#A7D0A7' }}
            thumbColor={tipsEnabled ? colors.primary : '#f4f4f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.rowText}>Weather alerts</Text>
            <Text style={styles.mutedSmall}>Be notified about heavy rain or dry spells.</Text>
          </View>
          <Switch
            value={weatherAlerts}
            onValueChange={async (v) => {
              if (v) {
                const ok = await ensureNotifPermission();
                setWeatherAlerts(ok);
                savePref('smartcrop_weather_alerts', ok);
              } else {
                setWeatherAlerts(false);
                savePref('smartcrop_weather_alerts', false);
              }
            }}
            trackColor={{ false: '#d9d9d9', true: '#A7D0A7' }}
            thumbColor={weatherAlerts ? colors.primary : '#f4f4f4'}
          />
        </View>
      </Animated.View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, editMode && styles.secondaryButtonActive]}
          onPress={() => setEditMode(!editMode)}
          disabled={saving}
        >
          <Text style={[styles.secondaryText, editMode && styles.secondaryTextActive]}>
            {editMode ? 'Cancel' : 'Edit Profile'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving || !editMode}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <MaterialCommunityIcons name="logout" size={18} color={colors.white} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 24 },
  header: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: FONT_FAMILY, fontSize: TYPE.h2, fontWeight: WEIGHT.bold, color: colors.primary },
  email: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, color: colors.lightText, marginTop: 4 },
  tapHint: { fontFamily: FONT_FAMILY, fontSize: TYPE.tiny, color: colors.lightText, marginTop: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: { fontFamily: FONT_FAMILY, fontSize: TYPE.body, fontWeight: WEIGHT.semibold, color: colors.secondary, marginBottom: 10 },
  sectionCaption: { fontFamily: FONT_FAMILY, fontSize: TYPE.caption, color: colors.lightText, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowText: { fontFamily: FONT_FAMILY, marginLeft: 8, color: colors.text, fontSize: TYPE.body },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoBody: { flex: 1 },
  mutedSmall: { fontFamily: FONT_FAMILY, fontSize: TYPE.caption, color: colors.lightText },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingText: { flex: 1, paddingRight: 12 },
  field: { marginBottom: 12 },
  fieldLabel: { fontFamily: FONT_FAMILY, fontSize: TYPE.caption, color: colors.lightText, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.body,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceAlt,
    color: colors.lightText,
  },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  toggleActive: { backgroundColor: colors.iconBg, borderColor: colors.primary },
  toggleDisabled: { opacity: 0.6 },
  toggleText: { fontFamily: FONT_FAMILY, color: colors.text, fontSize: TYPE.bodySmall },
  toggleTextActive: { color: colors.primary, fontWeight: WEIGHT.semibold },
  error: { fontFamily: FONT_FAMILY, color: colors.error, textAlign: 'center', marginBottom: 10, fontSize: TYPE.bodySmall },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonActive: { backgroundColor: colors.iconBg },
  secondaryText: { fontFamily: FONT_FAMILY, color: colors.primary, fontWeight: WEIGHT.semibold },
  secondaryTextActive: { color: colors.primary },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { fontFamily: FONT_FAMILY, color: colors.white, fontWeight: WEIGHT.semibold },
  logoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  logoutText: { fontFamily: FONT_FAMILY, color: colors.white, fontWeight: WEIGHT.semibold, fontSize: TYPE.body },
  bgAccent: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.iconBg,
    right: -80,
    top: -60,
    opacity: 0.6,
  },
});

export default ProfileScreen;
