import { Platform, ViewStyle } from 'react-native';

export const elevation = (
  shadowColor: string,
  level: 'none' | 'sm' | 'md' | 'lg' | 'xl' = 'md',
): ViewStyle => {
  if (Platform.OS === 'web') {
    switch (level) {
      case 'none': return {};
      case 'sm':   return { boxShadow: '0 3px 8px rgba(0,0,0,0.06)' } as any;
      case 'lg':   return { boxShadow: '0 10px 18px rgba(0,0,0,0.14)' } as any;
      case 'xl':   return { boxShadow: '0 14px 26px rgba(0,0,0,0.18)' } as any;
      case 'md':
      default:     return { boxShadow: '0 6px 12px rgba(0,0,0,0.10)' } as any;
    }
  }

  switch (level) {
    case 'none': return {};
    case 'sm':
      return {
        shadowColor,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      };
    case 'lg':
      return {
        shadowColor,
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 4,
      };
    case 'xl':
      return {
        shadowColor,
        shadowOpacity: 0.18,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 14 },
        elevation: 6,
      };
    case 'md':
    default:
      return {
        shadowColor,
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      };
  }
};
