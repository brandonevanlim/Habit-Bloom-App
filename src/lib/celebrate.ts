import confetti from "canvas-confetti";

const colors = ["#5BBF8B", "#7FD4A8", "#F5B042", "#F47B5C", "#A78BFA"];

export const celebrateUnlock = () => {
  // Burst from center
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.45 },
    colors,
    scalar: 0.9,
  });
  // Side bursts shortly after
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });
  }, 200);
};

export const celebrateMilestone = () => {
  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.5 },
    colors,
    shapes: ["star", "circle"],
    scalar: 1.1,
  });
};