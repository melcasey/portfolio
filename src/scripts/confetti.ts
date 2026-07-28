import confetti from 'canvas-confetti';

const COOLDOWN_MS = 900;

function fireConfettiBurst(origin: { x: number; y: number }) {
  const count = 200;
  const defaults = {
    origin,
    zIndex: 9999,
    disableForReducedMotion: true,
  } as const;

  function fire(particleRatio: number, opts: confetti.Options) {
    void confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

export function initCanvaConfetti() {
  const trigger = document.querySelector<HTMLElement>('[data-canva-confetti]');
  if (!trigger) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let lastFired = 0;

  trigger.addEventListener('mouseenter', () => {
    const now = Date.now();
    if (now - lastFired < COOLDOWN_MS) return;
    lastFired = now;

    const rect = trigger.getBoundingClientRect();
    fireConfettiBurst({
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    });
  });
}
