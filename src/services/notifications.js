import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { API_BASE } from '../constants/api';
import { getLanguage } from './userProfile';

// Show banner + play sound when a push arrives while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function resolveProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    undefined
  );
}

// Request permission, get the Expo push token, and register it with the server
// so admin automations can reach this device. Best-effort: silently no-ops if
// permission is denied or a push token can't be obtained (e.g. Expo Go on
// SDK 54, or a build without an EAS projectId).
export async function registerForPush() {
  try {
    if (Platform.OS === 'web') return null;

    // Android requires a channel for notifications to display.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') {
      console.log('[push] permission not granted');
      return null;
    }

    const projectId = resolveProjectId();
    let tokenResp;
    try {
      tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    } catch (e) {
      console.log('[push] could not get Expo token (needs a dev/prod build + EAS projectId):', e?.message || e);
      return null;
    }

    const token = tokenResp?.data;
    if (!token) return null;

    const language = await getLanguage().catch(() => 'tr');
    await fetch(`${API_BASE}/api/push/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, language, userId: 'default', platform: Platform.OS }),
    }).catch((e) => console.log('[push] register POST failed:', e?.message || e));

    console.log('[push] registered device token');
    return token;
  } catch (e) {
    console.log('[push] registerForPush error:', e?.message || e);
    return null;
  }
}
