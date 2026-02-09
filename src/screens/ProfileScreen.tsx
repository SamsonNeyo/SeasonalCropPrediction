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
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { user, userData, logout, updateUserData } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(userData?.name || user?.email?.split('@')[0] || 'Farmer');
  const [soilType, setSoilType] = useState<'Loam' | 'Clay' | 'Sandy'>(userData?.soilType || 'Loam');
  const [region, setRegion] = useState(userData?.region || 'Luwero');
  const [photoBase64, setPhotoBase64] = useState<string | null>(userData?.photoBase64 || null);
  const [photoUri, setPhotoUri] = useState<string | null>(userData?.photoUri || null);
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
            <MaterialCommunityIcons name="account-circle" size={64} color={COLORS.primary} />
          )}
          {editMode && (
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="camera" size={14} color={COLORS.white} />
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
            placeholderTextColor={COLORS.lightText}
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
            placeholderTextColor={COLORS.lightText}
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
            <MaterialCommunityIcons name="calendar-check-outline" size={18} color={COLORS.secondary} />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.rowText}>Season focus</Text>
            <Text style={styles.mutedSmall}>Use First/Second season recommendations on Home.</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.secondary} />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.rowText}>Preferred region</Text>
            <Text style={styles.mutedSmall}>{region || 'Luwero'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MaterialCommunityIcons name="sprout" size={18} color={COLORS.secondary} />
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.rowText}>Soil profile</Text>
            <Text style={styles.mutedSmall}>{soilType} soil selected</Text>
          </View>
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
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <MaterialCommunityIcons name="logout" size={18} color={COLORS.white} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 24 },
  header: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EAF4EA',
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  email: { fontSize: 13, color: COLORS.lightText, marginTop: 4 },
  tapHint: { fontSize: 11, color: COLORS.lightText, marginTop: 6 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.secondary, marginBottom: 10 },
  sectionCaption: { fontSize: 12, color: COLORS.lightText, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rowText: { marginLeft: 8, color: COLORS.text, fontSize: 14 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FBF7',
    borderWidth: 1,
    borderColor: '#E6EEE2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoBody: { flex: 1 },
  mutedSmall: { fontSize: 12, color: COLORS.lightText },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: COLORS.lightText, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fafafa',
    color: COLORS.text,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: COLORS.lightText,
  },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    backgroundColor: '#fafafa',
  },
  toggleActive: { backgroundColor: '#EAF4EA', borderColor: COLORS.primary },
  toggleDisabled: { opacity: 0.6 },
  toggleText: { color: COLORS.text, fontSize: 13 },
  toggleTextActive: { color: COLORS.primary, fontWeight: '600' },
  error: { color: COLORS.error, textAlign: 'center', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonActive: { backgroundColor: '#EAF4EA' },
  secondaryText: { color: COLORS.primary, fontWeight: '600' },
  secondaryTextActive: { color: COLORS.primary },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: COLORS.white, fontWeight: '600' },
  logoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  logoutText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  bgAccent: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E7F2E7',
    right: -80,
    top: -60,
    opacity: 0.6,
  },
});

export default ProfileScreen;
