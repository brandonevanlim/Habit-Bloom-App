import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { Habit, CalendarEvent, UserState, OnboardingData } from "@/lib/types";
import {
  loadHabits, saveHabits, loadEvents, saveEvents, loadUser, saveUser,
} from "@/lib/storage";
import { toDateKey, getCurrentStreak, getDailyStreak, isHabitScheduled } from "@/lib/habits";
import { toast } from "sonner";
import { celebrateUnlock, celebrateMilestone } from "@/lib/celebrate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UnlockEvent {
  emoji: string;
  name: string;
  kind: string;
}

interface WeeklyRecap {
  rate: number;
  prevRate: number;
  streak: number;
  totalDone: number;
  weekLabel: string;
}

const FRIEND_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
const generateFriendCode = (): string =>
  Array.from({ length: 6 }, () =>
    FRIEND_CODE_CHARS[Math.floor(Math.random() * FRIEND_CODE_CHARS.length)]
  ).join("");

export const FREE_HABIT_LIMIT = 5;
export const LOGIN_BONUSES = [5, 10, 15, 15, 15, 15, 25] as const; // days 1-7, total = 100

interface Ctx {
  habits: Habit[];
  events: CalendarEvent[];
  user: UserState;
  syncing: boolean;
  addHabit: (h: Omit<Habit, "id" | "createdAt" | "completions">) => void;
  addTempHabit: (h: Omit<Habit, "id" | "createdAt" | "completions" | "expiresAt">) => void;
  updateHabit: (id: string, updates: Partial<Pick<Habit, "name" | "emoji" | "color" | "days" | "reminderTime">>) => void;
  deleteHabit: (id: string) => void;
  toggleCompletion: (habitId: string, date: Date) => void;
  addEvent: (e: Omit<CalendarEvent, "id">) => void;
  deleteEvent: (id: string) => void;
  setReminder: (enabled: boolean, time?: string) => Promise<void>;
  setTheme: (theme: "light" | "dark" | "system") => void;
  purchaseItem: (item: { id: string; name: string; emoji: string; cost: number; kind: string }) => boolean;
  watchAd: () => number;
  upgradeToPro: () => void;
  cancelPro: () => void;
  freezeStreak: () => void;
  recoverStreak: (habitId: string, date: string, via: "coins" | "ad") => void;
  completeOnboarding: (data: OnboardingData) => void;
  loginBonus: { coins: number; day: number } | null;
  clearLoginBonus: () => void;
  weeklyRecap: WeeklyRecap | null;
  clearWeeklyRecap: () => void;
  unlockEvent: UnlockEvent | null;
  clearUnlockEvent: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, loading: authLoading } = useAuth();
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents());
  const [user, setUser] = useState<UserState>(() => loadUser());
  const [unlockEvent, setUnlockEvent] = useState<UnlockEvent | null>(null);
  const [loginBonus, setLoginBonus] = useState<{ coins: number; day: number } | null>(null);
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecap | null>(null);
  const [syncing, setSyncing] = useState(true);
  const loginBonusChecked = useRef(false);

  // Refs so mutations always read the latest state without stale closures
  const userRef = useRef<UserState>(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const habitsRef = useRef<Habit[]>(habits);
  useEffect(() => { habitsRef.current = habits; }, [habits]);

  // Always keep localStorage in sync as a local cache
  useEffect(() => saveHabits(habits), [habits]);
  useEffect(() => saveEvents(events), [events]);
  useEffect(() => saveUser(user), [user]);

  // ─── Supabase helpers ────────────────────────────────────────────────────────

  const syncWarnedRef = useRef(false);
  const warnSyncFailed = useCallback(() => {
    if (syncWarnedRef.current) return;
    syncWarnedRef.current = true;
    toast.error("Sync failed", {
      description: "Your data is saved locally but couldn't reach the cloud. Check your connection or Supabase RLS policies.",
      duration: 8000,
    });
  }, []);

  const pushHabit = useCallback(async (habit: Habit) => {
    if (!authUser) return;
    await supabase.from("habits").upsert({
      id: habit.id,
      user_id: authUser.id,
      name: habit.name,
      emoji: habit.emoji,
      color: habit.color,
      days: habit.days,
      completions: habit.completions,
      reminder_time: habit.reminderTime ?? null,
      expires_at: habit.expiresAt ?? null,
    }).then(({ error }) => { if (error) { console.error("habit sync error:", error); warnSyncFailed(); } });
  }, [authUser, warnSyncFailed]);

  const dropHabit = useCallback(async (id: string) => {
    if (!authUser) return;
    await supabase.from("habits").delete()
      .eq("id", id).eq("user_id", authUser.id)
      .then(({ error }) => { if (error) console.error("habit delete error:", error); });
  }, [authUser]);

  const pushProfile = useCallback(async (u: UserState) => {
    if (!authUser) return;
    const { error } = await supabase.from("profiles").update({
      coins: u.coins,
      unlocked: u.unlocked,
      character_name: u.characterName,
      display_name: u.displayName ?? null,
      goal: u.goal ?? null,
      onboarding_done: u.onboardingDone ?? false,
      is_pro: u.isPro ?? false,
      pro_since: u.proSince ?? null,
      theme: u.theme ?? "dark",
      streak_freezes: u.streakFreezes ?? [],
      last_login_date: u.lastLoginDate ?? null,
      login_streak: u.loginStreak ?? 0,
      friend_code: u.friendCode ?? null,
    }).eq("user_id", authUser.id);
    if (error) { console.error("profile sync error:", error); warnSyncFailed(); }
  }, [authUser, warnSyncFailed]);

  const pushEvent = useCallback(async (event: CalendarEvent) => {
    if (!authUser) return;
    await supabase.from("calendar_events").upsert({
      id: event.id,
      user_id: authUser.id,
      title: event.title,
      date: event.date,
      note: event.note ?? null,
    }).then(({ error }) => { if (error) console.error("event sync error:", error); });
  }, [authUser]);

  const dropEvent = useCallback(async (id: string) => {
    if (!authUser) return;
    await supabase.from("calendar_events").delete()
      .eq("id", id).eq("user_id", authUser.id)
      .then(({ error }) => { if (error) console.error("event delete error:", error); });
  }, [authUser]);

  // ─── Cloud load on login / reset on logout ───────────────────────────────────

  useEffect(() => {
    // Wait until the auth session has been resolved — avoids wiping localStorage
    // while Supabase is still checking the stored token on page load.
    if (authLoading) return;

    if (!authUser) {
      // User genuinely logged out — wipe local state so next account starts clean
      const fresh: UserState = {
        coins: 0,
        unlocked: ["default"],
        characterName: "Sprout",
        displayName: "",
        goal: "",
        onboardingDone: false,
        reminders: { enabled: false, time: "09:00" },
        theme: "dark",
        isPro: false,
      };
      saveHabits([]);
      saveEvents([]);
      saveUser(fresh);
      setHabits([]);
      setEvents([]);
      setUser(fresh);
      setSyncing(false);
      return;
    }

    (async () => {
      setSyncing(true);
      try {
        // ── HABITS ────────────────────────────────────────────────────────────
        const { data: cloudHabits, error: habitsErr } = await supabase
          .from("habits").select("*")
          .eq("user_id", authUser.id)
          .order("created_at");

        if (habitsErr) {
          console.error("Habits load error:", habitsErr);
          // Keep whatever is already in state (localStorage was not wiped)
        } else if (cloudHabits && cloudHabits.length > 0) {
          // Merge cloud completions with local completions so any write that
          // didn't reach Supabase is not silently lost on next session.
          const localMap = new Map(habitsRef.current.map(h => [h.id, h]));
          setHabits(cloudHabits.map((r) => {
            const local = localMap.get(r.id);
            const cloudComps = r.completions as string[];
            const completions = local
              ? [...new Set([...cloudComps, ...local.completions])].sort()
              : cloudComps;
            return {
              id: r.id,
              name: r.name,
              emoji: r.emoji,
              color: r.color,
              days: r.days as number[],
              completions,
              createdAt: r.created_at,
              reminderTime: r.reminder_time ?? undefined,
              expiresAt: r.expires_at ?? undefined,
            };
          }));
        } else {
          setHabits([]); // Confirmed empty (new account)
        }

        // ── PROFILE ───────────────────────────────────────────────────────────
        const { data: profile, error: profileErr } = await supabase
          .from("profiles").select("*")
          .eq("user_id", authUser.id)
          .single();

        if (profile) {
          const friendCode: string = (profile.friend_code as string | null)
            ?? generateFriendCode();
          if (!profile.friend_code) {
            supabase.from("profiles")
              .update({ friend_code: friendCode })
              .eq("user_id", authUser.id)
              .then(({ error }) => { if (error) console.error("friend code set error:", error); });
          }

          setUser((u) => {
            // For numeric fields that accumulate (coins, streak), take the larger value
            // as a safety net in case cloud writes were delayed or failed.
            const cloudDate = profile.last_login_date as string | null | undefined;
            const localDate = u.lastLoginDate;
            const lastLoginDate = cloudDate && localDate
              ? (cloudDate >= localDate ? cloudDate : localDate)
              : (cloudDate ?? localDate);
            const loginStreak = Math.max(profile.login_streak ?? 0, u.loginStreak ?? 0);
            const coins = Math.max(profile.coins ?? 0, u.coins ?? 0);

            return {
              ...u,
              coins,
              unlocked: (profile.unlocked as string[]) ?? u.unlocked,
              characterName: profile.character_name ?? u.characterName,
              displayName: profile.display_name ?? u.displayName,
              goal: profile.goal ?? u.goal,
              onboardingDone: profile.onboarding_done ?? u.onboardingDone,
              isPro: profile.is_pro ?? u.isPro,
              proSince: profile.pro_since ?? u.proSince,
              theme: (profile.theme as "light" | "dark" | "system") ?? u.theme,
              streakFreezes: (profile.streak_freezes as string[]) ?? u.streakFreezes,
              lastLoginDate,
              loginStreak,
              friendCode,
            };
          });
        } else if (profileErr?.code === "PGRST116") {
          // "no rows" — genuinely new account, create a fresh profile
          const friendCode = generateFriendCode();
          await supabase.from("profiles").insert({
            user_id: authUser.id,
            coins: 0,
            unlocked: ["default"],
            character_name: "Sprout",
            display_name: null,
            goal: null,
            onboarding_done: false,
            is_pro: false,
            theme: "dark",
            friend_code: friendCode,
          });
          setUser((u) => ({ ...u, friendCode }));
        } else if (profileErr) {
          // Query failed — keep local data (localStorage was not wiped)
          console.error("Profile load error:", profileErr);
        }

        // ── CALENDAR EVENTS ───────────────────────────────────────────────────
        const { data: cloudEvents, error: eventsErr } = await supabase
          .from("calendar_events").select("*")
          .eq("user_id", authUser.id)
          .order("date");

        if (eventsErr) {
          console.error("Events load error:", eventsErr);
        } else if (cloudEvents && cloudEvents.length > 0) {
          setEvents(cloudEvents.map((r) => ({
            id: r.id,
            title: r.title,
            date: r.date,
            note: r.note ?? undefined,
          })));
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Cloud load error:", err);
      } finally {
        setSyncing(false);
      }
    })();
  }, [authUser?.id, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Daily reminder scheduler ─────────────────────────────────────────────────

  useEffect(() => {
    const r = user.reminders;
    if (!r?.enabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const today = toDateKey(now);
      const [hh, mm] = r.time.split(":").map(Number);
      const due =
        now.getHours() > hh ||
        (now.getHours() === hh && now.getMinutes() >= mm);
      if (!due) return;
      if (user.reminders?.lastNotified === today) return;

      const pending = habits.filter(
        (h) =>
          h.days.includes(now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6) &&
          !h.completions.includes(today)
      );
      if (pending.length === 0) {
        setUser((u) => ({
          ...u,
          reminders: { ...(u.reminders ?? { enabled: true, time: r.time }), lastNotified: today },
        }));
        return;
      }
      try {
        new Notification(`${user.characterName} reminder 🌱`, {
          body: `You have ${pending.length} habit${pending.length === 1 ? "" : "s"} left today.`,
          icon: "/favicon.ico",
        });
      } catch { /* ignore */ }
      setUser((u) => ({
        ...u,
        reminders: { ...(u.reminders ?? { enabled: true, time: r.time }), lastNotified: today },
      }));
    };

    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [user.reminders, user.characterName, habits]);

  // ─── Daily login bonus ───────────────────────────────────────────────────────

  useEffect(() => {
    if (syncing || !authUser || loginBonusChecked.current) return;
    loginBonusChecked.current = true;

    const today = toDateKey(new Date());
    const current = userRef.current;
    if (current.lastLoginDate === today) return; // already claimed today

    const yesterday = toDateKey(new Date(Date.now() - 86_400_000));
    const newStreak = current.lastLoginDate === yesterday
      ? Math.min((current.loginStreak ?? 0) + 1, 7)
      : 1;
    const bonusCoins = LOGIN_BONUSES[newStreak - 1];

    const newUser: UserState = {
      ...current,
      coins: current.coins + bonusCoins,
      lastLoginDate: today,
      loginStreak: newStreak,
    };
    setUser(newUser);
    pushProfile(newUser);
    setLoginBonus({ coins: bonusCoins, day: newStreak });
  }, [syncing, authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Weekly recap (shown every Saturday) ─────────────────────────────────────

  useEffect(() => {
    if (syncing || !authUser) return;
    const today = new Date();
    if (today.getDay() !== 6) return; // Saturday only
    const satKey = toDateKey(today);
    if (localStorage.getItem("lastRecapDate") === satKey) return;

    const currentHabits = habitsRef.current;
    if (currentHabits.length === 0) return;

    // This week (last 7 days)
    let sched7 = 0, done7 = 0, totalDone = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = toDateKey(d);
      for (const h of currentHabits) {
        if (isHabitScheduled(h, d)) {
          sched7++;
          if (h.completions.includes(key)) { done7++; totalDone++; }
        }
      }
    }
    const rate = sched7 === 0 ? 0 : Math.round((done7 / sched7) * 100);

    // Previous week (days 8–14)
    let sched14 = 0, done14 = 0;
    for (let i = 7; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = toDateKey(d);
      for (const h of currentHabits) {
        if (isHabitScheduled(h, d)) {
          sched14++;
          if (h.completions.includes(key)) done14++;
        }
      }
    }
    const prevRate = sched14 === 0 ? 0 : Math.round((done14 / sched14) * 100);
    const streak = getDailyStreak(currentHabits, userRef.current.streakFreezes ?? []);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${today.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

    setWeeklyRecap({ rate, prevRate, streak, totalDone, weekLabel });
    localStorage.setItem("lastRecapDate", satKey);
  }, [syncing, authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Streak warning notification (~8 PM) ─────────────────────────────────────

  useEffect(() => {
    if (!authUser) return;
    const MESSAGES = [
      "Sprout is stress-eating and it's YOUR fault 🌱😰 Your streak won't survive another hour of this.",
      "Your streak has entered its villain arc. Redemption arc still available — for a few more hours ⏰",
      "Plot twist: you do the habit, streak survives, life is good 🎬 Write that ending.",
      "Your future self just texted: 'please don't break the streak bro' — no pressure 🙏",
      "8PM reality check ⚠️ Habits incomplete. Streak in danger. Sprout absolutely panicking rn.",
      "Okay bestie, no pressure — but your streak IS literally watching you right now 👀",
      "🚨 Breaking: local streak on life support. Doctors say one completed habit could save it.",
      "Your habit is doing the puppy eyes 🥺 Don't be the person who says no to puppy eyes.",
      "This notification is your villain origin story... unless you go do the thing right now.",
      "Today is almost gone and your streak is screaming into the void 😤 Be its hero.",
    ];
    const check = () => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      const now = new Date();
      if (now.getHours() < 20) return;
      const today = toDateKey(now);
      if (localStorage.getItem("lastStreakWarning") === today) return;
      const incomplete = habitsRef.current.filter(
        h => isHabitScheduled(h, now) && !h.completions.includes(today)
      );
      if (incomplete.length === 0) return;
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      try {
        new Notification("⚠️ Streak at risk!", { body: msg, icon: "/favicon.ico" });
        localStorage.setItem("lastStreakWarning", today);
      } catch { /* ignore */ }
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Public stats sync (leaderboard data) ────────────────────────────────────

  useEffect(() => {
    if (syncing || !authUser) return;
    const todayKey = toDateKey(new Date());
    const habitsDoneToday = habits.filter(h => h.completions.includes(todayKey)).length;
    const bestStreak = getDailyStreak(habits, userRef.current.streakFreezes ?? []);
    supabase.from("profiles").update({
      habits_done_today: habitsDoneToday,
      last_stats_date: todayKey,
      best_streak: bestStreak,
    }).eq("user_id", authUser.id)
      .then(({ error }) => { if (error) console.error("public stats sync error:", error); });
  }, [habits, syncing, authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const addHabit: Ctx["addHabit"] = useCallback((h) => {
    const permanentCount = habitsRef.current.filter((x) => !x.expiresAt).length;
    if (!userRef.current.isPro && permanentCount >= FREE_HABIT_LIMIT) {
      toast.error("Habit limit reached", { description: "Free accounts allow 5 habits. Watch an ad for a one-day habit or upgrade to Pro." });
      return;
    }
    const newHabit: Habit = {
      ...h,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      completions: [],
    };
    setHabits((prev) => [...prev, newHabit]);
    pushHabit(newHabit);
    toast.success("Habit created", { description: `${h.emoji} ${h.name}` });
  }, [pushHabit]);

  const addTempHabit: Ctx["addTempHabit"] = useCallback((h) => {
    const today = toDateKey(new Date());
    const newHabit: Habit = {
      ...h,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      completions: [],
      expiresAt: today,
    };
    setHabits((prev) => [...prev, newHabit]);
    pushHabit(newHabit);
    toast.success("Habit added for today only", { description: `${h.emoji} ${h.name} — watch an ad tomorrow to keep it.` });
  }, [pushHabit]);

  const updateHabit: Ctx["updateHabit"] = useCallback((id, updates) => {
    let toSync: Habit | undefined;
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const updated = { ...h, ...updates };
        toSync = updated;
        return updated;
      })
    );
    if (toSync) pushHabit(toSync);
    toast.success("Habit updated");
  }, [pushHabit]);

  const deleteHabit: Ctx["deleteHabit"] = useCallback((id) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    dropHabit(id);
  }, [dropHabit]);

  const toggleCompletion: Ctx["toggleCompletion"] = useCallback((habitId, date) => {
    const key = toDateKey(date);
    let didComplete = false;
    let milestoneStreak = 0;
    let milestoneBonus = 0;
    let toSync: Habit | undefined;

    const MILESTONES: Record<number, number> = {
      3: 10, 7: 25, 14: 50, 30: 100, 60: 200, 100: 500,
    };

    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const has = h.completions.includes(key);
        didComplete = !has;
        const updated: Habit = {
          ...h,
          completions: has
            ? h.completions.filter((c) => c !== key)
            : [...h.completions, key],
        };
        if (didComplete) {
          const streak = getCurrentStreak(updated);
          if (MILESTONES[streak]) {
            milestoneStreak = streak;
            milestoneBonus = MILESTONES[streak];
          }
        }
        toSync = updated;
        return updated;
      })
    );

    if (toSync) pushHabit(toSync);

    if (didComplete) {
      const bonus = milestoneBonus;
      const newCoins = userRef.current.coins + 5 + bonus;
      const newUser = { ...userRef.current, coins: newCoins };
      setUser(newUser);
      pushProfile(newUser);

      if (bonus > 0) {
        celebrateMilestone();
        toast.success(`🔥 ${milestoneStreak}-day streak!`, {
          description: `+${5 + bonus} coins — milestone bonus unlocked!`,
        });
      } else {
        toast.success("+5 coins", { description: "Nice work — keep it up!" });
      }
    }
  }, [pushHabit, pushProfile]);

  const addEvent: Ctx["addEvent"] = useCallback((e) => {
    const newEvent = { ...e, id: crypto.randomUUID() };
    setEvents((prev) => [...prev, newEvent]);
    pushEvent(newEvent);
    toast.success("Event added");
  }, [pushEvent]);

  const deleteEvent: Ctx["deleteEvent"] = useCallback((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    dropEvent(id);
  }, [dropEvent]);

  const setReminder: Ctx["setReminder"] = useCallback(async (enabled, time) => {
    if (enabled && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.error("Notifications blocked", {
            description: "Enable them in your browser settings to get reminders.",
          });
          return;
        }
      } else if (Notification.permission === "denied") {
        toast.error("Notifications blocked", {
          description: "Enable them in your browser settings to get reminders.",
        });
        return;
      }
    }
    setUser((u) => ({
      ...u,
      reminders: {
        enabled,
        time: time ?? u.reminders?.time ?? "09:00",
        lastNotified: undefined,
      },
    }));
    toast.success(enabled ? "Daily reminder set" : "Reminder turned off");
  }, []);

  const setTheme: Ctx["setTheme"] = useCallback((theme) => {
    const newUser = { ...userRef.current, theme };
    setUser(newUser);
    pushProfile(newUser);
  }, [pushProfile]);

  const purchaseItem: Ctx["purchaseItem"] = useCallback((item) => {
    const current = userRef.current;
    if (current.unlocked.includes(item.id)) return false;
    if (current.coins < item.cost) {
      toast.error("Not enough coins", {
        description: `You need ${item.cost - current.coins} more.`,
      });
      return false;
    }
    const newUser: UserState = {
      ...current,
      coins: current.coins - item.cost,
      unlocked: [...current.unlocked, item.id],
    };
    setUser(newUser);
    pushProfile(newUser);
    setUnlockEvent({ emoji: item.emoji, name: item.name, kind: item.kind });
    celebrateUnlock();
    return true;
  }, [pushProfile]);

  const watchAd: Ctx["watchAd"] = useCallback(() => {
    const r = Math.random() * 100;
    const coins = r < 50 ? 5 : r < 75 ? 10 : r < 90 ? 20 : r < 97 ? 30 : 50;
    const newUser = { ...userRef.current, coins: userRef.current.coins + coins };
    setUser(newUser);
    pushProfile(newUser);
    return coins;
  }, [pushProfile]);

  const upgradeToPro: Ctx["upgradeToPro"] = useCallback(() => {
    const newUser: UserState = {
      ...userRef.current,
      isPro: true,
      proSince: new Date().toISOString(),
    };
    setUser(newUser);
    pushProfile(newUser);
    toast.success("Welcome to Sprout Pro! ✨", {
      description: "AI coaching and insights are now unlocked.",
    });
  }, [pushProfile]);

  const cancelPro: Ctx["cancelPro"] = useCallback(() => {
    const newUser = { ...userRef.current, isPro: false };
    setUser(newUser);
    pushProfile(newUser);
    toast.success("Subscription cancelled");
  }, [pushProfile]);

  const freezeStreak: Ctx["freezeStreak"] = useCallback(() => {
    const current = userRef.current;
    if (current.coins < 50) {
      toast.error("Not enough coins", { description: "You need 50 coins to freeze your streak." });
      return;
    }
    const today = toDateKey(new Date());
    if (current.streakFreezes?.includes(today)) {
      toast.info("Already frozen today", { description: "Your streak is already protected for today." });
      return;
    }
    const newUser: UserState = {
      ...current,
      coins: current.coins - 50,
      streakFreezes: [...(current.streakFreezes ?? []), today],
    };
    setUser(newUser);
    pushProfile(newUser);
    toast.success("❄️ Streak frozen!", { description: "50 coins spent — your streak is safe today." });
  }, [pushProfile]);

  const recoverStreak: Ctx["recoverStreak"] = useCallback((habitId, date, via) => {
    const current = userRef.current;
    if (via === "coins" && current.coins < 100) {
      toast.error("Not enough coins", { description: "You need 100 coins to recover this streak." });
      return;
    }
    let toSync: Habit | undefined;
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId || h.completions.includes(date)) return h;
      toSync = { ...h, completions: [...h.completions, date].sort() };
      return toSync!;
    }));
    if (!toSync) return;
    pushHabit(toSync);
    if (via === "coins") {
      const newUser = { ...current, coins: current.coins - 100 };
      setUser(newUser);
      pushProfile(newUser);
      toast.success("Streak recovered! 🔥", { description: "100 coins spent." });
    } else {
      const bonus = 5 + Math.floor(Math.random() * 11); // 5–15 coins
      const newUser = { ...current, coins: current.coins + bonus };
      setUser(newUser);
      pushProfile(newUser);
      toast.success("Streak recovered! 🔥", { description: `Ad watched — +${bonus} coins bonus!` });
    }
  }, [pushHabit, pushProfile]);

  const completeOnboarding: Ctx["completeOnboarding"] = useCallback((data) => {
    const newUser: UserState = {
      ...userRef.current,
      displayName: data.displayName,
      characterName: data.characterName,
      goal: data.goal,
      onboardingDone: true,
      reminders: {
        enabled: data.reminderEnabled,
        time: data.reminderTime,
        lastNotified: undefined,
      },
    };
    setUser(newUser);
    pushProfile(newUser);

    if (data.starterHabits.length > 0) {
      const newHabits: Habit[] = data.starterHabits.map((h) => ({
        ...h,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        completions: [],
        days: [0, 1, 2, 3, 4, 5, 6] as Habit["days"],
      }));
      setHabits((prev) => [...prev, ...newHabits]);
      newHabits.forEach((h) => pushHabit(h));
    }
  }, [pushProfile, pushHabit]);

  const clearUnlockEvent = useCallback(() => setUnlockEvent(null), []);

  return (
    <AppCtx.Provider
      value={{
        habits,
        events,
        user,
        syncing,
        addHabit,
        addTempHabit,
        updateHabit,
        deleteHabit,
        toggleCompletion,
        addEvent,
        deleteEvent,
        setReminder,
        setTheme,
        purchaseItem,
        watchAd,
        upgradeToPro,
        cancelPro,
        freezeStreak,
        recoverStreak,
        completeOnboarding,
        loginBonus,
        clearLoginBonus: () => setLoginBonus(null),
        weeklyRecap,
        clearWeeklyRecap: () => setWeeklyRecap(null),
        unlockEvent,
        clearUnlockEvent,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppStateProvider");
  return ctx;
};
