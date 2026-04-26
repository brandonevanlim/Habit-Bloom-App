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

export const getCurrentStreak = (habit: Habit): number => {
  if (habit.days.length === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // Walk back day by day checking only scheduled days
  for (let i = 0; i < 365; i++) {
    if (isHabitScheduled(habit, cursor)) {
      if (isCompletedOn(habit, cursor)) {
        streak++;
      } else {
        // If today is scheduled but not completed yet, allow skip (don't break streak)
        if (i === 0) {
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

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