import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Calendar as CalIcon, Sparkles, BarChart3, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/calendar", label: "Calendar", icon: CalIcon },
  { to: "/character", label: "Character", icon: Sparkles },
  { to: "/ai", label: "AI", icon: Bot },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-24 max-w-md mx-auto w-full px-5 pt-8">
        <div key={loc.pathname} className="animate-slide-up">{children}</div>
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-30">
        <div className="max-w-md mx-auto px-3 pb-3">
          <div className="bg-card/95 backdrop-blur-lg border border-border rounded-3xl shadow-soft px-2 py-2 flex items-center justify-between">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center flex-1 py-2 rounded-2xl transition-bounce",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <t.icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 font-medium">{t.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};