import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp, FREE_HABIT_LIMIT } from "@/hooks/useAppState";
import { Habit, WeekDay } from "@/lib/types";
import { WEEKDAY_SHORT } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { Plus, Crown, Tv2 } from "lucide-react";
import { Link } from "react-router-dom";

const EMOJIS = ["💪", "📚", "🧘", "💧", "🏃", "🎨", "🎵", "✍️", "🌱", "☀️", "🍎", "😴"];
const COLORS: { id: string; cls: string }[] = [
  { id: "primary", cls: "bg-primary" },
  { id: "accent", cls: "bg-accent" },
  { id: "success", cls: "bg-success" },
  { id: "warning", cls: "bg-warning" },
];

interface Props {
  trigger?: React.ReactNode;
  initialHabit?: Habit;       // provided → edit mode
  open?: boolean;             // controlled mode
  onOpenChange?: (v: boolean) => void;
}

export const CreateHabitDialog = ({ trigger, initialHabit, open: controlledOpen, onOpenChange }: Props) => {
  const { addHabit, addTempHabit, updateHabit, watchAd, habits, user } = useApp();
  const isEdit = !!initialHabit;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    onOpenChange ? onOpenChange(v) : setInternalOpen(v);
  };

  const [name, setName] = useState(initialHabit?.name ?? "");
  const [emoji, setEmoji] = useState(initialHabit?.emoji ?? "🌱");
  const [color, setColor] = useState(initialHabit?.color ?? "primary");
  const [days, setDays] = useState<WeekDay[]>(initialHabit?.days ?? [1, 2, 3, 4, 5]);
  const [reminderTime, setReminderTime] = useState(initialHabit?.reminderTime ?? "");
  const [adWatching, setAdWatching] = useState(false);

  // Sync fields when editing a different habit
  useEffect(() => {
    if (initialHabit) {
      setName(initialHabit.name);
      setEmoji(initialHabit.emoji);
      setColor(initialHabit.color);
      setDays(initialHabit.days);
      setReminderTime(initialHabit.reminderTime ?? "");
    }
  }, [initialHabit?.id]);

  const permanentCount = habits.filter((h) => !h.expiresAt).length;
  const atLimit = !user.isPro && permanentCount >= FREE_HABIT_LIMIT && !isEdit;

  const toggleDay = (d: WeekDay) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const reset = () => {
    if (!isEdit) {
      setName(""); setEmoji("🌱"); setColor("primary"); setDays([1, 2, 3, 4, 5]); setReminderTime("");
    }
  };

  const submit = () => {
    if (!name.trim() || days.length === 0) return;
    const payload = { name: name.trim(), emoji, color, days, reminderTime: reminderTime || undefined };
    if (isEdit) {
      updateHabit(initialHabit!.id, payload);
    } else {
      addHabit(payload);
    }
    reset();
    setOpen(false);
  };

  const handleWatchAdForTemp = async () => {
    if (!name.trim() || days.length === 0) return;
    setAdWatching(true);
    await new Promise((r) => setTimeout(r, 3000)); // simulate ad
    watchAd();
    addTempHabit({ name: name.trim(), emoji, color, days, reminderTime: reminderTime || undefined });
    setAdWatching(false);
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="lg" className="rounded-full shadow-glow">
            <Plus className="w-5 h-5 mr-1" /> New habit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="rounded-3xl max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit habit" : "Create a habit"}</DialogTitle>
        </DialogHeader>

        {/* ── Limit gate (create mode only) ── */}
        {atLimit ? (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-1">
              <div className="text-3xl">🌿</div>
              <p className="font-semibold">You've reached {FREE_HABIT_LIMIT} habits</p>
              <p className="text-sm text-muted-foreground">
                Free accounts support {FREE_HABIT_LIMIT} permanent habits.
              </p>
            </div>

            {/* Still let them fill in the name so they can watch ad */}
            <div>
              <Label htmlFor="limit-name">Habit name</Label>
              <Input
                id="limit-name"
                placeholder="e.g. Morning workout"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 rounded-2xl"
              />
            </div>
            <div>
              <Label>Days</Label>
              <div className="flex justify-between gap-1 mt-1.5">
                {WEEKDAY_SHORT.map((label, i) => {
                  const d = i as WeekDay;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-sm font-semibold transition-bounce",
                        days.includes(d)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleWatchAdForTemp}
              disabled={adWatching || !name.trim() || days.length === 0}
              className="w-full rounded-2xl"
              variant="outline"
            >
              <Tv2 className="w-4 h-4 mr-2" />
              {adWatching ? "Watching ad…" : "Watch Ad — add for today only"}
            </Button>
            <Button asChild className="w-full rounded-2xl gradient-primary shadow-glow">
              <Link to="/upgrade">
                <Crown className="w-4 h-4 mr-2" /> Upgrade to Pro — unlimited habits
              </Link>
            </Button>
          </div>
        ) : (
          /* ── Normal form ── */
          <div className="space-y-5">
            {!user.isPro && !isEdit && (
              <p className="text-xs text-muted-foreground text-center">
                {permanentCount}/{FREE_HABIT_LIMIT} habit slots used
              </p>
            )}
            <div>
              <Label htmlFor="habit-name">Name</Label>
              <Input
                id="habit-name"
                placeholder="e.g. Morning workout"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 rounded-2xl"
              />
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="grid grid-cols-6 gap-2 mt-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "aspect-square rounded-xl text-xl flex items-center justify-center transition-bounce border",
                      emoji === e
                        ? "bg-primary/10 border-primary scale-110"
                        : "bg-secondary border-transparent hover:scale-105"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-3 mt-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={cn(
                      "w-10 h-10 rounded-full transition-bounce",
                      c.cls,
                      color === c.id ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                    )}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Days</Label>
              <div className="flex justify-between gap-1 mt-1.5">
                {WEEKDAY_SHORT.map((label, i) => {
                  const d = i as WeekDay;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={cn(
                        "flex-1 h-11 rounded-xl text-sm font-semibold transition-bounce",
                        days.includes(d)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="reminder-time">
                Daily reminder <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="mt-1.5 rounded-2xl w-36"
              />
            </div>
            <Button
              onClick={submit}
              disabled={!name.trim() || days.length === 0}
              className="w-full rounded-2xl"
              size="lg"
            >
              {isEdit ? "Save changes" : "Create habit"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
