import { useState } from "react";
import { useApp } from "@/hooks/useAppState";
import mascot from "@/assets/mascot.png";
import { Sparkles, Lock, Check, Crown, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { celebrateUnlock } from "@/lib/celebrate";
import { SHOP_ITEMS as ITEMS } from "@/lib/shopItems";

const CharacterPage = () => {
  const { user, purchaseItem, watchAd } = useApp();
  const [watching, setWatching] = useState(false);
  const next = ITEMS.filter((i) => !user.unlocked.includes(i.id))[0];

  const handleWatchAd = async () => {
    setWatching(true);
    await new Promise((r) => setTimeout(r, 3000));
    const coins = watchAd();
    setWatching(false);
    if (coins >= 30) celebrateUnlock();
    toast.success(`+${coins} coins!`, {
      description: coins >= 30 ? "Lucky drop! Keep it up!" : "Thanks for watching!",
    });
  };
  const progress = next ? Math.min(100, Math.round((user.coins / next.cost) * 100)) : 100;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Character</h1>
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 shadow-soft">
          <Sparkles className="w-4 h-4 text-warning" />
          <span className="text-sm font-semibold">{user.coins}</span>
        </div>
      </header>

      <div className="rounded-3xl gradient-sky p-6 shadow-soft border border-border text-center">
        <img
          src={mascot}
          alt="Your character"
          width={160}
          height={160}
          className="w-40 h-40 mx-auto animate-float drop-shadow-lg"
          style={{ width: 160, height: 160 }}
        />
        <h2 className="text-xl font-bold mt-3">{user.characterName}</h2>
        <p className="text-sm text-muted-foreground">Lv. {Math.floor(user.coins / 50) + 1} · Sprout form</p>

        {next && (
          <div className="mt-5 bg-card/70 backdrop-blur rounded-2xl p-3 text-left">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Next unlock: {next.emoji} {next.name}</span>
              <span className="font-semibold">{user.coins}/{next.cost}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-smooth"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleWatchAd}
        disabled={watching}
        className={cn(
          "w-full flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-soft transition-bounce",
          !watching && "hover:scale-[1.02] hover:border-primary cursor-pointer active:scale-95",
          watching && "cursor-not-allowed opacity-80"
        )}
      >
        {watching ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="font-semibold text-sm">Watching ad…</span>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-sm">Watch an ad</p>
              <p className="text-xs text-muted-foreground">Chance to earn 5–50 coins</p>
            </div>
            <div className="text-xs text-muted-foreground text-right leading-tight">
              <p>50% → 5 coins</p>
              <p>25% → 10 coins</p>
            </div>
          </>
        )}
      </button>

      <section>
        <h3 className="text-lg font-semibold mb-3">Wardrobe</h3>
        <div className="grid grid-cols-3 gap-3">
          {ITEMS.map((it) => {
            const owned = user.unlocked.includes(it.id);
            const canAfford = user.coins >= it.cost;
            return (
              <button
                key={it.id}
                onClick={() => !owned && purchaseItem(it)}
                disabled={owned || !canAfford}
                className={cn(
                  "bg-card border rounded-2xl p-3 text-center transition-bounce shadow-soft relative overflow-hidden text-left",
                  owned ? "border-primary" : "border-border",
                  !owned && canAfford && "hover:scale-105 hover:border-primary cursor-pointer active:scale-95",
                  !owned && !canAfford && "cursor-not-allowed"
                )}
                aria-label={owned ? `${it.name} owned` : `Buy ${it.name} for ${it.cost} coins`}
              >
                <div
                  className={cn(
                    "text-3xl mb-1 transition-smooth",
                    !owned && !canAfford && "grayscale opacity-50"
                  )}
                >
                  {it.emoji}
                </div>
                <div className="text-xs font-semibold truncate">{it.name}</div>
                <div className="text-[10px] text-muted-foreground">{it.kind}</div>
                <div className="mt-1.5 flex items-center justify-center gap-1 text-xs">
                  {owned ? (
                    <span className="inline-flex items-center gap-1 text-primary font-semibold">
                      <Check className="w-3 h-3" /> Owned
                    </span>
                  ) : (
                    <span className={cn(
                      "inline-flex items-center gap-1 font-semibold",
                      canAfford ? "text-warning" : "text-muted-foreground"
                    )}>
                      <Sparkles className="w-3 h-3 text-warning" /> {it.cost}
                    </span>
                  )}
                </div>
                {!owned && !canAfford && (
                  <Lock className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {!user.isPro && (
        <Link
          to="/upgrade"
          className="block rounded-3xl p-5 border border-warning/30 bg-gradient-to-br from-warning/10 to-accent/10 shadow-soft transition-bounce hover:scale-[1.02]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-warning/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Unlock Sprout Pro</p>
              <p className="text-xs text-muted-foreground">
                AI coaching, exclusive skins & insights
              </p>
            </div>
            <span className="text-xs font-bold text-warning">→</span>
          </div>
        </Link>
      )}
    </div>
  );
};

export default CharacterPage;