import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    '';
  return hostUri.split(':')[0];
};

export const API_BASE = (() => {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (envBase) return envBase;

  const host = getDevHost();

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
  timeout: 20000,
});

export const predictCrops = async (data: {
  season: string;
  soil_type: string;
  temperature: number;
  rainfall: number;
}) => {
  const res = await api.post('/predict', data);
  return res.data;
};

export const searchCrop = async (
  data: { season: string; soil_type: string; temperature: number; rainfall: number },
  crop: string
) => {
  const res = await api.post(`/predict/search?crop=${encodeURIComponent(crop)}`, data);
  return res.data;
};
