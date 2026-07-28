/**
 * Effect 14 from Codrops ImageRevealHover, adapted for Goodreads covers.
 * https://github.com/codrops/ImageRevealHover
 *
 * Codrops originals: show 400ms, exit 800ms, cycle every 500ms (with overlap).
 * HOLD_MS replaces that 500ms interval — time each cover stays fully visible.
 */
const SHOW_MS = 320;
const HIDE_MS = 650;
const HOLD_MS = 850;
const REST_ROTATION_DEG = 4;

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function parseCoverUrls(trigger: HTMLElement): string[] {
  const raw = trigger.dataset.readingCovers;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((url): url is string => typeof url === 'string' && url.length > 0)
      : [];
  } catch {
    return [];
  }
}

class ReadingHoverFx14 {
  private readonly trigger: HTMLElement;
  private readonly reveal: HTMLDivElement;
  private readonly images: HTMLDivElement[];
  private readonly prefersReducedMotion: boolean;

  private current = 0;
  private imgTimeout: number | undefined;
  private isShowing = false;

  constructor(trigger: HTMLElement, coverUrls: string[]) {
    this.trigger = trigger;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.reveal = document.createElement('div');
    this.reveal.className = 'reading-reveal';
    this.reveal.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('div');
    inner.className = 'reading-reveal__inner';

    this.images = coverUrls.slice(0, 5).map((url) => {
      const img = document.createElement('div');
      img.className = 'reading-reveal__img';
      img.style.backgroundImage = `url("${url.replace(/"/g, '\\"')}")`;
      inner.appendChild(img);
      return img;
    });

    this.reveal.appendChild(inner);
    document.body.appendChild(this.reveal);
    this.bindEvents();
  }

  private positionElement(event: MouseEvent) {
    this.reveal.style.top = `${event.clientY}px`;
    this.reveal.style.left = `${event.clientX}px`;
  }

  private getRestRotation(index: number): number {
    return index % 2 === 0 ? -REST_ROTATION_DEG : REST_ROTATION_DEG;
  }

  private resetImageStyles(img: HTMLDivElement) {
    img.style.transition = 'none';
    img.style.zIndex = '';
    img.style.opacity = '0';
    img.style.transform = 'scale(0.5) rotate(-15deg) translate(0, -10%)';
  }

  private showCurrent() {
    const img = this.images[this.current];
    if (!img) return;

    this.resetImageStyles(img);
    img.style.zIndex = '2';

    if (this.prefersReducedMotion) {
      const rotation = this.getRestRotation(this.current);
      img.style.opacity = '1';
      img.style.transform = `scale(1) rotate(${rotation}deg) translate(0, 0)`;
      return;
    }

    void img.offsetWidth;
    const rotation = this.getRestRotation(this.current);
    img.style.transition = `opacity ${SHOW_MS}ms cubic-bezier(0.23, 1, 0.32, 1), transform ${SHOW_MS}ms cubic-bezier(0.23, 1, 0.32, 1)`;
    img.style.opacity = '1';
    img.style.transform = `scale(1) rotate(${rotation}deg) translate(0, 0)`;
  }

  private animateOut(img: HTMLDivElement) {
    if (this.prefersReducedMotion) {
      img.style.opacity = '0';
      return;
    }

    const x = randomFloat(-10, 10);
    const y = randomFloat(10, 60);
    const rotation = randomFloat(5, 15);

    img.style.zIndex = '1';
    img.style.transition = `opacity ${HIDE_MS}ms cubic-bezier(0.19, 1, 0.22, 1), transform ${HIDE_MS}ms cubic-bezier(0.19, 1, 0.22, 1)`;
    img.style.opacity = '0';
    img.style.transform = `scale(1) rotate(${rotation}deg) translate(${x}%, ${y}%)`;
  }

  private scheduleNextCycle() {
    if (this.images.length <= 1 || this.prefersReducedMotion) return;

    this.imgTimeout = window.setTimeout(() => {
      if (!this.isShowing) return;
      this.transitionToNext();
    }, SHOW_MS + HOLD_MS);
  }

  private transitionToNext() {
    if (!this.isShowing || this.images.length <= 1) return;

    const outgoing = this.images[this.current];
    const nextIndex = (this.current + 1) % this.images.length;

    outgoing.style.zIndex = '';
    this.animateOut(outgoing);

    this.current = nextIndex;
    this.showCurrent();
    this.scheduleNextCycle();
  }

  private showImage(event: MouseEvent) {
    if (this.images.length === 0) return;

    this.positionElement(event);
    this.isShowing = true;
    this.reveal.style.opacity = '1';
    this.reveal.setAttribute('aria-hidden', 'false');
    this.trigger.classList.add('is-reveal-active');
    document.body.classList.add('is-reading-hover');

    this.images.forEach((img) => this.resetImageStyles(img));
    this.current = 0;
    this.showCurrent();
    this.scheduleNextCycle();
  }

  private hideImage() {
    if (this.imgTimeout !== undefined) {
      window.clearTimeout(this.imgTimeout);
      this.imgTimeout = undefined;
    }

    this.isShowing = false;

    this.images.forEach((img) => {
      img.style.transition = 'none';
      img.style.zIndex = '';
      img.style.opacity = '0';
    });

    this.current = 0;
    this.trigger.classList.remove('is-reveal-active');
    document.body.classList.remove('is-reading-hover');
    this.reveal.style.opacity = '0';
    this.reveal.setAttribute('aria-hidden', 'true');
  }

  private bindEvents() {
    this.trigger.addEventListener('mouseenter', (event) => {
      if (!(event instanceof MouseEvent)) return;
      this.showImage(event);
    });

    this.trigger.addEventListener('mousemove', (event) => {
      if (!(event instanceof MouseEvent) || !this.isShowing) return;
      requestAnimationFrame(() => this.positionElement(event));
    });

    this.trigger.addEventListener('mouseleave', () => this.hideImage());
  }
}

async function fetchCoverUrls(): Promise<string[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}currently-reading.json`, {
      cache: 'no-cache',
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { books?: { coverUrl?: string }[] };
    if (!Array.isArray(data.books)) return [];
    return data.books
      .map((book) => book.coverUrl)
      .filter((url): url is string => typeof url === 'string' && url.length > 0)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function initCurrentlyReading() {
  const trigger = document.querySelector<HTMLElement>('[data-reading-link]');
  if (!trigger || trigger.dataset.readingFxInit === 'true') return;

  let coverUrls = parseCoverUrls(trigger);

  if (coverUrls.length === 0) {
    coverUrls = await fetchCoverUrls();
  }

  if (coverUrls.length === 0) return;

  trigger.dataset.readingFxInit = 'true';
  new ReadingHoverFx14(trigger, coverUrls);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initCurrentlyReading();
  });
} else {
  void initCurrentlyReading();
}
