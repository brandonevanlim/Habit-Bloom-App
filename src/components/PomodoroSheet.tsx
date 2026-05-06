import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { celebrateMilestone } from "@/lib/celebrate";
import { isCompletedOn } from "@/lib/habits";
import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const DURATIONS = [
  { label: "5 min", seconds: 5 * 60 },
  { label: "15 min", seconds: 15 * 60 },
  { label: "25 min", seconds: 25 * 60 },
];

const RADIUS = 72;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  habit: Habit;
  date: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PomodoroSheet = ({ habit, date, open, onOpenChange }: Props) => {
  const { toggleCompletion } = useApp();
  const [durationIdx, setDurationIdx] = useState(2);
  const [timeLeft, setTimeLeft] = useState(DURATIONS[2].seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const duration = DURATIONS[durationIdx].seconds;
  const progress = (duration - timeLeft) / duration;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const alreadyDone = isCompletedOn(habit, date);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  useEffect(() => {
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, durationIdx]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function start() {
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function pause() {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function reset() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setFinished(false);
    setTimeLeft(DURATIONS[durationIdx].seconds);
  }

  function handleComplete() {
    if (!alreadyDone) toggleCompletion(habit.id, date);
    celebrateMilestone();
    toast.success(`${habit.emoji} ${habit.name} marked complete!`);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-10 pt-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-center text-base">
            {habit.emoji} {habit.name}
          </SheetTitle>
        </SheetHeader>

        {/* Duration selector */}
        <div className="flex justify-center gap-2 mb-8">
          {DURATIONS.map((d, i) => (
            <button
              key={d.label}
              disabled={isRunning}
              onClick={() => setDurationIdx(i)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-smooth disabled:opacity-40",
                durationIdx === i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Circular timer */}
        <div className="flex justify-center mb-8">
          <div className="relative w-44 h-44">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80" cy="80" r={RADIUS}
                fill="none" strokeWidth="8"
                stroke="currentColor"
                className="text-muted/30"
              />
              <circle
                cx="80" cy="80" r={RADIUS}
                fill="none" strokeWidth="8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  "transition-all duration-1000",
                  finished ? "text-success" : "text-primary"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {finished ? (
                <Check className="w-10 h-10 text-success" strokeWidth={3} />
              ) : (
                <span className="text-3xl font-bold tabular-nums">{mins}:{secs}</span>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={reset} className="rounded-full w-12 h-12">
            <RotateCcw className="w-5 h-5" />
          </Button>

          {finished ? (
            <Button
              size="lg"
              onClick={handleComplete}
              className="rounded-full px-8 gap-2 bg-success hover:bg-success/90 text-success-foreground"
            >
              <Check className="w-4 h-4" />
              {alreadyDone ? "Done!" : "Mark Complete"}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={isRunning ? pause : start}
              className="rounded-full px-8 gap-2"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Pause" : "Start"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
