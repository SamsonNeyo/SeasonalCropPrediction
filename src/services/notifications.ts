import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildWeatherAlertContent, fetchWeatherContext, type WeatherContext } from './weather';

const WEATHER_ALERT_NOTIFICATION_KEY = 'smartcrop_weather_notif_id';
export const WEATHER_ALERT_PREF_KEY = 'smartcrop_weather_alerts';
const WEATHER_ALERT_CHANNEL_ID = 'weather-alerts';

const ensureWeatherAlertChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(WEATHER_ALERT_CHANNEL_ID, {
    name: 'Weather alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2E6FD8',
  });
};

export const ensureNotificationPermission = async (requestIfNeeded = true): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!requestIfNeeded) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
};

export const scheduleWeatherAlertNotification = async (options: {
  subCounty?: string;
  region?: string;
  weather?: WeatherContext | null;
  requestPermission?: boolean;
} = {}) => {
  await ensureWeatherAlertChannel();

  const permissionGranted = await ensureNotificationPermission(options.requestPermission ?? true);
  if (!permissionGranted) return false;

  const existing = await AsyncStorage.getItem(WEATHER_ALERT_NOTIFICATION_KEY);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
  }

  const weather = options.weather === undefined ? await fetchWeatherContext() : options.weather;
  const content = buildWeatherAlertContent(weather ?? null, {
    subCounty: options.subCounty,
    region: options.region,
  });

  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger:
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 6,
            minute: 30,
            channelId: WEATHER_ALERT_CHANNEL_ID,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 6,
            minute: 30,
          },
  });

  await AsyncStorage.setItem(WEATHER_ALERT_NOTIFICATION_KEY, id);
  return true;
};

export const cancelWeatherAlertNotification = async () => {
  const existing = await AsyncStorage.getItem(WEATHER_ALERT_NOTIFICATION_KEY);
  if (!existing) return;
  await Notifications.cancelScheduledNotificationAsync(existing);
  await AsyncStorage.removeItem(WEATHER_ALERT_NOTIFICATION_KEY);
};

export const refreshWeatherAlertIfEnabled = async (options: {
  subCounty?: string;
  region?: string;
  weather?: WeatherContext | null;
} = {}) => {
  const enabled = await AsyncStorage.getItem(WEATHER_ALERT_PREF_KEY);
  if (enabled !== 'true') return false;
  return scheduleWeatherAlertNotification({
    ...options,
    requestPermission: false,
  });
};
