import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
} from "@/lib/nativeNotifications";

export interface NotificationPrefs {
  daily_reminder_enabled: boolean;
  daily_reminder_time: string;
  streak_warnings_enabled: boolean;
  milestone_alerts_enabled: boolean;
  weekly_summary_enabled: boolean;
  weekly_summary_day: number;
  timezone: string;
}

const DEFAULTS: NotificationPrefs = {
  daily_reminder_enabled: true,
  daily_reminder_time: "09:00",
  streak_warnings_enabled: true,
  milestone_alerts_enabled: true,
  weekly_summary_enabled: false,
  weekly_summary_day: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
};

export const useNotificationPrefs = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Couldn't load preferences");
      } else if (data) {
        setPrefs({
          daily_reminder_enabled: data.daily_reminder_enabled,
          daily_reminder_time: data.daily_reminder_time,
          streak_warnings_enabled: data.streak_warnings_enabled,
          milestone_alerts_enabled: data.milestone_alerts_enabled,
          weekly_summary_enabled: data.weekly_summary_enabled,
          weekly_summary_day: data.weekly_summary_day,
          timezone: data.timezone,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      if (!user) {
        toast.error("Please sign in first");
        return;
      }
      const next = { ...prefs, ...patch };
      setPrefs(next);
      setSaving(true);
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: user.id, ...next },
          { onConflict: "user_id" }
        );
      setSaving(false);
      if (error) {
        toast.error("Couldn't save preferences");
        return;
      }
      // Schedule / cancel a native daily reminder on Android (no-op on web)
      try {
        if (next.daily_reminder_enabled) {
          const granted = await requestNotificationPermission();
          if (!granted) {
            toast.error("Notification permission denied");
            return;
          }
          await scheduleDailyReminder({
            enabled: true,
            time: next.daily_reminder_time,
            title: "Sprout reminder 🌱",
            body: "Time to check in on your habits!",
          });
        } else {
          await cancelDailyReminder();
        }
      } catch {
        /* native plugin unavailable — fine on web */
      }
    },
    [user, prefs]
  );

  return { prefs, update, loading, saving };
};
