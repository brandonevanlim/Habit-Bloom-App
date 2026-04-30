import { Habit, WeekDay } from "./types";

export const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const isHabitScheduled = (habit: Habit, date: Date): boolean =>
  habit.days.includes(date.getDay() as WeekDay);

export const isCompletedOn = (habit: Habit, date: Date): boolean =>
  habit.completions.includes(toDateKey(date));

export const isHabitActive = (habit: Habit): boolean => {
  if (!habit.expiresAt) return true;
  return habit.expiresAt >= toDateKey(new Date());
};

export const getCurrentStreak = (habit: Habit, freezes: string[] = []): number => {
  if (habit.days.length === 0) return 0;
  const frozenSet = new Set(freezes);
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = toDateKey(cursor);
    if (isHabitScheduled(habit, cursor)) {
      if (isCompletedOn(habit, cursor) || frozenSet.has(key)) {
        streak++;
      } else {
        if (i === 0) { cursor.setDate(cursor.getDate() - 1); continue; }
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const getBestStreak = (habits: Habit[], freezes: string[] = []): number =>
  Math.max(0, ...habits.map((h) => getCurrentStreak(h, freezes)));

export const getLongestStreak = (habit: Habit): number => {
  if (habit.completions.length === 0) return 0;
  const sorted = [...habit.completions].sort();
  const set = new Set(sorted);
  let longest = 0;
  for (const dateStr of sorted) {
    const d = parseDateKey(dateStr);
    // Find streak ending at d (consider only scheduled days)
    let cur = 0;
    const cursor = new Date(d);
    while (cur < 365) {
      if (isHabitScheduled({ ...habit }, cursor)) {
        if (set.has(toDateKey(cursor))) cur++;
        else break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    longest = Math.max(longest, cur);
  }
  return longest;
};

export const habitsForDay = (habits: Habit[], date: Date) =>
  habits.filter((h) => isHabitScheduled(h, date));

export const completionRate = (habits: Habit[], days: number): number => {
  let scheduled = 0;
  let completed = 0;
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    for (const h of habits) {
      if (isHabitScheduled(h, d)) {
        scheduled++;
        if (isCompletedOn(h, d)) completed++;
      }
    }
  }
  return scheduled === 0 ? 0 : Math.round((completed / scheduled) * 100);
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

// Consecutive days where the user completed at least 1 habit.
// Days with no scheduled habits are skipped. Today is skipped if nothing done yet.
export const getDailyStreak = (habits: Habit[], freezes: string[] = []): number => {
  if (habits.length === 0) return 0;
  const frozenSet = new Set(freezes);
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = toDateKey(cursor);
    const scheduled = habits.filter(h => isHabitScheduled(h, cursor));
    if (scheduled.length === 0) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    const anyCompleted = scheduled.some(h => h.completions.includes(key));
    if (anyCompleted || frozenSet.has(key)) {
      streak++;
    } else if (i === 0) {
      // today not yet done — don't break the prior streak
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

// Returns yesterday's date key if the habit missed yesterday but has a recent streak worth recovering.
export const getStreakRecoveryDate = (habit: Habit, freezes: string[] = []): string | null => {
  if (habit.days.length === 0) return null;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = toDateKey(yesterday);
  if (!isHabitScheduled(habit, yesterday)) return null;
  if (habit.completions.includes(yKey)) return null;
  if (freezes.includes(yKey)) return null;
  // Only offer recovery if there was recent activity (within the past 2–7 days)
  for (let i = 2; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    if (habit.completions.includes(key) || freezes.includes(key)) return yKey;
  }
  return null;
};