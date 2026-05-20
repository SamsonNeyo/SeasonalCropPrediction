import axios from 'axios';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

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

const buildAutoDetectedBase = (): string => {
  const host = getDevHost();
  const webHost = getWebHost();

  if (Platform.OS === 'web') {
    return webHost ? `http://${webHost}:8000` : 'http://localhost:8000';
  }
  if (Platform.OS === 'android') {
    // Prefer LAN host for Expo Go on a real device; fall back to the emulator bridge.
    return host ? `http://${host}:8000` : 'http://10.0.2.2:8000';
  }
  if (Platform.OS === 'ios') {
    return host ? `http://${host}:8000` : 'http://localhost:8000';
  }
  return host ? `http://${host}:8000` : 'http://localhost:8000';
};

// Tunnel hosts (e.g. abcd-1234.tunnel.dev, exp.direct) expose Metro but NOT the
// backend. Detect them so we don't try to reach the API through the tunnel.
const isTunnelHost = (host: string): boolean => {
  if (!host) return false;
  return /\.exp\.direct$|\.tunnel\.expo\.dev$|\.tunnel\.dev$|ngrok/i.test(host);
};

const API_BASE = (() => {
  // In development, prefer the Expo dev host since the device already proved it
  // can reach that IP (it's serving the JS bundle). This avoids stale env IPs
  // after switching Wi-Fi networks.
  if (__DEV__) {
    const devHost = getDevHost();
    if (devHost && !isTunnelHost(devHost)) {
      const auto = buildAutoDetectedBase();
      if (auto && !auto.includes('localhost') && !auto.includes('10.0.2.2')) {
        return auto;
      }
    }
    // Tunnel mode or no detectable host — fall back to env override.
    const envBase = process.env.EXPO_PUBLIC_API_BASE;
    if (envBase) return envBase;
    return buildAutoDetectedBase();
  }

  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase) return envBase;
  return 'https://smartcrop-backend-e3nb.onrender.com';
})();

export const getApiBase = () => API_BASE;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 70000,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as any;
    // Retry once on network errors or timeout (cold-start wake-up window)
    if (
      axios.isAxiosError(error) &&
      !error.response &&
      !config.__retried
    ) {
      config.__retried = true;
      await new Promise((r) => setTimeout(r, 2000));
      return api(config);
    }
    if (axios.isAxiosError(error) && !error.response) {
      const friendly = new Error(
        `Could not reach the server at ${API_BASE}. Check that the backend is running and on the same network.`,
      );
      (friendly as any).code = 'NETWORK_UNREACHABLE';
      return Promise.reject(friendly);
    }
    return Promise.reject(error);
  },
);

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

const pingBackend = () => api.get('/ping').catch(() => {});

// Fire on module load — wakes Render free-tier before Firebase auth resolves.
pingBackend();

// Re-ping every time the app comes back to the foreground so a returning
// user doesn't hit a cold backend after the server has spun down.
AppState.addEventListener('change', (state) => {
  if (state === 'active') pingBackend();
});

export const warmupBackend = pingBackend;
