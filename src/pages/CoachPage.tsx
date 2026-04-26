import { useState } from "react";
import { useApp } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Sparkles, Lightbulb, Crown, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentStreak, getLongestStreak, isHabitScheduled, isCompletedOn } from "@/lib/habits";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "suggestions" | "insights";

interface Item {
  title: string;
  body: string;
  emoji: string;
}

const summarize = (habits: ReturnType<typeof useApp>["habits"]) => {
  const today = new Date();
  return habits.map((h) => {
    let scheduledLast14 = 0;
    let recentCompletions = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (isHabitScheduled(h, d)) {
        scheduledLast14++;
        if (isCompletedOn(h, d)) recentCompletions++;
      }
    }
    return {
      name: h.name,
      emoji: h.emoji,
      days: h.days,
      currentStreak: getCurrentStreak(h),
      longestStreak: getLongestStreak(h),
      recentCompletions,
      scheduledLast14,
    };
  });
};

const CoachPage = () => {
  const { habits, user } = useApp();
  const [mode, setMode] = useState<Mode>("insights");
  const [goal, setGoal] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setItems([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { mode, habits: summarize(habits), goal: goal.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setItems(data?.items ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error("AI coach unavailable", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!user.isPro) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">AI Coach</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalized habit suggestions & insights
          </p>
        </header>
        <div className="rounded-3xl p-8 border-2 border-dashed border-warning/40 bg-gradient-to-br from-warning/5 to-accent/5 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-warning/20 flex items-center justify-center mb-3">
            <Crown className="w-8 h-8 text-warning" />
          </div>
          <h2 className="font-bold text-lg">Pro feature</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Upgrade to Sprout Pro to unlock AI habit coaching and personalized insights.
          </p>
          <Button asChild size="lg" className="rounded-2xl gradient-primary shadow-glow">
            <Link to="/upgrade">
              <Sparkles className="w-4 h-4 mr-2" /> Unlock Pro
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">AI Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Powered by Google Gemini
        </p>
      </header>

      <div className="bg-card border border-border rounded-3xl p-1.5 shadow-soft flex gap-1">
        {[
          { key: "insights" as Mode, label: "Insights", icon: Lightbulb },
          { key: "suggestions" as Mode, label: "Suggestions", icon: Brain },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-sm font-medium transition-smooth",
              mode === t.key
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {mode === "suggestions" && (
        <div className="space-y-2">
          <label htmlFor="goal" className="text-sm font-medium">
            Your goal (optional)
          </label>
          <Input
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Get fit, sleep better, read more"
            className="rounded-2xl"
          />
        </div>
      )}

      <Button
        onClick={run}
        disabled={loading}
        size="lg"
        className="w-full rounded-2xl gradient-primary shadow-glow"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Thinking…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            {mode === "insights" ? "Analyze my habits" : "Suggest new habits"}
          </>
        )}
      </Button>

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 shadow-soft animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{it.emoji}</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{it.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{it.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && !loading && (
        <p className="text-xs text-center text-muted-foreground">
          Tap the button to get personalized {mode === "insights" ? "insights" : "suggestions"} based on your habits.
        </p>
      )}
    </div>
  );
};

export default CoachPage;