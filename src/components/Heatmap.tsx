import { Habit } from "@/lib/types";
import { isCompletedOn, isHabitScheduled, toDateKey } from "@/lib/habits";
import { cn } from "@/lib/utils";

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS  = ["S","M","T","W","T","F","S"];

interface DayCell {
  date: Date;
  intensity: number;
  future: boolean;
}

const cellColor = (intensity: number, future: boolean): string => {
  if (future)        return "bg-secondary/30";
  if (intensity === 0) return "bg-secondary";
  if (intensity < 0.34) return "bg-primary/25";
  if (intensity < 0.67) return "bg-primary/55";
  return "bg-primary";
};

export const Heatmap = ({ habits, weeks = 16 }: { habits: Habit[]; weeks?: number }) => {
  const today = new Date();

  // Start on the Sunday of the week (weeks-1) ago so today's week is always the last column
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (weeks - 1) * 7);

  const todayKey = toDateKey(today);

  // Build flat array of cells, grouped into columns (weeks)
  const columns: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      let scheduled = 0, done = 0;
      for (const h of habits) {
        if (isHabitScheduled(h, date)) {
          scheduled++;
          if (isCompletedOn(h, date)) done++;
        }
      }
      const intensity = scheduled === 0 ? 0 : done / scheduled;
      col.push({ date, intensity, future: toDateKey(date) > todayKey });
    }
    columns.push(col);
  }

  // Determine which columns get a month label (first column of a new month)
  const monthLabels: (string | null)[] = columns.map((col, wi) => {
    const firstOfMonth = col.find((c) => c.date.getDate() === 1);
    if (firstOfMonth) return MONTH_SHORT[firstOfMonth.date.getMonth()];
    // Also label the very first column
    if (wi === 0) return MONTH_SHORT[col[0].date.getMonth()];
    return null;
  });

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex gap-1.5 w-max">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="h-4" /> {/* spacer for month row */}
          {DAY_LABELS.map((l, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 text-[9px] text-muted-foreground flex items-center justify-center"
            >
              {/* show only M, W, F to avoid clutter */}
              {i === 1 || i === 3 || i === 5 ? l : ""}
            </div>
          ))}
        </div>

        {/* Week columns */}
        {columns.map((col, wi) => (
          <div key={wi} className="flex flex-col gap-1.5">
            {/* Month label */}
            <div className="h-4 flex items-center">
              {monthLabels[wi] && (
                <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">
                  {monthLabels[wi]}
                </span>
              )}
            </div>
            {/* Day cells */}
            {col.map((cell) => (
              <div
                key={toDateKey(cell.date)}
                title={`${formatDate(cell.date)}  ${cell.future ? "" : `— ${Math.round(cell.intensity * 100)}% complete`}`}
                className={cn(
                  "w-3.5 h-3.5 rounded-sm transition-smooth cursor-default",
                  cellColor(cell.intensity, cell.future)
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
