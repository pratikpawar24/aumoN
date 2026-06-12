import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Show notifications even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request permission + return this device's Expo push token (or null).
// Degrades gracefully on simulators / Expo Go without an EAS project.
export const registerForPush = async () => {
  try {
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#22c55e',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch (e) {
    console.warn('Push registration skipped:', e.message);
    return null;
  }
};

// Subscribe to taps on a notification. Returns a remover.
export const onNotificationTap = (handler) => {
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    handler?.(res.notification.request.content.data || {});
  });
  return () => sub.remove();
};
