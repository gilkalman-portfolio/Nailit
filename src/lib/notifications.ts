import * as Notifications from 'expo-notifications';

export const requestNotificationPermissions = async () => {
  const settings = await Notifications.requestPermissionsAsync();
  return settings.granted;
};

export const sendImmediateNotification = async (body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'תזכורת מלאי',
      body,
    },
    trigger: null,
  });
};
