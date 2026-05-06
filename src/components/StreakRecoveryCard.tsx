import { useState } from "react";
import { Flame, Tv2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/hooks/useAppState";
import { canRecoverDailyStreak } from "@/lib/habits";

export const StreakRecoveryCard = () => {
  const { habits, user, recoverDailyStreak } = useApp();
  const [adBusy, setAdBusy] = useState(false);

  const freezes = user.streakFreezes ?? [];
  if (!canRecoverDailyStreak(habits, freezes)) return null;

  const handleAd = async () => {
    setAdBusy(true);
    await new Promise(r => setTimeout(r, 3000));
    recoverDailyStreak("ad");
    setAdBusy(false);
  };

  return (
    <section>
      <h2 className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2">
        <Flame className="w-3.5 h-3.5" /> Streak at risk
      </h2>
      <div className="bg-card border border-destructive/25 rounded-2xl p-4 flex items-center gap-3 shadow-soft">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">You missed yesterday</p>
          <p className="text-xs text-muted-foreground">Recover your daily streak before it's gone</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs shrink-0"
          disabled={adBusy}
          onClick={handleAd}
        >
          <Tv2 className="w-3 h-3 mr-1" />
          {adBusy ? "…" : "Watch Ad"}
        </Button>
        <Button
          size="sm"
          className="rounded-xl text-xs shrink-0 gradient-primary text-primary-foreground"
          disabled={user.coins < 50}
          title={user.coins < 50 ? `Need ${50 - user.coins} more coins` : "Spend 50 coins"}
          onClick={() => recoverDailyStreak("coins")}
        >
          🪙 50
        </Button>
      </div>
    </section>
  );
};
