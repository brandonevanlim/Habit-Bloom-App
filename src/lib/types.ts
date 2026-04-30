export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0 ... Sat=6

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string; // hsl semantic key: 'primary' | 'accent' | 'warning' | 'success'
  days: WeekDay[]; // days of week scheduled
  createdAt: string; // ISO date
  completions: string[]; // ISO date strings (yyyy-mm-dd)
  reminderTime?: string; // "HH:MM" per-habit reminder
  expiresAt?: string; // yyyy-mm-dd — set for free-user ad-based temporary habits
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // yyyy-mm-dd
  note?: string;
}

export interface UserState {
  coins: number;
  unlocked: string[]; // item ids
  characterName: string;
  displayName?: string;
  goal?: string;
  onboardingDone?: boolean;
  reminders?: {
    enabled: boolean;
    time: string; // "HH:MM" 24h
    lastNotified?: string; // yyyy-mm-dd
  };
  theme?: "light" | "dark" | "system";
  isPro?: boolean;
  proSince?: string; // ISO date when upgraded
  streakFreezes?: string[]; // yyyy-mm-dd dates with frozen streak
  lastLoginDate?: string; // yyyy-mm-dd
  loginStreak?: number;   // consecutive login days (1-7)
  friendCode?: string;    // 6-char shareable code e.g. "A7B3K2"
}

export interface OnboardingData {
  displayName: string;
  characterName: string;
  goal: string;
  starterHabits: Array<{ name: string; emoji: string; color: string }>;
  reminderEnabled: boolean;
  reminderTime: string;
}