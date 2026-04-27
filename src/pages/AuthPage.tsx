import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Mail, Lock, Eye, EyeOff, MailCheck } from "lucide-react";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72);

const AuthPage = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");

  useEffect(() => {
    if (!loading && session) navigate("/", { replace: true });
  }, [session, loading, navigate]);

  const handleEmailAuth = async (mode: "signin" | "signup") => {
    const e = emailSchema.safeParse(email);
    const p = passwordSchema.safeParse(password);
    if (!e.success) return toast.error(e.error.issues[0].message);
    if (!p.success) return toast.error(p.error.issues[0].message);

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: e.data,
          password: p.data,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        setConfirmedEmail(e.data);
        setPendingConfirm(true);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: e.data,
          password: p.data,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("Google sign-in failed", { description: error.message });
      setBusy(false);
    }
    // On success the browser redirects to Google — no-op here
  };

  if (pendingConfirm) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden gradient-sky">
        <div className="relative w-full max-w-md animate-slide-up">
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-3xl p-8 shadow-soft text-center space-y-5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 text-4xl">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Check your Gmail</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a confirmation link to{" "}
                <span className="font-semibold text-foreground">{confirmedEmail}</span>.
                Open your Gmail and click the link to activate your account.
              </p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4 text-left space-y-2 text-xs text-muted-foreground">
              <p>• Check your <span className="font-medium text-foreground">Inbox</span> and <span className="font-medium text-foreground">Spam</span> folders</p>
              <p>• The link expires in 24 hours</p>
              <p>• After confirming, come back and sign in</p>
            </div>
            <Button
              variant="outline"
              onClick={() => { setPendingConfirm(false); setMode("signin"); }}
              className="w-full h-11 rounded-xl"
            >
              Back to Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden gradient-sky">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary-glow/25 blur-3xl animate-float" />
        <div
          className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-accent/20 blur-3xl animate-float"
          style={{ animationDelay: "1.2s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-primary/15 blur-2xl animate-float"
          style={{ animationDelay: "0.6s" }}
        />
      </div>

      <div className="relative w-full max-w-md space-y-6 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow text-3xl animate-bounce-in">
            🌱
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to grow your habits"
                : "Start your journey, one habit at a time"}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-3xl p-6 sm:p-7 shadow-soft">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 mb-5 bg-muted/60 p-1 rounded-full h-11">
              <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Sign up
              </TabsTrigger>
            </TabsList>

            {(["signin", "signup"] as const).map((m) => (
              <TabsContent key={m} value={m} className="space-y-4 mt-0">
                <div className="space-y-1.5">
                  <Label htmlFor={`${m}-email`} className="text-xs font-medium text-muted-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id={`${m}-email`}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      className="pl-10 h-11 rounded-xl bg-background/60"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${m}-pw`} className="text-xs font-medium text-muted-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id={`${m}-pw`}
                      type={showPw ? "text" : "password"}
                      placeholder={m === "signup" ? "At least 8 characters" : "••••••••"}
                      autoComplete={m === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      className="pl-10 pr-10 h-11 rounded-xl bg-background/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={() => handleEmailAuth(m)}
                  disabled={busy}
                  className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-medium shadow-glow hover:opacity-95 transition-smooth"
                >
                  {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {m === "signin" ? "Sign in" : "Create account"}
                </Button>
              </TabsContent>
            ))}
          </Tabs>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">
                or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full h-11 rounded-xl border-border bg-background/60 hover:bg-background transition-smooth"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
