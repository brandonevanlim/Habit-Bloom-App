import { useState } from "react";
import { useApp } from "@/hooks/useAppState";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  toDateKey, getDailyStreak, isHabitScheduled, isCompletedOn,
  getCurrentStreak, getLongestStreak,
} from "@/lib/habits";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const summarize = (habits: ReturnType<typeof useApp>["habits"]) => {
  const today = new Date();
  return habits.map(h => {
    let scheduledLast14 = 0, recentCompletions = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      if (isHabitScheduled(h, d)) { scheduledLast14++; if (isCompletedOn(h, d)) recentCompletions++; }
    }
    return {
      name: h.name, emoji: h.emoji, days: h.days,
      currentStreak: getCurrentStreak(h), longestStreak: getLongestStreak(h),
      recentCompletions, scheduledLast14,
    };
  });
};

export const CoachPanel = () => {
  const { habits, user } = useApp();
  const today = new Date();
  const todayKey = toDateKey(today);

  // ── Today ─────────────────────────────────────────────────────────────────────
  const todaysHabits = habits.filter(h => isHabitScheduled(h, today));
  const doneToday = todaysHabits.filter(h => h.completions.includes(todayKey));
  const currentStreak = getDailyStreak(habits, user.streakFreezes ?? []);

  // ── 14-day per-habit rates ────────────────────────────────────────────────────
  const habitStats = habits.map(h => {
    let sched = 0, done = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      if (isHabitScheduled(h, d)) { sched++; if (isCompletedOn(h, d)) done++; }
    }
    return { h, rate: sched === 0 ? null : done / sched, sched };
  }).filter(s => s.sched >= 2);

  const sortedStats = [...habitStats].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const starHabit = sortedStats[0] ?? null;
  const struggleHabit = sortedStats.length > 1 ? sortedStats[sortedStats.length - 1] : null;

  // ── Weekday patterns (28 days) ────────────────────────────────────────────────
  const dayData = [0, 1, 2, 3, 4, 5, 6].map(wd => {
    let sched = 0, done = 0;
    for (let i = 0; i < 28; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      if (d.getDay() !== wd) continue;
      for (const h of habits) {
        if (isHabitScheduled(h, d)) { sched++; if (isCompletedOn(h, d)) done++; }
      }
    }
    return { wd, rate: sched === 0 ? null : done / sched, sched };
  }).filter(d => d.sched > 0);

  const sortedDays = [...dayData].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const bestDayData = sortedDays[0] ?? null;
  const worstDayData = sortedDays.length > 1 ? sortedDays[sortedDays.length - 1] : null;

  // ── Week-over-week trend ──────────────────────────────────────────────────────
  let sched7 = 0, done7 = 0, schedPrev = 0, donePrev = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const key = toDateKey(d);
    for (const h of habits) {
      if (isHabitScheduled(h, d)) {
        if (i < 7) { sched7++; if (h.completions.includes(key)) done7++; }
        else { schedPrev++; if (h.completions.includes(key)) donePrev++; }
      }
    }
  }
  const rate7 = sched7 === 0 ? 0 : Math.round((done7 / sched7) * 100);
  const ratePrev = schedPrev === 0 ? 0 : Math.round((donePrev / schedPrev) * 100);
  const trendDiff = rate7 - ratePrev;

  // ── AI coaching plan ──────────────────────────────────────────────────────────
  const [plan, setPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);

  const generatePlan = async () => {
    setPlanLoading(true);
    setPlan("");
    const patterns = [
      starHabit
        ? `Top habit: ${starHabit.h.emoji} ${starHabit.h.name} (${Math.round((starHabit.rate ?? 0) * 100)}% last 2 weeks)`
        : null,
      struggleHabit && struggleHabit.h.id !== starHabit?.h.id
        ? `Struggling: ${struggleHabit.h.emoji} ${struggleHabit.h.name} (${Math.round((struggleHabit.rate ?? 0) * 100)}% last 2 weeks)`
        : null,
      bestDayData
        ? `Best day: ${DAY_LABELS[bestDayData.wd]} (${Math.round((bestDayData.rate ?? 0) * 100)}%)`
        : null,
      worstDayData && worstDayData.wd !== bestDayData?.wd
        ? `Weakest day: ${DAY_LABELS[worstDayData.wd]} (${Math.round((worstDayData.rate ?? 0) * 100)}%)`
        : null,
      trendDiff !== 0 ? `Week trend: ${trendDiff > 0 ? "+" : ""}${trendDiff}% vs prior week` : null,
    ].filter(Boolean).join(". ");

    const message = `You are a direct, no-fluff habit coach. My real habit data: ${patterns || "just getting started"}. My goal: ${user.goal || "build consistent habits"}. Give me exactly 3 things labeled 1, 2, 3: (1) One specific fix for my weakest area with a concrete action step, (2) One thing to protect what is already working, (3) One thing to do TODAY. Keep each point to 2 sentences max. Be specific to my data, not generic.`;

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message,
          history: [],
          habits: summarize(habits),
          userContext: {
            displayName: user.displayName || "Friend",
            characterName: user.characterName,
            goal: user.goal || "",
            coins: user.coins,
          },
        },
      });
      if (error) throw error;
      setPlan(data?.reply ?? "Couldn't generate a plan right now.");
    } catch {
      toast.error("Coach unavailable", { description: "Try again in a moment." });
    } finally {
      setPlanLoading(false);
    }
  };

  if (habits.length === 0) {
    return (
      <div className="text-center py-12 space-y-2 text-muted-foreground">
        <div className="text-5xl">🌱</div>
        <p className="font-semibold text-foreground">No habits yet</p>
        <p className="text-sm">Add some habits first — your coach needs data to work with.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Today's snapshot ────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-5 shadow-soft">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Today's snapshot</p>

        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div>
            <div className="text-2xl font-bold leading-none">
              {doneToday.length}
              <span className="text-base text-muted-foreground">/{todaysHabits.length}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">done today</div>
          </div>
          <div>
            <div className="text-2xl font-bold leading-none">{currentStreak}<span className="text-base">🔥</span></div>
            <div className="text-[10px] text-muted-foreground mt-1">day streak</div>
          </div>
          <div>
            <div className={cn(
              "text-2xl font-bold leading-none",
              trendDiff > 0 ? "text-success" : trendDiff < 0 ? "text-destructive" : ""
            )}>
              {trendDiff > 0 ? `+${trendDiff}%` : trendDiff < 0 ? `${trendDiff}%` : `${rate7}%`}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {trendDiff !== 0 ? "vs last week" : "this week"}
            </div>
          </div>
        </div>

        {/* Per-habit progress bars */}
        {sortedStats.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            {sortedStats.map(({ h, rate }) => (
              <div key={h.id} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center shrink-0">{h.emoji}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round((rate ?? 0) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                  {Math.round((rate ?? 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pattern insights ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-5 shadow-soft">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Patterns</p>
        <div className="space-y-4">
          {starHabit && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5 shrink-0">{starHabit.h.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{starHabit.h.name} is your star habit</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Math.round((starHabit.rate ?? 0) * 100)}% completion over 2 weeks — protect this one above all else.
                </p>
              </div>
            </div>
          )}
          {struggleHabit && struggleHabit.h.id !== starHabit?.h.id && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5 shrink-0">{struggleHabit.h.emoji}</span>
              <div>
                <p className="text-sm font-semibold">{struggleHabit.h.name} is slipping</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only {Math.round((struggleHabit.rate ?? 0) * 100)}% — consider adjusting which days it's scheduled.
                </p>
              </div>
            </div>
          )}
          {bestDayData && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5 shrink-0">🏆</span>
              <div>
                <p className="text-sm font-semibold">{DAY_LABELS[bestDayData.wd]}s are your power days</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Math.round((bestDayData.rate ?? 0) * 100)}% completion — schedule your hardest habits here.
                </p>
              </div>
            </div>
          )}
          {worstDayData && worstDayData.wd !== bestDayData?.wd && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5 shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold">{DAY_LABELS[worstDayData.wd]}s are a struggle</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Only {Math.round((worstDayData.rate ?? 0) * 100)}% — try removing one habit on that day to reduce friction.
                </p>
              </div>
            </div>
          )}
          {trendDiff !== 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5 shrink-0">{trendDiff > 0 ? "📈" : "📉"}</span>
              <div>
                <p className="text-sm font-semibold">
                  {trendDiff > 0 ? "You're on the rise" : "Slight dip this week"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Math.abs(trendDiff)}% {trendDiff > 0 ? "better" : "worse"} than last week.
                  {trendDiff > 0 ? " Keep that momentum — don't change what's working." : " One good day can turn this around."}
                </p>
              </div>
            </div>
          )}
          {!starHabit && !bestDayData && (
            <p className="text-sm text-muted-foreground">
              Check back after a few days of habit tracking — patterns will appear here.
            </p>
          )}
        </div>
      </div>

      {/* ── AI coaching plan ──────────────────────────────────────────────────────── */}
      <Button
        onClick={generatePlan}
        disabled={planLoading}
        size="lg"
        className="w-full rounded-2xl gradient-primary shadow-glow"
      >
        {planLoading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building your plan…</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" />{plan ? "Refresh coaching plan" : "Get my coaching plan"}</>
        )}
      </Button>

      {plan && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Your coaching plan</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{plan}</p>
        </div>
      )}
    </div>
  );
};
