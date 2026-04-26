import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Flame, Trophy, CalendarDays, Loader2, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Row = ({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) => (
  <div className="space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
    {checked && children && <div className="pl-8">{children}</div>}
  </div>
);

const NotificationsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { prefs, update, loading, saving } = useNotificationPrefs();

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        </header>
        <div className="bg-card border border-border rounded-3xl p-8 text-center shadow-soft">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold mb-1">Sign in to manage notifications</p>
          <p className="text-sm text-muted-foreground mb-4">
            Your preferences will sync across all your devices.
          </p>
          <Button asChild>
            <Link to="/auth">
              <LogIn className="w-4 h-4 mr-2" /> Sign in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Saved to your account · synced everywhere
          </p>
        </div>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <section className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-5">
          <Row
            icon={Bell}
            title="Daily reminder"
            description="A nudge for habits still pending today"
            checked={prefs.daily_reminder_enabled}
            onChange={(v) => update({ daily_reminder_enabled: v })}
          >
            <div className="flex items-center justify-between">
              <label htmlFor="daily-time" className="text-sm text-muted-foreground">
                Time
              </label>
              <Input
                id="daily-time"
                type="time"
                value={prefs.daily_reminder_time}
                onChange={(e) => update({ daily_reminder_time: e.target.value })}
                className="w-32 rounded-xl"
              />
            </div>
          </Row>

          <div className="border-t border-border" />

          <Row
            icon={Flame}
            title="Streak warnings"
            description="Alert when you're about to lose a streak"
            checked={prefs.streak_warnings_enabled}
            onChange={(v) => update({ streak_warnings_enabled: v })}
          />

          <div className="border-t border-border" />

          <Row
            icon={Trophy}
            title="Milestone alerts"
            description="Celebrate streak milestones (7, 14, 30+ days)"
            checked={prefs.milestone_alerts_enabled}
            onChange={(v) => update({ milestone_alerts_enabled: v })}
          />

          <div className="border-t border-border" />

          <Row
            icon={CalendarDays}
            title="Weekly summary"
            description="Recap of last week's progress"
            checked={prefs.weekly_summary_enabled}
            onChange={(v) => update({ weekly_summary_enabled: v })}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Day</span>
              <div className="flex gap-1">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => update({ weekly_summary_day: i })}
                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-smooth ${
                      prefs.weekly_summary_day === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </Row>
        </section>
      )}

      <div className="text-xs text-muted-foreground text-center px-4">
        On Android, tap "Allow notifications" when prompted. In a browser, your
        OS may also need notification permission for this site.
      </div>
    </div>
  );
};

export default NotificationsPage;
