import { useState } from "react";
import { useApp } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ChevronRight, Check } from "lucide-react";
import mascot from "@/assets/mascot.png";

const GOALS = [
  { id: "fitness", label: "Health & Fitness", emoji: "💪" },
  { id: "learning", label: "Learning & Growth", emoji: "📚" },
  { id: "mindfulness", label: "Mindfulness", emoji: "🧘" },
  { id: "productivity", label: "Productivity", emoji: "🎯" },
  { id: "lifestyle", label: "Lifestyle", emoji: "🌿" },
];

const STARTER_HABITS: Record<string, Array<{ name: string; emoji: string; color: string }>> = {
  fitness: [
    { name: "Morning run", emoji: "🏃", color: "success" },
    { name: "Drink water", emoji: "💧", color: "primary" },
    { name: "Sleep 8 hours", emoji: "😴", color: "accent" },
    { name: "Eat vegetables", emoji: "🥗", color: "success" },
    { name: "Workout", emoji: "💪", color: "warning" },
    { name: "10,000 steps", emoji: "🚶", color: "primary" },
  ],
  learning: [
    { name: "Read 20 min", emoji: "📖", color: "primary" },
    { name: "Podcast", emoji: "🎧", color: "accent" },
    { name: "Journal", emoji: "✍️", color: "warning" },
    { name: "Learn new thing", emoji: "🧩", color: "success" },
    { name: "Practice skill", emoji: "💻", color: "primary" },
    { name: "Take notes", emoji: "📝", color: "accent" },
  ],
  mindfulness: [
    { name: "Meditate", emoji: "🧘", color: "accent" },
    { name: "Gratitude", emoji: "🙏", color: "primary" },
    { name: "Deep breathing", emoji: "🌬️", color: "success" },
    { name: "Morning reflect", emoji: "🌅", color: "warning" },
    { name: "Evening wind-down", emoji: "🌙", color: "accent" },
    { name: "No phone in bed", emoji: "📵", color: "primary" },
  ],
  productivity: [
    { name: "Plan my day", emoji: "📋", color: "primary" },
    { name: "Clear inbox", emoji: "✅", color: "success" },
    { name: "Focus session", emoji: "🎯", color: "warning" },
    { name: "Review goals", emoji: "📊", color: "accent" },
    { name: "Declutter", emoji: "🗑️", color: "primary" },
    { name: "No social media AM", emoji: "🔕", color: "success" },
  ],
  lifestyle: [
    { name: "Go outside", emoji: "🌿", color: "success" },
    { name: "Family time", emoji: "👨‍👩‍👧", color: "primary" },
    { name: "Creative hobby", emoji: "🎨", color: "accent" },
    { name: "Tidy space", emoji: "🧹", color: "warning" },
    { name: "Cook healthy", emoji: "🍳", color: "success" },
    { name: "Gratitude", emoji: "😊", color: "primary" },
  ],
};

export const OnboardingFlow = () => {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [characterName, setCharacterName] = useState("Sprout");
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");

  const goalHabits = STARTER_HABITS[selectedGoal] ?? STARTER_HABITS.fitness;

  const toggleHabit = (name: string) => {
    setSelectedHabits((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < 3) {
        next.add(name);
      }
      return next;
    });
  };

  const handleFinish = () => {
    completeOnboarding({
      displayName: displayName.trim() || "Friend",
      characterName: characterName.trim() || "Sprout",
      goal: selectedGoal,
      starterHabits: goalHabits.filter((h) => selectedHabits.has(h.name)),
      reminderEnabled,
      reminderTime,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Step indicator */}
      <div className="flex justify-center pt-12 pb-2 gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/40" : "w-4 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Scrollable content — max-w-sm keeps it phone-width on all screens */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="w-full max-w-sm mx-auto px-5">

          {/* ── Step 1: Name ── */}
          {step === 1 && (
            <div className="space-y-7 pt-6 animate-slide-up">
              <div className="text-center">
                <img
                  src={mascot}
                  alt="Sprout mascot"
                  className="w-24 h-24 mx-auto mb-4 animate-float drop-shadow-md"
                />
                <h1 className="text-2xl font-bold">Welcome to Sprout! 🌱</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Let's personalize your experience in a few quick steps.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">
                    What should we call you?
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="rounded-2xl h-12 text-base"
                    autoFocus
                    maxLength={30}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium block">
                    Name your Sprout companion
                  </label>
                  <Input
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Sprout"
                    className="rounded-2xl h-12 text-base"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name of your little plant mascot.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Goal ── */}
          {step === 2 && (
            <div className="space-y-5 pt-6 animate-slide-up">
              <div>
                <h1 className="text-2xl font-bold">What's your main focus?</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Pick what matters most to you right now.
                </p>
              </div>
              <div className="space-y-2.5">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-smooth text-left",
                      selectedGoal === g.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card active:bg-secondary"
                    )}
                  >
                    <span className="text-xl w-8 text-center">{g.emoji}</span>
                    <span className="font-medium text-sm flex-1">{g.label}</span>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-smooth",
                      selectedGoal === g.id
                        ? "border-primary bg-primary"
                        : "border-border"
                    )}>
                      {selectedGoal === g.id && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Starter habits (2-column grid) ── */}
          {step === 3 && (
            <div className="space-y-5 pt-6 animate-slide-up">
              <div>
                <h1 className="text-2xl font-bold">Pick starter habits</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Choose up to 3 to kick things off.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {goalHabits.map((h) => {
                  const selected = selectedHabits.has(h.name);
                  const maxed = !selected && selectedHabits.size >= 3;
                  return (
                    <button
                      key={h.name}
                      onClick={() => toggleHabit(h.name)}
                      disabled={maxed}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-smooth text-center",
                        selected
                          ? "border-primary bg-primary/10"
                          : maxed
                          ? "border-border bg-card opacity-40 cursor-not-allowed"
                          : "border-border bg-card active:bg-secondary"
                      )}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <span className="text-3xl">{h.emoji}</span>
                      <span className="text-xs font-medium leading-tight">{h.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {selectedHabits.size === 0
                  ? "Tap to select — you can add more later."
                  : `${selectedHabits.size}/3 selected`}
              </p>
            </div>
          )}

          {/* ── Step 4: Reminder ── */}
          {step === 4 && (
            <div className="space-y-7 pt-6 animate-slide-up">
              <div>
                <h1 className="text-2xl font-bold">Stay on track 🔔</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  A daily nudge helps build lasting habits.
                </p>
              </div>
              <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Daily reminder</p>
                    <p className="text-sm text-muted-foreground">
                      Notification each day
                    </p>
                  </div>
                  <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                </div>
                {reminderEnabled && (
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <label htmlFor="ob-time" className="text-sm text-muted-foreground">
                      Remind me at
                    </label>
                    <Input
                      id="ob-time"
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-32 rounded-xl"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                You can change this anytime in your profile settings.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Bottom nav — same max-w-sm to align with content */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pt-4 pb-8 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex gap-3 w-full max-w-sm mx-auto">
          {step > 1 && (
            <Button
              variant="ghost"
              className="rounded-2xl shrink-0 px-5 h-12"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              className="flex-1 rounded-2xl gradient-primary shadow-glow h-12"
              disabled={
                (step === 1 && displayName.trim().length === 0) ||
                (step === 2 && selectedGoal.length === 0)
              }
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="flex-1 rounded-2xl gradient-primary shadow-glow h-12 text-base font-semibold"
              onClick={handleFinish}
            >
              Let's bloom! 🌸
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
