import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * The property this app is branded for. Each residence gets its own copy of the app under its
 * own name, so this is the one place to change it.
 */
export const brand = { name: 'GreenView', subtitle: 'Residences' };

/**
 * Demo mode shows sample data and never calls the server; live mode talks to the PMS API.
 * Demo is the default so the review link keeps working with sample data.
 */
export const authMode: 'demo' | 'api' = process.env.EXPO_PUBLIC_AUTH_MODE === 'api' ? 'api' : 'demo';

/**
 * The API's address in live mode, ending in /api: EXPO_PUBLIC_API_URL when set, such as the
 * live site's. Otherwise, in development, the dev server's own /api, which metro.config.js
 * forwards to the API on the Mac; the phone reaches it at the address it loaded the app from.
 */
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' ? '/api' : Constants.expoConfig?.hostUri ? `http://${Constants.expoConfig.hostUri}/api` : '');
