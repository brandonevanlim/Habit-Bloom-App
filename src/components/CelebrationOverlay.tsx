import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface UnlockEvent {
  emoji: string;
  name: string;
  kind: string;
}

interface Props {
  unlock: UnlockEvent | null;
  onClose: () => void;
}

export const CelebrationOverlay = ({ unlock, onClose }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (unlock) {
      setShow(true);
      const t = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300);
      }, 2400);
      return () => clearTimeout(t);
    }
  }, [unlock, onClose]);

  if (!unlock) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm transition-opacity duration-300 pointer-events-none ${
        show ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="relative flex flex-col items-center text-center px-6">
        {/* Expanding rings */}
        <span className="absolute inset-0 m-auto w-32 h-32 rounded-full border-primary animate-ring-expand" />
        <span
          className="absolute inset-0 m-auto w-32 h-32 rounded-full border-accent animate-ring-expand"
          style={{ animationDelay: "0.2s" }}
        />

        {/* Sparkles */}
        <Sparkles className="absolute -top-6 -left-8 w-6 h-6 text-warning animate-sparkle-burst" />
        <Sparkles
          className="absolute -top-4 -right-10 w-8 h-8 text-accent animate-sparkle-burst"
          style={{ animationDelay: "0.15s" }}
        />
        <Sparkles
          className="absolute -bottom-2 left-0 w-5 h-5 text-primary animate-sparkle-burst"
          style={{ animationDelay: "0.3s" }}
        />

        {/* Evolving emoji */}
        <div className="text-8xl animate-grow-pop drop-shadow-2xl" aria-hidden="true">
          {unlock.emoji}
        </div>

        <p className="mt-4 text-xs uppercase tracking-widest text-primary font-semibold animate-fade-in">
          {unlock.kind} unlocked
        </p>
        <h2 className="mt-1 text-2xl font-bold text-foreground animate-fade-in">
          {unlock.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground animate-fade-in">
          Your sprout is growing! 🌱
        </p>
      </div>
    </div>
  );
};