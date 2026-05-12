import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_CACHE_TTL_MS = 1000 * 60 * 10;
const WEATHER_CACHE_KEY = 'smartcrop_weather_cache_luwero';
const LUWERO_COORDS = {
  latitude: 0.8333,
  longitude: 32.5,
};

export type WeatherContext = {
  temperature: number | null;
  condition: string;
  description: string;
  location: string;
};

type WeatherInsight = {
  summary: string;
  action: string;
};

const toTemperature = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

const toTitleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const readWeatherCache = async (maxAgeMs = WEATHER_CACHE_TTL_MS): Promise<WeatherContext | null> => {
  try {
    const raw = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.ts || Date.now() - cached.ts > maxAgeMs) return null;
    return cached.data || null;
  } catch {
    return null;
  }
};

const saveWeatherCache = async (weather: WeatherContext) => {
  try {
    await AsyncStorage.setItem(
      WEATHER_CACHE_KEY,
      JSON.stringify({
        ts: Date.now(),
        data: weather,
      })
    );
  } catch {
    // Ignore cache write failures.
  }
};

export const formatWeatherCondition = (weather: Pick<WeatherContext, 'condition' | 'description'> | null | undefined) => {
  const raw = String(weather?.description || weather?.condition || 'field conditions').trim().toLowerCase();
  if (!raw) return 'Field conditions';
  return toTitleCase(raw);
};

export const getWeatherInsight = (weather: WeatherContext | null): WeatherInsight => {
  const description = String(weather?.description || weather?.condition || '').toLowerCase();
  const temperature = weather?.temperature;

  if (description.includes('storm') || description.includes('thunder') || description.includes('heavy')) {
    return {
      summary: 'Heavy rain risk is elevated',
      action: 'Check drainage, protect seedlings, and delay spraying until conditions settle.',
    };
  }

  if (description.includes('rain') || description.includes('drizzle')) {
    return {
      summary: 'Useful moisture is likely today',
      action: 'Take advantage of softer soils, but scout for fungal pressure after the showers.',
    };
  }

  if (temperature != null && temperature >= 31) {
    return {
      summary: 'Heat stress risk is building',
      action: 'Inspect soil moisture early, mulch where possible, and avoid transplanting in peak afternoon heat.',
    };
  }

  if (temperature != null && temperature <= 18) {
    return {
      summary: 'Cool conditions may slow crop growth',
      action: 'Watch germination and avoid overwatering fields that are already holding moisture.',
    };
  }

  if (description.includes('cloud') || description.includes('mist') || description.includes('fog')) {
    return {
      summary: 'Milder field conditions are expected',
      action: 'Use the cooler window for transplanting, scouting, and checking for leaf disease.',
    };
  }

  return {
    summary: 'Field conditions look fairly stable',
    action: 'Use the day for weeding, scouting, and preparing inputs for the next planting step.',
  };
};

export const fetchWeatherContext = async (forceRefresh = false): Promise<WeatherContext | null> => {
  const apiKey = process.env.EXPO_PUBLIC_OWM_API_KEY;
  if (!apiKey) {
    return (await readWeatherCache(Number.POSITIVE_INFINITY)) || null;
  }

  if (!forceRefresh) {
    const cached = await readWeatherCache();
    if (cached) return cached;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${LUWERO_COORDS.latitude}&lon=${LUWERO_COORDS.longitude}&units=metric&appid=${apiKey}`
    );
    const data = await response.json();
    if (!response.ok) {
      return (await readWeatherCache(Number.POSITIVE_INFINITY)) || null;
    }

    const payload: WeatherContext = {
      temperature: toTemperature(data?.main?.temp),
      condition: String(data?.weather?.[0]?.main || '').trim(),
      description: String(data?.weather?.[0]?.description || '').trim().toLowerCase(),
      location: String(data?.name || 'Luwero').trim(),
    };
    await saveWeatherCache(payload);
    return payload;
  } catch {
    return (await readWeatherCache(Number.POSITIVE_INFINITY)) || null;
  }
};

export const buildWeatherAlertContent = (
  weather: WeatherContext | null,
  options: { subCounty?: string; region?: string } = {}
) => {
  const farmLocation = options.subCounty || weather?.location || options.region || 'your farm';

  if (!weather) {
    return {
      title: 'SmartCrop weather alert',
      body: `Check today's conditions in ${farmLocation} before field work so you can plan for rainfall or dry spell changes.`,
    };
  }

  const condition = formatWeatherCondition(weather);
  const temperature = weather.temperature != null ? `${weather.temperature}C` : null;
  const insight = getWeatherInsight(weather);
  const currentSummary = temperature ? `${condition}, ${temperature}` : condition;

  return {
    title: `SmartCrop weather: ${condition}`,
    body: `${farmLocation}: ${currentSummary}. ${insight.summary}. ${insight.action}`,
  };
};
