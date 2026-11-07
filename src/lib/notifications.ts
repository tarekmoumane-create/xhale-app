import * as Notifications from 'expo-notifications';

/**
 * Xhale sends no notifications. Earlier versions scheduled three weeks of them on the phone, and
 * those stay queued through an update, so this clears them. It never asks for permission.
 */
export async function clearNotifications() {
  await Promise.all([Notifications.cancelAllScheduledNotificationsAsync(), Notifications.dismissAllNotificationsAsync()]);
}
