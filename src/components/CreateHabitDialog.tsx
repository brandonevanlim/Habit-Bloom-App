import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/hooks/useAppState";
import { WeekDay } from "@/lib/types";
import { WEEKDAY_SHORT } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

const EMOJIS = ["💪", "📚", "🧘", "💧", "🏃", "🎨", "🎵", "✍️", "🌱", "☀️", "🍎", "😴"];
const COLORS: { id: string; cls: string }[] = [
  { id: "primary", cls: "bg-primary" },
  { id: "accent", cls: "bg-accent" },
  { id: "success", cls: "bg-success" },
  { id: "warning", cls: "bg-warning" },
];

export const CreateHabitDialog = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { addHabit } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌱");
  const [color, setColor] = useState("primary");
  const [days, setDays] = useState<WeekDay[]>([1, 2, 3, 4, 5]);

  const toggleDay = (d: WeekDay) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const submit = () => {
    if (!name.trim() || days.length === 0) return;
    addHabit({ name: name.trim(), emoji, color, days });
    setName("");
    setEmoji("🌱");
    setColor("primary");
    setDays([1, 2, 3, 4, 5]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="rounded-full shadow-glow">
            <Plus className="w-5 h-5 mr-1" /> New habit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-3xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Create a habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
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
                const active = days.includes(d);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "flex-1 h-11 rounded-xl text-sm font-semibold transition-bounce",
                      active
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
          <Button onClick={submit} className="w-full rounded-2xl" size="lg">
            Create habit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};