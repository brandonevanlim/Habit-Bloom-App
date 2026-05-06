import { useApp, LOGIN_BONUSES } from "@/hooks/useAppState";
import {
  habitsForDay, completionRate, getDailyStreak, isHabitActive, toDateKey,
  isCompletedOn, isHabitScheduled,
} from "@/lib/habits";
import { computeEarnedBadges } from "@/lib/badges";
import { HabitCard } from "@/components/HabitCard";
import { Heatmap } from "@/components/Heatmap";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import mascot from "@/assets/mascot.png";
import { Sparkles, Plus, Loader2, Flame, Snowflake, Tv2, Crown, Users, Lock, TrendingUp, Target, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import { StreakRecoveryCard } from "@/components/StreakRecoveryCard";
import { SHOP_ITEMS } from "@/lib/shopItems";

interface WeekRate { label: string; rate: number }

const WeeklyTrend = ({ rates }: { rates: WeekRate[] }) => {
  const n = rates.length;
  const W = 280, H = 90;
  const padX = 8, padT = 14, chartH = 58, labelY = H - 3;
  const step = (W - padX * 2) / n;
  const barW = Math.round(step * 0.55);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <line x1={padX} y1={padT + chartH} x2={W - padX} y2={padT + chartH}
        style={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
      {rates.map((r, i) => {
        const cx = padX + i * step + step / 2;
        const barH = Math.max(r.rate === 0 ? 0 : 2, (r.rate / 100) * chartH);
        const barX = cx - barW / 2;
        const barY = padT + chartH - barH;
        const showLabel = i % 2 === 1;
        return (
          <g key={i}>
            {barH > 0 && (
              <rect x={barX} y={barY} width={barW} height={barH} rx={2}
                style={{ fill: "hsl(var(--primary) / 0.75)" }} />
            )}
            <text x={cx} y={barY - 2} textAnchor="middle" fontSize={6.5}
              style={{ fill: "hsl(var(--primary))", fontWeight: 600 }}>
              {r.rate > 0 ? `${r.rate}%` : ""}
            </text>
            {showLabel && (
              <text x={cx} y={labelY} textAnchor="middle" fontSize={6.5}
                style={{ fill: "hsl(var(--muted-foreground))" }}>
                {r.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const Index = () => {
  const { habits, user, syncing, freezeStreak, addTempHabit, deleteHabit, watchAd, purchaseItem, loginBonus, clearLoginBonus, weeklyRecap, clearWeeklyRecap } = useApp();
  const today = new Date();
  const todayKey = toDateKey(today);
  const [adBusy, setAdBusy] = useState<string | null>(null); // habitId being extended

  // Active habits only (exclude expired temp habits)
  const activeHabits = habits.filter(isHabitActive);
  const expiredHabits = habits.filter((h) => !isHabitActive(h));

  const todays = habitsForDay(activeHabits, today);
  const doneToday = todays.filter((h) => h.completions.includes(todayKey)).length;
  const rate7 = completionRate(activeHabits, 7);
  const dailyStreak = getDailyStreak(activeHabits, user.streakFreezes ?? []);
  const todayIds = new Set(todays.map((h) => h.id));
  const others = activeHabits.filter((h) => !todayIds.has(h.id));

  // Stats calculations (for the inline stats section)
  const rate30 = completionRate(habits, 30);
  const totalCompletions = habits.reduce((s, h) => s + h.completions.length, 0);

  const weeklyRates: WeekRate[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    let sched = 0, done = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      if (day > today) break;
      for (const h of habits) {
        if (isHabitScheduled(h, day)) { sched++; if (isCompletedOn(h, day)) done++; }
      }
    }
    weeklyRates.push({
      label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      rate: sched === 0 ? 0 : Math.round((done / sched) * 100),
    });
  }

  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayScheduled = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const wd = d.getDay();
    for (const h of habits) {
      if (isHabitScheduled(h, d)) {
        dayScheduled[wd]++;
        if (isCompletedOn(h, d)) dayCounts[wd]++;
      }
    }
  }
  const dayRates = dayCounts.map((c, i) => (dayScheduled[i] === 0 ? 0 : c / dayScheduled[i]));
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const bestDay = dayRates.indexOf(Math.max(...dayRates));
  const worstDay = dayRates.indexOf(
    Math.min(...dayRates.map((r, i) => (dayScheduled[i] === 0 ? Infinity : r)))
  );

  const isFrozenToday = user.streakFreezes?.includes(todayKey) ?? false;
  const earnedBadges = computeEarnedBadges(habits, user);

  const greeting = (() => {
    const hr = today.getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  })();

  const handleExtendViaAd = async (habitId: string) => {
    setAdBusy(habitId);
    await new Promise((r) => setTimeout(r, 3000));
    watchAd();
    // Find the habit and re-add it as a new temp habit for today
    const h = habits.find((x) => x.id === habitId);
    if (h) {
      deleteHabit(habitId);
      addTempHabit({ name: h.name, emoji: h.emoji, color: h.color, days: h.days, reminderTime: h.reminderTime });
    }
    setAdBusy(null);
    toast.success("Habit extended for today!");
  };

  return (
    <div className="space-y-6">
      {/* Login bonus modal */}
      {loginBonus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-xs shadow-xl text-center">
            <div className="text-5xl mb-3">🎁</div>
            <h2 className="text-xl font-bold">Daily Bonus!</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Day {loginBonus.day} of 7 — keep the streak going!
            </p>
            {/* Progress track */}
            <div className="flex gap-1 mt-4 mb-5">
              {LOGIN_BONUSES.map((coins, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-[9px] font-bold leading-none flex flex-col items-center gap-0.5",
                    i < loginBonus.day
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  <span>{i + 1}</span>
                  <span>+{coins}</span>
                </div>
              ))}
            </div>
            <div className="text-4xl font-bold text-warning mb-1">+{loginBonus.coins}</div>
            <p className="text-sm text-muted-foreground mb-5">coins added to your balance</p>
            <Button
              className="w-full rounded-2xl gradient-primary text-primary-foreground"
              onClick={clearLoginBonus}
            >
              Collect 🎉
            </Button>
          </div>
        </div>
      )}
      {/* Weekly recap modal (shown every Saturday) */}
      {weeklyRecap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-xs shadow-xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📊</div>
              <h2 className="text-xl font-bold">Weekly Recap</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{weeklyRecap.weekLabel}</p>
            </div>

            {/* Big completion rate */}
            <div className="bg-primary/10 rounded-2xl p-4 text-center mb-3">
              <div className="text-5xl font-bold text-primary">{weeklyRecap.rate}%</div>
              <div className="text-xs text-muted-foreground mt-1">completion rate</div>
              <div className={cn(
                "text-xs font-semibold mt-1.5",
                weeklyRecap.rate > weeklyRecap.prevRate ? "text-success" :
                weeklyRecap.rate < weeklyRecap.prevRate ? "text-destructive" : "text-muted-foreground"
              )}>
                {weeklyRecap.rate > weeklyRecap.prevRate ? `↑ up from ${weeklyRecap.prevRate}% last week` :
                 weeklyRecap.rate < weeklyRecap.prevRate ? `↓ down from ${weeklyRecap.prevRate}% last week` :
                 "same as last week"}
              </div>
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-accent">{weeklyRecap.streak}🔥</div>
                <div className="text-[10px] text-muted-foreground">day streak</div>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-primary">✅ {weeklyRecap.totalDone}</div>
                <div className="text-[10px] text-muted-foreground">habits done</div>
              </div>
            </div>

            {/* Motivational message */}
            <p className="text-sm text-center text-muted-foreground mb-5 italic">
              {weeklyRecap.rate >= 90 ? "You absolutely crushed it this week! 🏆" :
               weeklyRecap.rate >= 70 ? "Solid week — you showed up and delivered! 💪" :
               weeklyRecap.rate >= 50 ? "Good effort. Push for 70% next week! 🌱" :
               weeklyRecap.rate >= 30 ? "Rough weeks happen. Tomorrow is a fresh start 🌅" :
               "Every champion has a comeback week. Next week is yours 🥊"}
            </p>

            <Button
              className="w-full rounded-2xl gradient-primary text-primary-foreground"
              onClick={clearWeeklyRecap}
            >
              Let's go! 🚀
            </Button>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {greeting}{user.displayName ? `, ${user.displayName}` : ""}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {today.toLocaleDateString(undefined, { weekday: "long" })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {syncing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 shadow-soft">
            <Sparkles className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold">{user.coins}</span>
          </div>
        </div>
      </header>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-5 shadow-glow text-primary-foreground">
        <div className="flex items-center gap-4">
          <img
            src={mascot}
            alt="mascot"
            className="drop-shadow-md animate-float"
            style={{ width: 80, height: 80 }}
          />
          <div className="flex-1">
            <p className="text-xs opacity-80">{user.characterName} says</p>
            <p className="font-semibold leading-snug mt-0.5 text-sm">
              {doneToday === 0
                ? "Let's start the day strong! 🌱"
                : doneToday === todays.length && todays.length > 0
                ? "All done — you're amazing! ✨"
                : `${doneToday}/${todays.length} done — keep going!`}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="opacity-75">7-day rate</div>
            <div className="text-base font-bold">{rate7}%</div>
          </div>
          <div>
            <div className="opacity-75">Today</div>
            <div className="text-base font-bold">{doneToday}/{todays.length}</div>
          </div>
          <div>
            <div className="opacity-75 flex items-center gap-1">
              <Flame className="w-3 h-3" /> Streak
            </div>
            <div className="text-base font-bold">{dailyStreak}d</div>
          </div>
        </div>

        {/* Streak freeze button */}
        <div className="mt-3 pt-3 border-t border-white/20">
          <button
            onClick={freezeStreak}
            disabled={isFrozenToday || user.coins < 50}
            className="flex items-center gap-1.5 text-xs opacity-90 disabled:opacity-40 hover:opacity-100 transition-smooth"
          >
            <Snowflake className="w-3.5 h-3.5" />
            {isFrozenToday ? "Streak frozen today ✓" : `Freeze streak — 50 coins`}
          </button>
        </div>
      </div>

      {/* Badges row */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Badges</h2>
        {earnedBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Complete habits and build streaks to earn badges. 🏅
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                title={badge.description}
                className="flex flex-col items-center gap-1 min-w-[68px] bg-card border border-border rounded-2xl p-3 shadow-soft shrink-0"
              >
                <div className="text-2xl">{badge.emoji}</div>
                <div className="text-[10px] font-medium text-center leading-tight text-muted-foreground">
                  {badge.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <StreakRecoveryCard />

      {/* Expired temp habits recovery */}
      {expiredHabits.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-warning">Temporary habits expired</h2>
          {expiredHabits.map((h) => (
            <div
              key={h.id}
              className="bg-card border border-warning/30 rounded-2xl p-3 flex items-center gap-3 shadow-soft"
            >
              <span className="text-xl">{h.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{h.name}</p>
                <p className="text-xs text-muted-foreground">Keep it for today?</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl text-xs shrink-0"
                disabled={adBusy === h.id}
                onClick={() => handleExtendViaAd(h.id)}
              >
                <Tv2 className="w-3 h-3 mr-1" />
                {adBusy === h.id ? "…" : "Ad"}
              </Button>
              <Button
                size="sm"
                className="rounded-xl text-xs gradient-primary shrink-0"
                asChild
              >
                <Link to="/upgrade"><Crown className="w-3 h-3 mr-1" />Pro</Link>
              </Button>
              <button
                onClick={() => deleteHabit(h.id)}
                className="text-xs text-muted-foreground hover:text-destructive px-1 transition-smooth"
              >
                ✕
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Today's habits */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Your habits</h2>
          <CreateHabitDialog
            trigger={
              <Button size="sm" variant="ghost" className="rounded-full">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            }
          />
        </div>
        {todays.length === 0 ? (
          <div className="text-center py-10 px-6 bg-card border border-dashed border-border rounded-3xl">
            <div className="text-5xl mb-3">🌱</div>
            <p className="font-semibold">
              {activeHabits.length === 0 ? "No habits yet" : "Nothing scheduled today"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              {activeHabits.length === 0
                ? "Create your first habit to get started."
                : "Enjoy a rest day or check your other habits below."}
            </p>
            <CreateHabitDialog />
          </div>
        ) : (
          <div className="space-y-3">
            {todays.map((h) => (
              <HabitCard key={h.id} habit={h} date={today} />
            ))}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">All habits</h2>
            <span className="text-xs text-muted-foreground">Not scheduled today</span>
          </div>
          <div className="space-y-3">
            {others.map((h) => (
              <HabitCard key={h.id} habit={h} date={today} />
            ))}
          </div>
        </section>
      )}

      {/* ── Full Stats ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Stats</h2>

        {/* 4-stat grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "7-day rate",   value: `${rate7}%`,        icon: Target,      color: "text-primary" },
            { label: "30-day rate",  value: `${rate30}%`,       icon: TrendingUp,  color: "text-success" },
            { label: "Streak",       value: `${dailyStreak}d`,  icon: Flame,       color: "text-accent" },
            { label: "Total done",   value: totalCompletions,   icon: CalendarIcon, color: "text-warning" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div className="text-2xl font-bold mt-2">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Weekly trend */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft mb-4">
          <h3 className="font-semibold mb-1">Weekly trend</h3>
          <p className="text-xs text-muted-foreground mb-3">Completion rate per week (last 8 weeks)</p>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Add habits to see your trend.</p>
          ) : (
            <WeeklyTrend rates={weeklyRates} />
          )}
        </div>

        {/* Activity heatmap */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft mb-4">
          <h3 className="font-semibold mb-3">Activity heatmap</h3>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Add habits to see your activity.</p>
          ) : (
            <Heatmap habits={habits} />
          )}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <span className="w-3 h-3 rounded-sm bg-secondary" />
            <span className="w-3 h-3 rounded-sm bg-primary/30" />
            <span className="w-3 h-3 rounded-sm bg-primary/60" />
            <span className="w-3 h-3 rounded-sm bg-primary" />
            <span>More</span>
          </div>
        </div>

        {/* Insight */}
        {habits.length > 0 && (
          <div className="rounded-3xl gradient-warm p-5 shadow-warm text-accent-foreground mb-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <p className="font-semibold">Insight</p>
                <p className="text-sm opacity-95 mt-0.5">
                  You're most consistent on {dayLabels[bestDay]}s.
                  {dayScheduled[worstDay] > 0 && bestDay !== worstDay
                    ? ` Try paying extra attention on ${dayLabels[worstDay]}s.`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Friends widget */}
      <section className="bg-card border border-border rounded-3xl p-4 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold">Friends</h2>
          </div>
          <Link to="/friends" className="text-xs text-primary font-medium">View league →</Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-0.5">Your invite code</p>
            <p className="text-xl font-bold font-mono tracking-widest text-primary">
              {user.friendCode ?? "—"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs shrink-0"
            onClick={() => {
              if (user.friendCode) {
                navigator.clipboard.writeText(user.friendCode);
                toast.success("Code copied!", { description: "Share it with a friend to connect." });
              }
            }}
          >
            Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Add friends and compete on the weekly leaderboard 🏆
        </p>
      </section>

      {/* Shop widget */}
      {(() => {
        const shopItems = SHOP_ITEMS.filter(i => i.cost > 0 && !user.unlocked.includes(i.id)).slice(0, 3);
        if (shopItems.length === 0) return null;
        return (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Shop</h2>
              <Link to="/character" className="text-xs text-primary font-medium">View all →</Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {shopItems.map((item) => {
                const canAfford = user.coins >= item.cost;
                return (
                  <button
                    key={item.id}
                    onClick={() => purchaseItem(item)}
                    disabled={!canAfford}
                    className={cn(
                      "bg-card border rounded-2xl p-3 text-center shadow-soft transition-bounce relative",
                      canAfford ? "border-border hover:scale-105 hover:border-primary cursor-pointer active:scale-95" : "border-border cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className={cn("text-3xl mb-1", !canAfford && "grayscale")}>{item.emoji}</div>
                    <div className="text-xs font-semibold truncate">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground">{item.kind}</div>
                    <div className="mt-1 flex items-center justify-center gap-0.5 text-xs">
                      <Sparkles className="w-3 h-3 text-warning" />
                      <span className={cn("font-semibold", canAfford ? "text-warning" : "text-muted-foreground")}>
                        {item.cost}
                      </span>
                    </div>
                    {!canAfford && <Lock className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })()}
    </div>
  );
};

export default Index;
