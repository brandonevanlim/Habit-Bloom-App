import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { Habit, CalendarEvent, UserState, OnboardingData } from "@/lib/types";
import {
  loadHabits, saveHabits, loadEvents, saveEvents, loadUser, saveUser,
} from "@/lib/storage";
import { toDateKey, getCurrentStreak } from "@/lib/habits";
import { toast } from "sonner";
import { celebrateUnlock, celebrateMilestone } from "@/lib/celebrate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UnlockEvent {
  emoji: string;
  name: string;
  kind: string;
}

interface Ctx {
  habits: Habit[];
  events: CalendarEvent[];
  user: UserState;
  syncing: boolean;
  addHabit: (h: Omit<Habit, "id" | "createdAt" | "completions">) => void;
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
  completeOnboarding: (data: OnboardingData) => void;
  unlockEvent: UnlockEvent | null;
  clearUnlockEvent: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser } = useAuth();
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents());
  const [user, setUser] = useState<UserState>(() => loadUser());
  const [unlockEvent, setUnlockEvent] = useState<UnlockEvent | null>(null);
  const [syncing, setSyncing] = useState(true);

  // Ref so mutations always read the latest user without stale closures
  const userRef = useRef<UserState>(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Always keep localStorage in sync as a local cache
  useEffect(() => saveHabits(habits), [habits]);
  useEffect(() => saveEvents(events), [events]);
  useEffect(() => saveUser(user), [user]);

  // ─── Supabase helpers ────────────────────────────────────────────────────────

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
    }).then(({ error }) => { if (error) console.error("habit sync error:", error); });
  }, [authUser]);

  const dropHabit = useCallback(async (id: string) => {
    if (!authUser) return;
    await supabase.from("habits").delete()
      .eq("id", id).eq("user_id", authUser.id)
      .then(({ error }) => { if (error) console.error("habit delete error:", error); });
  }, [authUser]);

  const pushProfile = useCallback(async (u: UserState) => {
    if (!authUser) return;
    await supabase.from("profiles").upsert({
      user_id: authUser.id,
      coins: u.coins,
      unlocked: u.unlocked,
      character_name: u.characterName,
      display_name: u.displayName ?? null,
      goal: u.goal ?? null,
      onboarding_done: u.onboardingDone ?? false,
      is_pro: u.isPro ?? false,
      pro_since: u.proSince ?? null,
      theme: u.theme ?? "dark",
    }, { onConflict: "user_id" })
      .then(({ error }) => { if (error) console.error("profile sync error:", error); });
  }, [authUser]);

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
    if (!authUser) {
      // User logged out — wipe local state so the next account starts clean
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
        // HABITS
        const { data: cloudHabits } = await supabase
          .from("habits").select("*")
          .eq("user_id", authUser.id)
          .order("created_at");

        if (cloudHabits && cloudHabits.length > 0) {
          setHabits(cloudHabits.map((r) => ({
            id: r.id,
            name: r.name,
            emoji: r.emoji,
            color: r.color,
            days: r.days as number[],
            completions: r.completions as string[],
            createdAt: r.created_at,
          })));
        } else {
          setHabits([]); // New account — start fresh
        }

        // PROFILE
        const { data: profile } = await supabase
          .from("profiles").select("*")
          .eq("user_id", authUser.id)
          .single();

        if (profile) {
          setUser((u) => ({
            ...u,
            coins: profile.coins ?? u.coins,
            unlocked: (profile.unlocked as string[]) ?? u.unlocked,
            characterName: profile.character_name ?? u.characterName,
            displayName: profile.display_name ?? u.displayName,
            goal: profile.goal ?? u.goal,
            onboardingDone: profile.onboarding_done ?? u.onboardingDone,
            isPro: profile.is_pro ?? u.isPro,
            proSince: profile.pro_since ?? u.proSince,
            theme: (profile.theme as "light" | "dark" | "system") ?? u.theme,
          }));
        } else {
          // New account — create a fresh profile row
          await supabase.from("profiles").upsert({
            user_id: authUser.id,
            coins: 0,
            unlocked: ["default"],
            character_name: "Sprout",
            display_name: null,
            goal: null,
            onboarding_done: false,
            is_pro: false,
            theme: "dark",
          }, { onConflict: "user_id" });
        }

        // CALENDAR EVENTS
        const { data: cloudEvents } = await supabase
          .from("calendar_events").select("*")
          .eq("user_id", authUser.id)
          .order("date");

        if (cloudEvents && cloudEvents.length > 0) {
          setEvents(cloudEvents.map((r) => ({
            id: r.id,
            title: r.title,
            date: r.date,
            note: r.note ?? undefined,
          })));
        } else {
          setEvents([]); // New account — start fresh
        }
      } catch (err) {
        console.error("Cloud load error:", err);
      } finally {
        setSyncing(false);
      }
    })();
  }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ─── Mutations ────────────────────────────────────────────────────────────────

  const addHabit: Ctx["addHabit"] = useCallback((h) => {
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
        completeOnboarding,
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
