import { Habit, CalendarEvent, UserState } from "./types";

const KEYS = {
  habits: "ht_habits_v1",
  events: "ht_events_v1",
  user: "ht_user_v1",
} as const;

export const loadHabits = (): Habit[] => {
  try {
    return JSON.parse(localStorage.getItem(KEYS.habits) || "[]");
  } catch {
    return [];
  }
};
export const saveHabits = (h: Habit[]) =>
  localStorage.setItem(KEYS.habits, JSON.stringify(h));

export const loadEvents = (): CalendarEvent[] => {
  try {
    return JSON.parse(localStorage.getItem(KEYS.events) || "[]");
  } catch {
    return [];
  }
};
export const saveEvents = (e: CalendarEvent[]) =>
  localStorage.setItem(KEYS.events, JSON.stringify(e));

export const loadUser = (): UserState => {
  try {
    const raw = localStorage.getItem(KEYS.user);
    if (raw) {
      const parsed = JSON.parse(raw) as UserState;
      return {
        ...parsed,
        reminders: parsed.reminders ?? { enabled: false, time: "09:00" },
        theme: parsed.theme ?? "dark",
        isPro: parsed.isPro ?? false,
      };
    }
  } catch {}
  return {
    coins: 0,
    unlocked: ["default"],
    characterName: "Sprout",
    reminders: { enabled: false, time: "09:00" },
    theme: "dark",
    isPro: false,
  };
};
export const saveUser = (u: UserState) =>
  localStorage.setItem(KEYS.user, JSON.stringify(u));