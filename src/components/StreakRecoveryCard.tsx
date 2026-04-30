import { useState } from "react";
import { Flame, Tv2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Habit } from "@/lib/types";
import { useApp } from "@/hooks/useAppState";

interface Props {
  habits: Habit[];
  recoverableDates: Record<string, string>; // habitId → "yyyy-mm-dd"
}

export const StreakRecoveryCard = ({ habits, recoverableDates }: Props) => {
  const { user, recoverStreak } = useApp();
  const [adBusy, setAdBusy] = useState<string | null>(null);

  const recoverableHabits = habits.filter(h => recoverableDates[h.id]);
  if (recoverableHabits.length === 0) return null;

  const handleAd = async (habitId: string) => {
    setAdBusy(habitId);
    await new Promise(r => setTimeout(r, 3000));
    recoverStreak(habitId, recoverableDates[habitId], "ad");
    setAdBusy(null);
  };

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
        <Flame className="w-3.5 h-3.5" /> Streak at risk
      </h2>
      {recoverableHabits.map(h => (
        <div
          key={h.id}
          className="bg-card border border-destructive/25 rounded-2xl p-3 flex items-center gap-3 shadow-soft"
        >
          <span className="text-xl">{h.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{h.name}</p>
            <p className="text-xs text-muted-foreground">Missed yesterday — recover?</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-xs shrink-0"
            disabled={adBusy === h.id}
            onClick={() => handleAd(h.id)}
          >
            <Tv2 className="w-3 h-3 mr-1" />
            {adBusy === h.id ? "…" : "Ad"}
          </Button>
          <Button
            size="sm"
            className="rounded-xl text-xs shrink-0 gradient-primary text-primary-foreground"
            disabled={user.coins < 100}
            title={user.coins < 100 ? `Need ${100 - user.coins} more coins` : "Spend 100 coins"}
            onClick={() => recoverStreak(h.id, recoverableDates[h.id], "coins")}
          >
            🪙 100
          </Button>
        </div>
      ))}
    </section>
  );
};
