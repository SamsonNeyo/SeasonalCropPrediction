import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildWeatherAlertContent, fetchWeatherContext, type WeatherContext } from './weather';

// ── Storage keys ─────────────────────────────────────────────────────────────
const WEATHER_ALERT_NOTIFICATION_KEY = 'smartcrop_weather_notif_id';
const TIPS_NOTIF_KEY                 = 'smartcrop_tips_notif_id';
const SEASON_NOTIF_FIRST_KEY         = 'smartcrop_season_notif_first';
const SEASON_NOTIF_SECOND_KEY        = 'smartcrop_season_notif_second';

export const WEATHER_ALERT_PREF_KEY  = 'smartcrop_weather_alerts';
export const TIPS_PREF_KEY           = 'smartcrop_tips';
export const SEASON_REMINDER_PREF_KEY = 'smartcrop_season_reminders';

// ── Channel IDs ───────────────────────────────────────────────────────────────
const WEATHER_CHANNEL_ID = 'weather-alerts';
const TIPS_CHANNEL_ID    = 'farming-tips';
const SEASON_CHANNEL_ID  = 'season-reminders';

// ── Channel setup ─────────────────────────────────────────────────────────────
const ensureWeatherAlertChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(WEATHER_CHANNEL_ID, {
    name: 'Weather alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2E6FD8',
  });
};

const ensureTipsChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(TIPS_CHANNEL_ID, {
    name: 'Farming tips',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 200, 200],
    lightColor: '#4A9C5A',
  });
};

const ensureSeasonChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(SEASON_CHANNEL_ID, {
    name: 'Season reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 300, 300],
    lightColor: '#1B5E3C',
  });
};

// ── Permission ────────────────────────────────────────────────────────────────
export const ensureNotificationPermission = async (requestIfNeeded = true): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!requestIfNeeded) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const cancelById = async (storageKey: string) => {
  const id = await AsyncStorage.getItem(storageKey);
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  await AsyncStorage.removeItem(storageKey);
};

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 6) return 'First';
  if (month >= 8 && month <= 12) return 'Second';
  return 'First';
};

// ── Weather alert ─────────────────────────────────────────────────────────────
export const scheduleWeatherAlertNotification = async (options: {
  subCounty?: string;
  region?: string;
  weather?: WeatherContext | null;
  requestPermission?: boolean;
} = {}) => {
  if (Platform.OS === 'web') return false;
  await ensureWeatherAlertChannel();
  const ok = await ensureNotificationPermission(options.requestPermission ?? true);
  if (!ok) return false;

  await cancelById(WEATHER_ALERT_NOTIFICATION_KEY);

  const weather = options.weather === undefined ? await fetchWeatherContext() : options.weather;
  const content = buildWeatherAlertContent(weather ?? null, {
    subCounty: options.subCounty,
    region: options.region,
  });

  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger: Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 6, minute: 30, channelId: WEATHER_CHANNEL_ID }
      : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 6, minute: 30 },
  });
  await AsyncStorage.setItem(WEATHER_ALERT_NOTIFICATION_KEY, id);
  return true;
};

export const cancelWeatherAlertNotification = async () => {
  await cancelById(WEATHER_ALERT_NOTIFICATION_KEY);
};

export const refreshWeatherAlertIfEnabled = async (options: {
  subCounty?: string;
  region?: string;
  weather?: WeatherContext | null;
} = {}) => {
  const enabled = await AsyncStorage.getItem(WEATHER_ALERT_PREF_KEY);
  if (enabled !== 'true') return false;
  return scheduleWeatherAlertNotification({ ...options, requestPermission: false });
};

