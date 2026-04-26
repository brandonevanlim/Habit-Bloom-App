import { useEffect, useState } from "react";

/**
 * Animated splash screen — a sprout grows from a seed under a soft sky.
 * Pure CSS/SVG, no extra deps. Auto-dismisses after `duration` ms via onDone.
 */
export const SplashScreen = ({
  duration = 2200,
  onDone,
}: {
  duration?: number;
  onDone?: () => void;
}) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), duration - 400);
    const t2 = window.setTimeout(() => onDone?.(), duration);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duration, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden gradient-sky transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden={leaving}
    >
      {/* Soft floating orbs in the background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] left-[12%] w-32 h-32 rounded-full bg-primary-glow/20 blur-3xl animate-float" />
        <div
          className="absolute bottom-[20%] right-[10%] w-40 h-40 rounded-full bg-accent/20 blur-3xl animate-float"
          style={{ animationDelay: "0.8s" }}
        />
        <div
          className="absolute top-[40%] right-[20%] w-24 h-24 rounded-full bg-primary/15 blur-2xl animate-float"
          style={{ animationDelay: "1.4s" }}
        />
      </div>

      {/* Center stage */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Sprout illustration */}
        <div className="relative w-40 h-40 flex items-end justify-center">
          {/* Expanding rings */}
          <span className="absolute inset-0 m-auto w-24 h-24 rounded-full border-2 border-primary/40 animate-ring-expand" />
          <span
            className="absolute inset-0 m-auto w-24 h-24 rounded-full border-2 border-primary/40 animate-ring-expand"
            style={{ animationDelay: "0.4s" }}
          />

          {/* Soil mound */}
          <div className="absolute bottom-0 w-32 h-6 rounded-full bg-foreground/15 blur-[1px]" />

          {/* Sprout SVG */}
          <svg
            viewBox="0 0 120 140"
            className="relative w-32 h-36 drop-shadow-[0_8px_16px_hsl(var(--primary)/0.35)]"
          >
            {/* Stem */}
            <path
              d="M60 132 C60 100 60 80 60 60"
              stroke="hsl(var(--primary))"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              className="splash-stem"
            />
            {/* Left leaf */}
            <path
              d="M60 78 C40 78 28 66 26 50 C42 50 56 60 60 78 Z"
              fill="hsl(var(--primary-glow))"
              className="splash-leaf-left"
            />
            {/* Right leaf */}
            <path
              d="M60 64 C80 64 92 52 94 36 C78 36 64 46 60 64 Z"
              fill="hsl(var(--primary))"
              className="splash-leaf-right"
            />
            {/* Top bud */}
            <circle
              cx="60"
              cy="58"
              r="6"
              fill="hsl(var(--accent))"
              className="splash-bud"
            />
          </svg>

          {/* Sparkles */}
          <span className="absolute top-2 left-6 text-2xl animate-sparkle-burst">
            ✨
          </span>
          <span
            className="absolute top-6 right-4 text-xl animate-sparkle-burst"
            style={{ animationDelay: "0.3s" }}
          >
            ✦
          </span>
          <span
            className="absolute bottom-12 left-2 text-lg animate-sparkle-burst"
            style={{ animationDelay: "0.6s" }}
          >
            ✧
          </span>
        </div>

        {/* Wordmark */}
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sprout
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Grow one habit at a time
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-primary/70"
              style={{
                animation: "splash-dot 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splash-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        .splash-stem {
          stroke-dasharray: 90;
          stroke-dashoffset: 90;
          animation: splash-stem-grow 1s ease-out 0.1s forwards;
        }
        @keyframes splash-stem-grow {
          to { stroke-dashoffset: 0; }
        }
        .splash-leaf-left {
          transform-origin: 60px 78px;
          transform: scale(0);
          animation: splash-leaf-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.9s forwards;
        }
        .splash-leaf-right {
          transform-origin: 60px 64px;
          transform: scale(0);
          animation: splash-leaf-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 1.1s forwards;
        }
        .splash-bud {
          transform-origin: 60px 58px;
          transform: scale(0);
          animation: splash-leaf-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.3s forwards;
        }
        @keyframes splash-leaf-pop {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};