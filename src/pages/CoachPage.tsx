import { useApp } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { CoachPanel } from "@/components/CoachPanel";

const CoachPage = () => {
  const { user } = useApp();

  if (!user.isPro) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">AI Coach</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalized insights based on your real habit data</p>
        </header>
        <div className="rounded-3xl p-8 border-2 border-dashed border-warning/40 bg-gradient-to-br from-warning/5 to-accent/5 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-warning/20 flex items-center justify-center mb-3">
            <Crown className="w-8 h-8 text-warning" />
          </div>
          <h2 className="font-bold text-lg">Pro feature</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Upgrade to Sprout Pro to unlock AI habit coaching and personalized insights.
          </p>
          <Button asChild size="lg" className="rounded-2xl gradient-primary shadow-glow">
            <Link to="/upgrade">
              <Sparkles className="w-4 h-4 mr-2" /> Unlock Pro
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">AI Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">Your personal habit analysis</p>
      </header>
      <CoachPanel />
    </div>
  );
};

export default CoachPage;
