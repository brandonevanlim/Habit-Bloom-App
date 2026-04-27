import { useApp, LOGIN_BONUSES } from "@/hooks/useAppState";
import { habitsForDay, completionRate, getBestStreak, isHabitActive, toDateKey } from "@/lib/habits";
import { computeEarnedBadges } from "@/lib/badges";
import { HabitCard } from "@/components/HabitCard";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import mascot from "@/assets/mascot.png";
import { Sparkles, Plus, Loader2, Flame, Snowflake, Tv2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

const Index = () => {
  const { habits, user, syncing, freezeStreak, addTempHabit, deleteHabit, watchAd, loginBonus, clearLoginBonus } = useApp();
  const today = new Date();
  const todayKey = toDateKey(today);
  const [adBusy, setAdBusy] = useState<string | null>(null); // habitId being extended

  // Active habits only (exclude expired temp habits)
  const activeHabits = habits.filter(isHabitActive);
  const expiredHabits = habits.filter((h) => !isHabitActive(h));

  const todays = habitsForDay(activeHabits, today);
  const doneToday = todays.filter((h) => h.completions.includes(todayKey)).length;
  const rate7 = completionRate(activeHabits, 7);
  const bestStreak = getBestStreak(activeHabits, user.streakFreezes ?? []);
  const todayIds = new Set(todays.map((h) => h.id));
  const others = activeHabits.filter((h) => !todayIds.has(h.id));

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
              <Flame className="w-3 h-3" /> Best streak
            </div>
            <div className="text-base font-bold">{bestStreak}d</div>
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
    </div>
  );
};

export default Index;
