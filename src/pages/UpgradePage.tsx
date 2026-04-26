import { useApp } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Crown, Check, Sparkles, Brain, BarChart3, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PERKS = [
  { icon: Brain, title: "AI habit coach", desc: "Personalized suggestions based on your goals" },
  { icon: Sparkles, title: "Smart insights", desc: "Patterns like 'You skip workouts after 8 PM'" },
  { icon: BarChart3, title: "Advanced analytics", desc: "Trend graphs, predictions, deeper stats" },
  { icon: Palette, title: "Exclusive skins", desc: "Premium character themes & wardrobe" },
];

const UpgradePage = () => {
  const { user, upgradeToPro, cancelPro } = useApp();
  const navigate = useNavigate();

  if (user.isPro) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Sprout Pro</h1>
        </header>
        <div className="rounded-3xl p-6 gradient-primary text-primary-foreground shadow-glow text-center">
          <Crown className="w-12 h-12 mx-auto mb-2 drop-shadow-md" />
          <h2 className="text-xl font-bold">You're a Pro member ✨</h2>
          <p className="text-sm opacity-90 mt-1">
            Member since {new Date(user.proSince ?? Date.now()).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-3">
          <h3 className="font-semibold">Active perks</h3>
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <p.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className="w-full rounded-2xl"
          onClick={() => {
            cancelPro();
            navigate("/profile");
          }}
        >
          Cancel subscription
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Billing managed locally for now. Connect Stripe or Paddle later to take real payments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-warning/20 flex items-center justify-center mb-3">
          <Crown className="w-8 h-8 text-warning" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sprout Pro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unlock AI coaching and grow faster
        </p>
      </header>

      <div className="rounded-3xl border-2 border-primary p-6 bg-card shadow-glow">
        <div className="flex items-baseline gap-1 justify-center">
          <span className="text-4xl font-bold">$4.99</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-1">
          Cancel anytime · 7-day free trial
        </p>
        <Button
          size="lg"
          className="w-full rounded-2xl mt-4 gradient-primary shadow-glow"
          onClick={() => {
            upgradeToPro();
            navigate("/coach");
          }}
        >
          Start free trial
        </Button>
      </div>

      <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
        <h3 className="font-semibold">What's included</h3>
        {PERKS.map((p) => (
          <div key={p.title} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <p.icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm flex items-center gap-1.5">
                {p.title}
                <Check className="w-3.5 h-3.5 text-success" />
              </p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        By starting your trial you agree to our Terms. You can cancel anytime in Profile.
      </p>
    </div>
  );
};

export default UpgradePage;