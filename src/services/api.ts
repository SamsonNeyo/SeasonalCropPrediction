import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type CacheEntry = { ts: number; data: any };
const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 5;

const readCache = (key: string) => {
  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return entry.data;
};

const writeCache = (key: string, data: any) => {
  MEMORY_CACHE.set(key, { ts: Date.now(), data });
};

const getDevHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    '';
  return hostUri.split(':')[0];
};

const getWebHost = () => {
  if (typeof window === 'undefined') return '';
  return window.location?.hostname || '';
};

const API_BASE = (() => {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase) return envBase;

  const host = getDevHost();
  const webHost = getWebHost();

  if (Platform.OS === 'web') {
    return webHost ? `http://${webHost}:8000` : 'http://localhost:8000';
  }

  if (Platform.OS === 'android') {
    // Prefer LAN host for Expo Go on device, fallback to emulator bridge.
    return host ? `http://${host}:8000` : 'http://10.0.2.2:8000';
  }

  if (Platform.OS === 'ios') {
    return host ? `http://${host}:8000` : 'http://localhost:8000';
  }

  // Web or other platforms
  return host ? `http://${host}:8000` : 'http://localhost:8000';
})();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 40000,
});

export const getSoilZones = async () => {
  const cacheKey = 'soil-zones';
  const cached = readCache(cacheKey);
  if (cached) return cached;
  const res = await api.get('/soil-zones');
  writeCache(cacheKey, res.data);
  return res.data;
};

export const predictBySubCounty = async (data: { sub_county: string; season?: string | number }) => {
  const cacheKey = `predict-sub-county:${data.sub_county}:${data.season ?? ''}`;
  const cached = readCache(cacheKey);
  if (cached) return JSON.parse(JSON.stringify(cached));
  const res = await api.post('/predict/sub-county', data);
  writeCache(cacheKey, res.data);
  return res.data;
};
