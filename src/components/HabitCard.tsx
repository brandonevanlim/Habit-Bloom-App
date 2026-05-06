import { useState } from "react";
import { Check, Pencil, Timer } from "lucide-react";
import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isCompletedOn } from "@/lib/habits";
import { useApp } from "@/hooks/useAppState";
import { CreateHabitDialog } from "./CreateHabitDialog";
import { PomodoroSheet } from "./PomodoroSheet";

const colorMap: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
};

export const HabitCard = ({ habit, date }: { habit: Habit; date: Date }) => {
  const { toggleCompletion } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const done = isCompletedOn(habit, date);
  const isTemp = !!habit.expiresAt;

  return (
    <>
      <div
        className={cn(
          "w-full bg-card border border-border rounded-3xl p-4 flex items-center gap-3 transition-bounce shadow-soft hover:-translate-y-0.5",
          done && "bg-secondary",
          isTemp && "border-warning/40"
        )}
      >
        {/* Emoji + text — tap to toggle */}
        <div
          role="button"
          onClick={() => toggleCompletion(habit.id, date)}
          className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
        >
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-bounce",
              colorMap[habit.color] ?? colorMap.primary,
              done && "scale-90 opacity-70"
            )}
          >
            {habit.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn("font-semibold truncate text-sm", done && "line-through text-muted-foreground")}>
              {habit.name}
            </div>
            {isTemp && (
              <div className="mt-0.5">
                <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
                  Today only
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Timer button */}
        <button
          onClick={(e) => { e.stopPropagation(); setTimerOpen(true); }}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground shrink-0 transition-smooth"
          aria-label="Start Pomodoro timer"
        >
          <Timer className="w-3.5 h-3.5" />
        </button>

        {/* Edit button */}
        <button
          onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground shrink-0 transition-smooth"
          aria-label="Edit habit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {/* Check circle — tap to toggle */}
        <div
          role="button"
          onClick={() => toggleCompletion(habit.id, date)}
          className={cn(
            "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-bounce",
            done
              ? "bg-success border-success text-success-foreground animate-bounce-in"
              : "border-border hover:border-primary"
          )}
        >
          {done && <Check className="w-4 h-4" strokeWidth={3} />}
        </div>
      </div>

      <CreateHabitDialog
        initialHabit={habit}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <PomodoroSheet
        habit={habit}
        date={date}
        open={timerOpen}
        onOpenChange={setTimerOpen}
      />
    </>
  );
};
