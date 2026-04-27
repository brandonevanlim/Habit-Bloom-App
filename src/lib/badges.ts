import { Habit, UserState } from "./types";
import { getCurrentStreak, getLongestStreak } from "./habits";

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const ALL_BADGES: Badge[] = [
  { id: "first_step",    name: "First Step",     emoji: "🌱", description: "Complete your first habit" },
  { id: "week_warrior",  name: "Week Warrior",    emoji: "🔥", description: "7-day streak on any habit" },
  { id: "month_master",  name: "Month Master",    emoji: "🏆", description: "30-day streak on any habit" },
  { id: "streak_legend", name: "Streak Legend",   emoji: "🦁", description: "60-day streak on any habit" },
  { id: "century_club",  name: "Century Club",    emoji: "👑", description: "100-day streak on any habit" },
  { id: "habit_builder", name: "Habit Builder",   emoji: "💪", description: "Create 5 or more habits" },
  { id: "coin_hoarder",  name: "Coin Hoarder",    emoji: "💰", description: "Accumulate 500 coins" },
  { id: "collector",     name: "Collector",       emoji: "🎨", description: "Unlock 5 items in the shop" },
  { id: "loyal_plant",   name: "Loyal Plant",     emoji: "🪴", description: "Log in 7 days in a row" },
  { id: "overachiever",  name: "Overachiever",    emoji: "⚡", description: "Complete 100 habits total" },
];

export const computeEarnedBadges = (habits: Habit[], user: UserState): Badge[] => {
  const earned = new Set<string>();

  const totalCompletions = habits.reduce((s, h) => s + h.completions.length, 0);
  const bestEverStreak = Math.max(0, ...habits.map((h) => getLongestStreak(h)));
  const bestCurrentStreak = Math.max(0, ...habits.map((h) => getCurrentStreak(h, user.streakFreezes ?? [])));
  const maxStreak = Math.max(bestEverStreak, bestCurrentStreak);

  if (totalCompletions >= 1)                 earned.add("first_step");
  if (maxStreak >= 7)                        earned.add("week_warrior");
  if (maxStreak >= 30)                       earned.add("month_master");
  if (maxStreak >= 60)                       earned.add("streak_legend");
  if (maxStreak >= 100)                      earned.add("century_club");
  if (habits.length >= 5)                    earned.add("habit_builder");
  if (user.coins >= 500)                     earned.add("coin_hoarder");
  if ((user.unlocked?.length ?? 0) >= 5)    earned.add("collector");
  if ((user.loginStreak ?? 0) >= 7)         earned.add("loyal_plant");
  if (totalCompletions >= 100)               earned.add("overachiever");

  return ALL_BADGES.filter((b) => earned.has(b.id));
};
