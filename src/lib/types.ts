export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0 ... Sat=6

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string; // hsl semantic key: 'primary' | 'accent' | 'warning' | 'success'
  days: WeekDay[]; // days of week scheduled
  createdAt: string; // ISO date
  completions: string[]; // ISO date strings (yyyy-mm-dd)
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
  reminders?: {
    enabled: boolean;
    time: string; // "HH:MM" 24h
    lastNotified?: string; // yyyy-mm-dd
  };
  theme?: "light" | "dark" | "system";
  isPro?: boolean;
  proSince?: string; // ISO date when upgraded
}