import { createContext, useContext, useEffect, ReactNode } from "react";
import { useApp } from "./useAppState";

type Theme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const Ctx = createContext<ThemeCtx | null>(null);

const apply = (theme: Theme): "light" | "dark" => {
  const root = document.documentElement;
  const resolved: "light" | "dark" =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  root.classList.toggle("dark", resolved === "dark");
  return resolved;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user, setTheme: persistTheme } = useApp();
  const theme: Theme = user.theme ?? "dark";

  useEffect(() => {
    apply(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const resolvedTheme = apply(theme);

  return (
    <Ctx.Provider value={{ theme, setTheme: persistTheme, resolvedTheme }}>
      {children}
    </Ctx.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};