import * as Notifications from 'expo-notifications';

// Function to check and request notification permissions from the user
export async function ensureNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();

  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }

  return true;
}