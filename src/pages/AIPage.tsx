import { useState, useRef, useEffect } from "react";
import { useApp } from "@/hooks/useAppState";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Sparkles, Crown, Loader2, Send, Bot, MessageCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentStreak, getLongestStreak, isHabitScheduled, isCompletedOn } from "@/lib/habits";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CoachPanel } from "@/components/CoachPanel";

type Tab = "chat" | "coach";
interface ChatMessage { role: "user" | "assistant"; content: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const summarizeHabits = (habits: ReturnType<typeof useApp>["habits"]) => {
  const today = new Date();
  return habits.map((h) => {
    let scheduledLast14 = 0, recentCompletions = 0;
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

const chatKey = (uid: string) => `sprout_chat_${uid}`;

const loadHistory = (uid: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(chatKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveHistory = (uid: string, msgs: ChatMessage[]) =>
  localStorage.setItem(chatKey(uid), JSON.stringify(msgs.slice(-60)));

// ─── Sub-components ───────────────────────────────────────────────────────────

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

const ProGate = () => (
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
);

// ─── Chat tab ─────────────────────────────────────────────────────────────────

const ChatTab = () => {
  const { habits, user } = useApp();
  const { user: authUser } = useAuth();
  const uid = authUser?.id ?? "";

  const welcome: ChatMessage = {
    role: "assistant",
    content: `Hey ${user.displayName || "there"}! 👋 I'm Sprout AI, your personal habit coach. Ask me anything about your habits, streaks, or how to improve your routine!`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const history = uid ? loadHistory(uid) : [];
    return history.length > 0 ? history : [welcome];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (uid) saveHistory(uid, messages);
  }, [messages, uid]);

  const CHIPS = [
    "📊 How am I doing overall?",
    "😤 Why do I keep missing habits?",
    "🗓 Help me plan this week",
    "💡 Suggest a new habit for me",
  ];

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!override) setInput("");
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setMessages([welcome]);
    if (uid) localStorage.removeItem(chatKey(uid));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
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

      {/* Suggestion chips — shown only on a fresh chat */}
      {messages.length <= 1 && !loading && (
        <div className="shrink-0 flex flex-wrap gap-2 pt-2 pb-1">
          {CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => send(chip)}
              className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 hover:bg-primary/20 transition-smooth"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="shrink-0 pt-3 flex gap-2 items-center">
        <button
          onClick={clearChat}
          title="Clear chat"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

// ─── Coach tab ────────────────────────────────────────────────────────────────

const CoachTab = () => <CoachPanel />;

// ─── Main page ────────────────────────────────────────────────────────────────

const AIPage = () => {
  const { user } = useApp();
  const [tab, setTab] = useState<Tab>("chat");

  return (
    // Fill exactly the content area between top padding and nav bar
    <div className="flex flex-col" style={{ height: "calc(100dvh - 8rem)" }}>
      <header className="shrink-0 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">AI</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your personal Sprout coach</p>
      </header>

      <div className="shrink-0 mb-4 bg-card border border-border rounded-3xl p-1.5 shadow-soft flex gap-1">
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

      {/* Content fills remaining height */}
      <div className="flex-1 min-h-0">
        {!user.isPro ? (
          <div className="overflow-y-auto h-full">
            <ProGate />
          </div>
        ) : tab === "chat" ? (
          <ChatTab />
        ) : (
          <div className="overflow-y-auto h-full">
            <CoachTab />
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPage;
