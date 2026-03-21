import { Platform } from 'react-native';

export const FONT_FAMILY = Platform.select({
  web: 'Aptos, "Segoe UI", "Helvetica Neue", sans-serif',
  default: 'System',
}) as string;

const isWeb = Platform.OS === 'web';

export const TYPE = {
  display: isWeb ? 40 : 34,
  title: isWeb ? 32 : 28,
  h2: isWeb ? 27 : 24,
  h3: isWeb ? 22 : 20,
  body: 16,
  bodySmall: isWeb ? 15 : 14,
  caption: 12,
  tiny: isWeb ? 11 : 10,
} as const;

export const WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;
