import { useState } from "react";
import { useApp } from "@/hooks/useAppState";
import { habitsForDay, isCompletedOn, toDateKey } from "@/lib/habits";
import { HabitCard } from "@/components/HabitCard";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEK = ["S","M","T","W","T","F","S"];

const CalendarPage = () => {
  const { habits, events, addEvent, deleteEvent } = useApp();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [eventOpen, setEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: Date) => toDateKey(d) === toDateKey(today);
  const isSelected = (d: Date) => toDateKey(d) === toDateKey(selected);

  const dayStat = (d: Date) => {
    const sched = habitsForDay(habits, d);
    if (sched.length === 0) return { state: "none" as const };
    const done = sched.filter((h) => isCompletedOn(h, d)).length;
    if (done === 0) return { state: "missed" as const };
    if (done === sched.length) return { state: "all" as const };
    return { state: "partial" as const };
  };

  const eventsOn = (d: Date) => events.filter((e) => e.date === toDateKey(d));
  const selectedHabits = habitsForDay(habits, selected);
  const selectedEvents = eventsOn(selected);

  const submitEvent = () => {
    if (!eventTitle.trim()) return;
    addEvent({ title: eventTitle.trim(), date: toDateKey(selected) });
    setEventTitle("");
    setEventOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
      </header>

      <div className="bg-card border border-border rounded-3xl p-4 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="font-semibold">
            {MONTHS[month]} {year}
          </div>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEK.map((w, i) => (
            <div key={i} className="text-center text-[11px] font-medium text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const stat = dayStat(d);
            const hasEvent = eventsOn(d).length > 0;
            const sel = isSelected(d);
            return (
              <button
                key={i}
                onClick={() => setSelected(d)}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center text-sm relative transition-bounce",
                  sel
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isToday(d)
                    ? "bg-secondary font-semibold"
                    : "hover:bg-secondary"
                )}
              >
                <span>{d.getDate()}</span>
                <div className="flex gap-0.5 mt-0.5 h-1">
                  {stat.state === "all" && (
                    <span className={cn("w-1 h-1 rounded-full", sel ? "bg-primary-foreground" : "bg-success")} />
                  )}
                  {stat.state === "partial" && (
                    <span className={cn("w-1 h-1 rounded-full", sel ? "bg-primary-foreground" : "bg-warning")} />
                  )}
                  {stat.state === "missed" && d < today && !isToday(d) && (
                    <span className={cn("w-1 h-1 rounded-full", sel ? "bg-primary-foreground/70" : "bg-destructive/70")} />
                  )}
                  {hasEvent && (
                    <span className={cn("w-1 h-1 rounded-full", sel ? "bg-primary-foreground" : "bg-accent")} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            {selected.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </h2>
          <Dialog open={eventOpen} onOpenChange={setEventOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="rounded-full">
                <Plus className="w-4 h-4 mr-1" /> Event
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-sm">
              <DialogHeader>
                <DialogTitle>Add event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ev-title">Title</Label>
                  <Input
                    id="ev-title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. Math exam"
                    className="mt-1.5 rounded-2xl"
                  />
                </div>
                <Button onClick={submitEvent} className="w-full rounded-2xl">
                  Add to {selected.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selectedEvents.length > 0 && (
          <div className="space-y-2 mb-3">
            {selectedEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-soft"
              >
                <div className="w-10 h-10 rounded-xl gradient-warm flex items-center justify-center text-lg">
                  📌
                </div>
                <div className="flex-1 font-medium">{e.title}</div>
                <button
                  onClick={() => deleteEvent(e.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedHabits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No habits scheduled for this day.
          </p>
        ) : (
          <div className="space-y-3">
            {selectedHabits.map((h) => (
              <HabitCard key={h.id} habit={h} date={selected} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CalendarPage;