import { useState, useRef, useEffect } from "react";
import { useApp } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Sparkles, Lightbulb, Crown, Loader2, Send, Bot, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentStreak,
  getLongestStreak,
  isHabitScheduled,
  isCompletedOn,
  completionRate,
} from "@/lib/habits";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Shared types ────────────────────────────────────────────────────────────

type Tab = "chat" | "coach";
type CoachMode = "suggestions" | "insights";

interface CoachItem {
  title: string;
  body: string;
  emoji: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const summarizeHabits = (habits: ReturnType<typeof useApp>["habits"]) => {
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

// ─── Typing indicator ────────────────────────────────────────────────────────

const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </div>
);

// ─── Pro gate (shared) ───────────────────────────────────────────────────────

const ProGate = () => (
  <div className="space-y-6">
    <div className="rounded-3xl p-8 border-2 border-dashed border-warning/40 bg-gradient-to-br from-warning/5 to-accent/5 text-center">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-warning/20 flex items-center justify-center mb-3">
        <Crown className="w-8 h-8 text-warning" />
      </div>
      <h2 className="font-bold text-lg">Pro feature</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">
        Upgrade to Sprout Pro to unlock AI habit coaching, insights, and your personal chat coach.
      </p>
      <Button asChild size="lg" className="rounded-2xl gradient-primary shadow-glow">
        <Link to="/upgrade">
          <Sparkles className="w-4 h-4 mr-2" /> Unlock Pro
        </Link>
      </Button>
    </div>
  </div>
);

// ─── Chat tab ────────────────────────────────────────────────────────────────

const ChatTab = () => {
  const { habits, user } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hey ${user.displayName || "there"}! 👋 I'm Sprout AI, your personal habit coach. Ask me anything about your habits, streaks, or how to improve your routine!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          message: text,
          history: messages.slice(-10),
          habits: summarizeHabits(habits),
          userContext: {
            displayName: user.displayName || "Friend",
            characterName: user.characterName,
            goal: user.goal || "",
            coins: user.coins,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "Sorry, I couldn't think of a response." },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Sprout AI unavailable", { description: msg });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 11rem)" }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-2 items-end", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mb-0.5">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border text-foreground rounded-bl-sm"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 flex gap-2 items-center">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your habits…"
          className="rounded-2xl h-11 flex-1 bg-card"
          disabled={loading}
          maxLength={500}
        />
        <Button
          onClick={send}
          disabled={!input.trim() || loading}
          size="icon"
          className="rounded-2xl h-11 w-11 gradient-primary shadow-glow shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

// ─── Coach tab ───────────────────────────────────────────────────────────────

const CoachTab = () => {
  const { habits } = useApp();
  const [mode, setMode] = useState<CoachMode>("insights");
  const [goal, setGoal] = useState("");
  const [items, setItems] = useState<CoachItem[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setItems([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { mode, habits: summarizeHabits(habits), goal: goal.trim() || undefined },
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

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="bg-card border border-border rounded-3xl p-1.5 shadow-soft flex gap-1">
        {([
          { key: "insights" as CoachMode, label: "Insights", icon: Lightbulb },
          { key: "suggestions" as CoachMode, label: "Suggestions", icon: Brain },
        ] as const).map((t) => (
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
          <label htmlFor="coach-goal" className="text-sm font-medium">
            Your goal (optional)
          </label>
          <Input
            id="coach-goal"
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
        <p className="text-xs text-center text-muted-foreground pt-2">
          Tap the button to get personalized{" "}
          {mode === "insights" ? "insights" : "suggestions"} based on your habits.
        </p>
      )}
    </div>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

const AIPage = () => {
  const { user } = useApp();
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">AI</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your personal Sprout coach
        </p>
      </header>

      {/* Tab switcher */}
      <div className="bg-card border border-border rounded-3xl p-1.5 shadow-soft flex gap-1">
        {([
          { key: "chat" as Tab, label: "Chat", icon: MessageCircle },
          { key: "coach" as Tab, label: "Coach", icon: Brain },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-sm font-medium transition-smooth",
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {!user.isPro ? (
        <ProGate />
      ) : tab === "chat" ? (
        <ChatTab />
      ) : (
        <CoachTab />
      )}
    </div>
  );
};

export default AIPage;
