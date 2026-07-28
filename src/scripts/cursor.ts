const LERP_AMOUNT = 0.2;
const CURSOR_HALF = 25;
const RADIUS_DEFAULT = 6.25;
const RADIUS_HOVER = 25;

const INTERACTIVE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), label[for], summary';

const FADE_ONLY_SELECTOR =
  '.header__nav-links .header__link, .experience-arrow:not(:disabled), .theme-toggle';

type HoverMode = 'none' | 'fade' | 'interactive';

function getHoverMode(el: Element | null): HoverMode {
  if (!el) return 'none';
  if (el.closest(FADE_ONLY_SELECTOR)) return 'fade';
  if (el.closest(INTERACTIVE_SELECTOR)) return 'interactive';
  return 'none';
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type AnimatedProp = {
  previous: number;
  current: number;
  amt: number;
};

export function initCustomCursor() {
  const finePointerQuery = window.matchMedia('(any-pointer: fine)');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!finePointerQuery.matches || prefersReducedMotion.matches) return;

  const el = document.querySelector<HTMLElement>('.cursor');
  const circle = el?.querySelector<SVGCircleElement>('.cursor__inner');
  if (!el || !circle) return;

  const mouse = { x: 0, y: 0 };
  let isVisible = false;
  let currentMode: HoverMode = 'none';

  const state = {
    tx: { previous: 0, current: 0, amt: LERP_AMOUNT },
    ty: { previous: 0, current: 0, amt: LERP_AMOUNT },
    radius: { previous: RADIUS_DEFAULT, current: RADIUS_DEFAULT, amt: LERP_AMOUNT },
    opacity: { previous: 1, current: 1, amt: LERP_AMOUNT },
    reveal: { previous: 0, current: 0, amt: 0.12 },
  } satisfies Record<string, AnimatedProp>;

  const applyHover = (mode: HoverMode) => {
    if (mode === 'none') {
      state.radius.current = RADIUS_DEFAULT;
      state.opacity.current = 1;
      return;
    }

    state.opacity.current = 0.2;
    state.radius.current = mode === 'interactive' ? RADIUS_HOVER : RADIUS_DEFAULT;
  };

  const render = () => {
    if (!isVisible) return;

    state.tx.current = mouse.x - CURSOR_HALF;
    state.ty.current = mouse.y - CURSOR_HALF;

    for (const key of Object.keys(state) as (keyof typeof state)[]) {
      const prop = state[key];
      prop.previous = lerp(prop.previous, prop.current, prop.amt);
    }

    el.style.transform = `translate3d(${state.tx.previous}px, ${state.ty.previous}px, 0)`;
    circle.setAttribute('r', String(state.radius.previous));
    circle.style.opacity = String(state.opacity.previous * state.reveal.previous);

    requestAnimationFrame(render);
  };

  const onFirstMove = (event: MouseEvent) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    state.tx.previous = state.tx.current = mouse.x - CURSOR_HALF;
    state.ty.previous = state.ty.current = mouse.y - CURSOR_HALF;
    state.reveal.current = 1;

    isVisible = true;
    window.removeEventListener('mousemove', onFirstMove);
    requestAnimationFrame(render);
  };

  window.addEventListener('mousemove', onFirstMove);
  window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  document.addEventListener('mouseover', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const mode = getHoverMode(target);
    if (mode === 'none' || mode === currentMode) return;

    currentMode = mode;
    applyHover(mode);
  });

  document.addEventListener('mouseout', (event) => {
    const related = event.relatedTarget;
    const relatedMode = related instanceof Element ? getHoverMode(related) : 'none';
    if (relatedMode !== 'none') return;
    if (currentMode === 'none') return;

    currentMode = 'none';
    applyHover('none');
  });

  document.addEventListener('mouseleave', () => {
    el.style.visibility = 'hidden';
  });

  document.addEventListener('mouseenter', () => {
    el.style.visibility = '';
  });
}
