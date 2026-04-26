import { useApp } from "@/hooks/useAppState";
import { habitsForDay, completionRate } from "@/lib/habits";
import { HabitCard } from "@/components/HabitCard";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import mascot from "@/assets/mascot.png";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { habits, user, syncing } = useApp();
  const today = new Date();
  const todays = habitsForDay(habits, today);
  const doneToday = todays.filter((h) => h.completions.includes(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  )).length;
  const rate7 = completionRate(habits, 7);
  const todayIds = new Set(todays.map((h) => h.id));
  const others = habits.filter((h) => !todayIds.has(h.id));

  const greeting = (() => {
    const hr = today.getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
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
            alt="Your character mascot"
            width={88}
            height={88}
            className="w-22 h-22 drop-shadow-md animate-float"
            style={{ width: 88, height: 88 }}
          />
          <div className="flex-1">
            <p className="text-xs opacity-90">{user.characterName} says</p>
            <p className="font-semibold leading-snug mt-0.5">
              {doneToday === 0
                ? "Let's start the day strong! 🌱"
                : doneToday === todays.length && todays.length > 0
                ? "All done — you're amazing! ✨"
                : `${doneToday}/${todays.length} done — keep going!`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <div>
            <div className="opacity-80">7-day rate</div>
            <div className="text-lg font-bold">{rate7}%</div>
          </div>
          <div className="text-right">
            <div className="opacity-80">Today</div>
            <div className="text-lg font-bold">{doneToday}/{todays.length}</div>
          </div>
        </div>
      </div>

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
              {habits.length === 0 ? "No habits yet" : "Nothing scheduled today"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              {habits.length === 0
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