// ── Farming tips ──────────────────────────────────────────────────────────────
const buildTipsContent = async (subCounty?: string, region?: string) => {
  const season = getCurrentSeason();
  const location = subCounty || region || 'your area';
  const fallback = {
    title: `SmartCrop ${season} season tip`,
    body: `Plan field work in ${location} around soil moisture, timely planting, and regular crop scouting this week.`,
  };
  if (!subCounty) return fallback;
  try {
    const { predictBySubCounty } = await import('./api');
    const prediction = await predictBySubCounty({ sub_county: subCounty, season });
    const topCrop = prediction?.recommendations?.[0]?.crop;
    const focus = String(prediction?.season_advice?.focus || '').trim();
    const weatherExpect = String(prediction?.season_advice?.weather_expectation || '').trim();
    if (!topCrop && !focus && !weatherExpect) return fallback;
    const focusLine = weatherExpect || focus;
    return {
      title: `SmartCrop ${season} season tip`,
      body: topCrop
        ? `${location}: prioritize ${topCrop} this ${season.toLowerCase()} season. ${focusLine || 'Check soil moisture before planting.'}`
        : `${location}: ${focusLine || fallback.body}`,
    };
  } catch {
    return fallback;
  }
};

export const scheduleTipsNotification = async (options: {
  subCounty?: string;
  region?: string;
  requestPermission?: boolean;
} = {}) => {
  if (Platform.OS === 'web') return false;
  await ensureTipsChannel();
  const ok = await ensureNotificationPermission(options.requestPermission ?? true);
  if (!ok) return false;

  await cancelById(TIPS_NOTIF_KEY);

  const content = await buildTipsContent(options.subCounty, options.region);
  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger: Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0, channelId: TIPS_CHANNEL_ID }
      : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 8, minute: 0 },
  });
  await AsyncStorage.setItem(TIPS_NOTIF_KEY, id);
  return true;
};

export const cancelTipsNotification = async () => {
  await cancelById(TIPS_NOTIF_KEY);
};

// ── Season reminders ──────────────────────────────────────────────────────────
export const scheduleSeasonReminders = async (options: {
  subCounty?: string;
  requestPermission?: boolean;
} = {}) => {
  if (Platform.OS === 'web') return false;
  await ensureSeasonChannel();
  const ok = await ensureNotificationPermission(options.requestPermission ?? true);
  if (!ok) return false;

  await cancelById(SEASON_NOTIF_FIRST_KEY);
  await cancelById(SEASON_NOTIF_SECOND_KEY);

  const location = options.subCounty || 'your farm';
  const channelProp = Platform.OS === 'android' ? { channelId: SEASON_CHANNEL_ID } : {};

  const firstId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'First Season is starting!',
      body: `Time to plan your crops in ${location}. Open SmartCrop for personalised recommendations.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      month: 3, day: 1, hour: 7, minute: 0, repeats: true,
      ...channelProp,
    } as any,
  });
  await AsyncStorage.setItem(SEASON_NOTIF_FIRST_KEY, firstId);

  const secondId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Second Season is starting!',
      body: `Prepare your farm in ${location} for the second season. Open SmartCrop to get started.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      month: 8, day: 1, hour: 7, minute: 0, repeats: true,
      ...channelProp,
    } as any,
  });
  await AsyncStorage.setItem(SEASON_NOTIF_SECOND_KEY, secondId);
  return true;
};

export const cancelSeasonReminders = async () => {
  await cancelById(SEASON_NOTIF_FIRST_KEY);
  await cancelById(SEASON_NOTIF_SECOND_KEY);
};

// ── First-run setup ───────────────────────────────────────────────────────────
// Called once after a user completes profile setup. Requests permission and
// schedules all three notification types with a single permission prompt.
export const setupInitialNotifications = async (options: {
  subCounty?: string;
  region?: string;
} = {}) => {
  if (Platform.OS === 'web') return;
  try {
    const ok = await ensureNotificationPermission(true);
    if (!ok) return;
    await Promise.all([
      scheduleTipsNotification({ ...options, requestPermission: false }),
      scheduleWeatherAlertNotification({ ...options, requestPermission: false }),
      scheduleSeasonReminders({ subCounty: options.subCounty, requestPermission: false }),
    ]);
    await AsyncStorage.multiSet([
      [TIPS_PREF_KEY, 'true'],
      [WEATHER_ALERT_PREF_KEY, 'true'],
      [SEASON_REMINDER_PREF_KEY, 'true'],
    ]);
  } catch {
    // Notifications are optional — silently ignore failures
  }
};
