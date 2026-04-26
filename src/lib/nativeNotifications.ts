/**
 * Native notification helper.
 * - On Android (via Capacitor): schedules real local notifications that work even when the app is closed.
 * - On the web: falls back to the browser Notification API.
 *
 * IMPORTANT: this module dynamic-imports Capacitor so the web build still works
 * without Capacitor being initialized.
 */

type ReminderConfig = {
  enabled: boolean;
  time: string; // "HH:MM"
  title: string;
  body: string;
};

const isNative = (): boolean => {
  // Capacitor exposes window.Capacitor when running inside a native shell
  return (
    typeof window !== "undefined" &&
    // @ts-expect-error - Capacitor global
    !!window.Capacitor?.isNativePlatform?.()
  );
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
};

const NOTIFICATION_ID = 1001;

export const scheduleDailyReminder = async (cfg: ReminderConfig) => {
  if (!isNative()) return; // web uses the in-app interval scheduler

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  if (!cfg.enabled) return;

  const [hh, mm] = cfg.time.split(":").map(Number);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: NOTIFICATION_ID,
        title: cfg.title,
        body: cfg.body,
        schedule: {
          on: { hour: hh, minute: mm },
          allowWhileIdle: true,
          repeats: true,
        },
      },
    ],
  });
};

export const cancelDailyReminder = async () => {
  if (!isNative()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
};
