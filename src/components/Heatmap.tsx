import { Habit } from "@/lib/types";
import { isCompletedOn, isHabitScheduled, toDateKey } from "@/lib/habits";
import { cn } from "@/lib/utils";

export const Heatmap = ({ habits, weeks = 14 }: { habits: Habit[]; weeks?: number }) => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - weeks * 7 + 1);
  // align to Sunday
  start.setDate(start.getDate() - start.getDay());

  const days: { date: Date; intensity: number }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    let scheduled = 0;
    let done = 0;
    for (const h of habits) {
      if (isHabitScheduled(h, d)) {
        scheduled++;
        if (isCompletedOn(h, d)) done++;
      }
    }
    const intensity = scheduled === 0 ? 0 : done / scheduled;
    days.push({ date: d, intensity });
  }

  const getClass = (i: number, future: boolean) => {
    if (future) return "bg-secondary/40";
    if (i === 0) return "bg-secondary";
    if (i < 0.34) return "bg-primary/30";
    if (i < 0.67) return "bg-primary/60";
    return "bg-primary";
  };

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
        {days.map((d) => {
          const future = d.date > today;
          return (
            <div
              key={toDateKey(d.date)}
              title={`${toDateKey(d.date)} — ${Math.round(d.intensity * 100)}%`}
              className={cn("w-3.5 h-3.5 rounded-sm transition-smooth", getClass(d.intensity, future))}
            />
          );
        })}
      </div>
    </div>
  );
};