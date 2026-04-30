import { useApp } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Trash2, Bell, Sparkles, Sun, Moon, Monitor, Crown, Brain, LogIn, LogOut, ChevronRight } from "lucide-react";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import { WEEKDAY_SHORT } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ProfilePage = () => {
  const { habits, user, deleteHabit, setReminder, setTheme } = useApp();
  const { user: authUser, signOut } = useAuth();
  const reminderEnabled = !!user.reminders?.enabled;
  const reminderTime = user.reminders?.time ?? "09:00";
  const theme = user.theme ?? "system";

  const themeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      </header>

      <div className="bg-card border border-border rounded-3xl p-5 shadow-soft flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-2xl shadow-glow">
          🌿
        </div>
        <div className="flex-1">
          <p className="font-semibold flex items-center gap-1.5">
            {user.displayName || (authUser?.email ? authUser.email.split("@")[0] : "Hello, friend")}
            {user.isPro && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full font-bold">
                <Crown className="w-2.5 h-2.5" /> PRO
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {habits.length} habit{habits.length === 1 ? "" : "s"} · {user.coins} coins
          </p>
        </div>
      </div>

      {/* Friend Code */}
      {user.friendCode && (
        <div className="bg-card border border-border rounded-2xl px-4 py-4 shadow-soft">
          <p className="text-xs text-muted-foreground mb-1">Your friend code</p>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-2xl tracking-[0.2em] text-primary">
              {user.friendCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(user.friendCode!);
                toast.success("Copied to clipboard!");
              }}
              className="ml-auto text-xs font-semibold text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-smooth"
            >
              Copy
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Share this with friends so they can find you in the Friends tab.
          </p>
        </div>
      )}

      {/* Character shop shortcut */}
      <Link
        to="/character"
        className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 shadow-soft hover:border-primary/30 transition-smooth"
      >
        <span className="text-2xl">🌿</span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Character Shop</p>
          <p className="text-xs text-muted-foreground">Spend coins on pets & themes</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      {/* Pro banner */}
      {!user.isPro ? (
        <Link
          to="/upgrade"
          className="block rounded-3xl p-5 border border-warning/30 bg-gradient-to-br from-warning/10 to-accent/10 shadow-soft transition-bounce hover:scale-[1.02]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-warning/20 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Try Sprout Pro free</p>
              <p className="text-xs text-muted-foreground">
                AI coaching, insights & exclusive themes
              </p>
            </div>
            <span className="text-xs font-bold text-warning">→</span>
          </div>
        </Link>
      ) : (
        <Link
          to="/ai"
          className="block rounded-3xl p-5 gradient-primary text-primary-foreground shadow-glow transition-bounce hover:scale-[1.02]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Open AI Coach</p>
              <p className="text-xs opacity-90">Get personalized tips & suggestions</p>
            </div>
            <span className="text-sm font-bold">→</span>
          </div>
        </Link>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">All habits</h2>
          <CreateHabitDialog
            trigger={
              <Button size="sm" variant="ghost" className="rounded-full">
                + New
              </Button>
            }
          />
        </div>
        {habits.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No habits yet.
          </p>
        ) : (
          <div className="space-y-2">
            {habits.map((h) => (
              <div
                key={h.id}
                className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-soft"
              >
                <div className="text-2xl">{h.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{h.name}</div>
                  <div className="flex gap-0.5 mt-1">
                    {WEEKDAY_SHORT.map((l, i) => (
                      <span
                        key={i}
                        className={cn(
                          "w-4 h-4 rounded text-[9px] flex items-center justify-center font-semibold",
                          h.days.includes(i as 0)
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteHabit(h.id)}
                  className="text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-secondary transition-smooth"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
        <h2 className="font-semibold">Settings</h2>

        {/* Theme picker */}
        <div className="space-y-2">
          <p className="font-medium text-sm">Appearance</p>
          <div className="bg-secondary rounded-2xl p-1 flex gap-1">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-smooth",
                  theme === opt.value
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <opt.icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Daily reminder</p>
                <p className="text-xs text-muted-foreground">
                  Browser notification for pending habits
                </p>
              </div>
            </div>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={(v) => setReminder(v, reminderTime)}
            />
          </div>
          {reminderEnabled && (
            <div className="flex items-center justify-between pl-8">
              <label htmlFor="reminder-time" className="text-sm text-muted-foreground">
                Time
              </label>
              <Input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminder(true, e.target.value)}
                className="w-32 rounded-xl"
              />
            </div>
          )}
        </div>

        <Link
          to="/upgrade"
          className="flex items-center justify-between -mx-2 px-2 py-2 rounded-xl hover:bg-secondary transition-smooth"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-warning" />
            <div>
              <p className="font-medium text-sm">Subscription</p>
              <p className="text-xs text-muted-foreground">
                {user.isPro ? "Manage your Pro plan" : "Upgrade to Pro"}
              </p>
            </div>
          </div>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full font-semibold",
            user.isPro
              ? "bg-primary/15 text-primary"
              : "bg-warning/15 text-warning"
          )}>
            {user.isPro ? "ACTIVE" : "PRO"}
          </span>
        </Link>

        <Link
          to="/notifications"
          className="flex items-center justify-between -mx-2 px-2 py-2 rounded-xl hover:bg-secondary transition-smooth"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Notification preferences</p>
              <p className="text-xs text-muted-foreground">
                {authUser ? "Synced to your account" : "Sign in to sync"}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        {authUser ? (
          <button
            onClick={async () => {
              await signOut();
              toast.success("Signed out");
            }}
            className="flex items-center justify-between w-full -mx-2 px-2 py-2 rounded-xl hover:bg-secondary transition-smooth text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Sign out</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {authUser.email}
                </p>
              </div>
            </div>
          </button>
        ) : (
          <Link
            to="/auth"
            className="flex items-center justify-between -mx-2 px-2 py-2 rounded-xl hover:bg-secondary transition-smooth"
          >
            <div className="flex items-center gap-3">
              <LogIn className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Sign in / Create account</p>
                <p className="text-xs text-muted-foreground">
                  Sync data across devices
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}
      </section>
    </div>
  );
};

export default ProfilePage;