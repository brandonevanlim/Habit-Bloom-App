import { Check } from "lucide-react";
import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getCurrentStreak, isCompletedOn } from "@/lib/habits";
import { useApp } from "@/hooks/useAppState";
import { Flame } from "lucide-react";

const colorMap: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
};

export const HabitCard = ({ habit, date }: { habit: Habit; date: Date }) => {
  const { toggleCompletion } = useApp();
  const done = isCompletedOn(habit, date);
  const streak = getCurrentStreak(habit);

  return (
    <button
      onClick={() => toggleCompletion(habit.id, date)}
      className={cn(
        "w-full bg-card border border-border rounded-3xl p-4 flex items-center gap-4 transition-bounce shadow-soft hover:-translate-y-0.5",
        done && "bg-secondary"
      )}
    >
      <div
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-bounce",
          colorMap[habit.color] ?? colorMap.primary,
          done && "scale-90 opacity-80"
        )}
      >
        {habit.emoji}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className={cn("font-semibold truncate", done && "line-through text-muted-foreground")}>
          {habit.name}
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Flame className="w-3.5 h-3.5 text-accent" />
            <span>{streak} day streak</span>
          </div>
        )}
      </div>
      <div
        className={cn(
          "w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-bounce",
          done
            ? "bg-success border-success text-success-foreground animate-bounce-in"
            : "border-border"
        )}
      >
        {done && <Check className="w-5 h-5" strokeWidth={3} />}
      </div>
    </button>
  );
};