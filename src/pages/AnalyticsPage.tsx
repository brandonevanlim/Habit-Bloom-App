import { useApp } from "@/hooks/useAppState";
import { Heatmap } from "@/components/Heatmap";
import { completionRate, getCurrentStreak, getDailyStreak, getLongestStreak, isCompletedOn, isHabitScheduled } from "@/lib/habits";
import { Flame, TrendingUp, Target, Calendar } from "lucide-react";

interface WeekRate { label: string; rate: number }

const WeeklyTrend = ({ rates }: { rates: WeekRate[] }) => {
  const n = rates.length;
  const W = 280, H = 90;
  const padX = 8, padT = 14, chartH = 58, labelY = H - 3;
  const step = (W - padX * 2) / n;
  const barW = Math.round(step * 0.55);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      {/* Baseline */}
      <line
        x1={padX} y1={padT + chartH} x2={W - padX} y2={padT + chartH}
        style={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
      />
      {rates.map((r, i) => {
        const cx = padX + i * step + step / 2;
        const barH = Math.max(r.rate === 0 ? 0 : 2, (r.rate / 100) * chartH);
        const barX = cx - barW / 2;
        const barY = padT + chartH - barH;
        const showLabel = i % 2 === 1; // every other week
        return (
          <g key={i}>
            {barH > 0 && (
              <rect
                x={barX} y={barY} width={barW} height={barH} rx={2}
                style={{ fill: "hsl(var(--primary) / 0.75)" }}
              />
            )}
            <text
              x={cx} y={barY - 2} textAnchor="middle" fontSize={6.5}
              style={{ fill: "hsl(var(--primary))", fontWeight: 600 }}
            >
              {r.rate > 0 ? `${r.rate}%` : ""}
            </text>
            {showLabel && (
              <text x={cx} y={labelY} textAnchor="middle" fontSize={6.5}
                style={{ fill: "hsl(var(--muted-foreground))" }}>
                {r.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const AnalyticsPage = () => {
  const { habits, user } = useApp();
  const rate7 = completionRate(habits, 7);
  const rate30 = completionRate(habits, 30);
  const totalCompletions = habits.reduce((s, h) => s + h.completions.length, 0);
  const bestStreak = getDailyStreak(habits, user.streakFreezes ?? []);

  const today = new Date();

  // 8-week completion rates
  const weeklyRates: WeekRate[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    let sched = 0, done = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      if (day > today) break;
      for (const h of habits) {
        if (isHabitScheduled(h, day)) {
          sched++;
          if (isCompletedOn(h, day)) done++;
        }
      }
    }
    weeklyRates.push({
      label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      rate: sched === 0 ? 0 : Math.round((done / sched) * 100),
    });
  }

  // Compute most consistent weekday over last 30 days
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayScheduled = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const wd = d.getDay();
    for (const h of habits) {
      if (isHabitScheduled(h, d)) {
        dayScheduled[wd]++;
        if (isCompletedOn(h, d)) dayCounts[wd]++;
      }
    }
  }
  const dayRates = dayCounts.map((c, i) => (dayScheduled[i] === 0 ? 0 : c / dayScheduled[i]));
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const bestDay = dayRates.indexOf(Math.max(...dayRates));
  const worstDay = dayRates.indexOf(Math.min(...dayRates.filter((r, i) => dayScheduled[i] > 0).length ? dayRates.map((r, i) => dayScheduled[i] === 0 ? Infinity : r) : dayRates));

  const stats = [
    { label: "7-day rate", value: `${rate7}%`, icon: Target, color: "text-primary" },
    { label: "30-day rate", value: `${rate30}%`, icon: TrendingUp, color: "text-success" },
    { label: "Streak", value: bestStreak, icon: Flame, color: "text-accent" },
    { label: "Total done", value: totalCompletions, icon: Calendar, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your progress over time</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div className="text-2xl font-bold mt-2">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="bg-card border border-border rounded-3xl p-5 shadow-soft">
        <h2 className="font-semibold mb-1">Weekly trend</h2>
        <p className="text-xs text-muted-foreground mb-3">Completion rate per week (last 8 weeks)</p>
        {habits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Add habits to see your trend.</p>
        ) : (
          <WeeklyTrend rates={weeklyRates} />
        )}
      </section>

      <section className="bg-card border border-border rounded-3xl p-5 shadow-soft">
        <h2 className="font-semibold mb-3">Activity heatmap</h2>
        {habits.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Add habits to see your activity.
          </p>
        ) : (
          <Heatmap habits={habits} />
        )}
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm bg-secondary" />
          <span className="w-3 h-3 rounded-sm bg-primary/30" />
          <span className="w-3 h-3 rounded-sm bg-primary/60" />
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </section>

      <section className="bg-card border border-border rounded-3xl p-5 shadow-soft">
        <h2 className="font-semibold mb-3">Per-habit streaks</h2>
        {habits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No habits yet.</p>
        ) : (
          <div className="space-y-3">
            {habits.map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <div className="text-2xl">{h.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{h.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Best: {getLongestStreak(h)} · Now: {getCurrentStreak(h)}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-accent font-semibold">
                  <Flame className="w-4 h-4" />
                  {getCurrentStreak(h)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {habits.length > 0 && (
        <section className="rounded-3xl gradient-warm p-5 shadow-warm text-accent-foreground">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <p className="font-semibold">Insight</p>
              <p className="text-sm opacity-95 mt-0.5">
                You're most consistent on {dayLabels[bestDay]}s.
                {dayScheduled[worstDay] > 0 && bestDay !== worstDay
                  ? ` Try paying extra attention on ${dayLabels[worstDay]}s.`
                  : ""}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AnalyticsPage;