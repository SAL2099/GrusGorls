import Constants from "expo-constants";

// expo-notifications throws just from being imported in Expo Go (SDK 53+),
// so it's conditionally required here instead of statically imported, and
// only when not running in Expo Go — this file works unchanged in a real
// dev build.
const isExpoGo = Constants.appOwnership === 'expo';
const Notifications = isExpoGo ? null : require('expo-notifications');

// Function to check and request notification permissions from the user
export async function ensureNotificationPermission() {
  if (isExpoGo) return false;

  const { status } = await Notifications.getPermissionsAsync();

  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }

  return true;
}