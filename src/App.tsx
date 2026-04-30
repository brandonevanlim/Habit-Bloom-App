import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import CalendarPage from "./pages/CalendarPage.tsx";
import CharacterPage from "./pages/CharacterPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import UpgradePage from "./pages/UpgradePage.tsx";
import CoachPage from "./pages/CoachPage.tsx";
import AIPage from "./pages/AIPage.tsx";
import FriendsPage from "./pages/FriendsPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import NotificationsPage from "./pages/NotificationsPage.tsx";
import { AppLayout } from "./components/AppLayout.tsx";
import { AppStateProvider } from "./hooks/useAppState.tsx";
import { ThemeProvider } from "./hooks/useTheme.tsx";
import { AuthProvider, useAuth } from "./hooks/useAuth.tsx";
import { CelebrationOverlay } from "./components/CelebrationOverlay.tsx";
import { useApp } from "./hooks/useAppState.tsx";
import { SplashScreen } from "./components/SplashScreen.tsx";
import { OnboardingFlow } from "./components/OnboardingFlow.tsx";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const GlobalCelebration = () => {
  const { unlockEvent, clearUnlockEvent } = useApp();
  return <CelebrationOverlay unlock={unlockEvent} onClose={clearUnlockEvent} />;
};

const OnboardingGate = ({ children }: { children: JSX.Element }) => {
  const { user, syncing } = useApp();
  if (syncing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user.onboardingDone) return <OnboardingFlow />;
  return children;
};

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!session) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <OnboardingGate>{children}</OnboardingGate>;
};

const AppShell = () => {
  const [splashDone, setSplashDone] = useState(false);

  // Skip splash on subsequent loads in the same session
  useEffect(() => {
    if (sessionStorage.getItem("splash_seen") === "1") setSplashDone(true);
  }, []);

  const finishSplash = () => {
    sessionStorage.setItem("splash_seen", "1");
    setSplashDone(true);
  };

  return (
    <>
      {!splashDone && <SplashScreen onDone={finishSplash} />}
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="*"
            element={
              <RequireAuth>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/character" element={<CharacterPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/upgrade" element={<UpgradePage />} />
                    <Route path="/ai" element={<AIPage />} />
                    <Route path="/friends" element={<FriendsPage />} />
                    <Route path="/coach" element={<CoachPage />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </RequireAuth>
            }
          />
        </Routes>
        <GlobalCelebration />
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppStateProvider>
          <ThemeProvider>
            <AppShell />
          </ThemeProvider>
        </AppStateProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
