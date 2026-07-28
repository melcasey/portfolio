import { initCanvaConfetti } from './confetti';
import { initCustomCursor } from './cursor';
import { initThemeToggle } from './theme';

const INTRO_TIMING = {
  heroStartDelay: 400,
  heroWordCount: 17,
  heroWordStagger: 95,
  heroWordDuration: 1350,
  headerLead: 450,
  headerDuration: 850,
} as const;

function getHeaderStartMs() {
  const { heroStartDelay, heroWordCount, heroWordStagger, heroWordDuration, headerLead } =
    INTRO_TIMING;
  return (
    heroStartDelay +
    (heroWordCount - 1) * heroWordStagger +
    heroWordDuration -
    headerLead
  );
}

function getIntroCardDelayMs() {
  return getHeaderStartMs() + INTRO_TIMING.headerDuration;
}

function initSmoothScroll() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  const getScrollOffset = () => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--scroll-anchor-offset')
      .trim();
    return Number.parseFloat(value) || 128;
  };

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();

      const offset = getScrollOffset();
      const top = window.scrollY + target.getBoundingClientRect().top - offset;

      window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior });
      history.pushState(null, '', href);
    });
  });
}

function initScrollReveal() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealElements = document.querySelectorAll('.reveal');
  const introCard = document.querySelector<HTMLElement>('.reveal--intro-card');
  const scrollRevealElements = document.querySelectorAll('.reveal:not(.reveal--intro-card)');

  if (prefersReducedMotion) {
    revealElements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const isInViewport = (el: Element) => {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
  };

  const pageLoadTime = performance.now();
  const introDelay = getIntroCardDelayMs();
  const pendingUntilScroll = new Set<Element>();
  let scrollRevealEnabled = false;
  let userHasScrolled = false;

  scrollRevealElements.forEach((el) => {
    if (isInViewport(el)) pendingUntilScroll.add(el);
  });

  window.addEventListener(
    'scroll',
    () => {
      userHasScrolled = true;
    },
    { passive: true }
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || !scrollRevealEnabled) return;
        if (pendingUntilScroll.has(entry.target) && !userHasScrolled) return;

        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
        pendingUntilScroll.delete(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
  );

  window.setTimeout(() => {
    scrollRevealEnabled = true;
    scrollRevealElements.forEach((el) => observer.observe(el));
  }, introDelay);

  const revealIntroCard = () => {
    if (!introCard) return;
    introCard.classList.add('is-visible');
  };

  if (introCard && isInViewport(introCard)) {
    window.setTimeout(revealIntroCard, introDelay);
  } else if (introCard) {
    const introObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        const elapsed = performance.now() - pageLoadTime;
        const delay = Math.max(0, introDelay - elapsed);
        window.setTimeout(revealIntroCard, delay);
        introObserver.disconnect();
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    );
    introObserver.observe(introCard);
  }
}

function initExperienceCarousel() {
  const viewport = document.querySelector<HTMLElement>('.experience-viewport');
  const carousel = document.querySelector<HTMLElement>('.experience-carousel');
  const dotsNav = document.querySelector<HTMLElement>('.experience-dots');
  const arrows = document.querySelector<HTMLElement>('.experience-arrows');
  const prevBtn = document.querySelector<HTMLButtonElement>('.experience-arrow--prev');
  const nextBtn = document.querySelector<HTMLButtonElement>('.experience-arrow--next');
  if (!viewport || !carousel || !dotsNav || !arrows || !prevBtn || !nextBtn) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 1136px)');
  const scrollBehavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  const SCROLL_EDGE_TOLERANCE = 8;

  let activeIndex = 0;
  let canScroll = false;

  const getItems = () => Array.from(carousel.children) as HTMLElement[];

  const getSnapPositions = () => getItems().map((item) => item.offsetLeft);

  const getMaxScroll = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);

  const canScrollPrev = () => viewport.scrollLeft > SCROLL_EDGE_TOLERANCE;

  const canScrollNext = () => viewport.scrollLeft < getMaxScroll() - SCROLL_EDGE_TOLERANCE;

  const getNearestIndex = (scrollLeft = viewport.scrollLeft) => {
    const positions = getSnapPositions();
    let nearest = 0;
    let minDistance = Infinity;

    positions.forEach((position, index) => {
      const distance = Math.abs(position - scrollLeft);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = index;
      }
    });

    return nearest;
  };

  const scrollToIndex = (index: number) => {
    if (!canScroll) return;

    const positions = getSnapPositions();
    if (positions.length === 0) return;

    const clamped = Math.max(0, Math.min(index, positions.length - 1));
    activeIndex = clamped;
    viewport.scrollTo({ left: positions[clamped], behavior: scrollBehavior });
    updateControls();
  };

  const measureCanScroll = () => {
    const lastItem = carousel.lastElementChild as HTMLElement | null;
    if (!lastItem) return false;

    const padRight = parseFloat(getComputedStyle(carousel).paddingRight) || 0;
    const contentWidth = lastItem.offsetLeft + lastItem.offsetWidth + padRight;

    return contentWidth > viewport.clientWidth + 8;
  };

  const measureOneCardVisible = () => {
    if (!mobileQuery.matches) return false;

    const card = carousel.querySelector<HTMLElement>('.experience-card');
    if (!card) return false;

    const inset =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--content-inset')) ||
      0;
    const gap = parseFloat(getComputedStyle(carousel).gap) || 31;
    const available = viewport.clientWidth - inset;
    const twoCardsWidth = card.offsetWidth * 2 + gap;

    return twoCardsWidth > available;
  };

  const renderDots = () => {
    dotsNav.innerHTML = '';
    getItems().forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'experience-dot';
      dot.setAttribute('aria-label', `Go to item ${index + 1}`);
      dot.addEventListener('click', () => scrollToIndex(index));
      dotsNav.appendChild(dot);
    });
  };

  const updateDots = () => {
    const showDots = canScroll && measureOneCardVisible();
    dotsNav.hidden = !showDots;
    dotsNav.classList.toggle('is-visible', showDots);

    if (!showDots) return;

    dotsNav.querySelectorAll<HTMLButtonElement>('.experience-dot').forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle('is-active', isActive);
      dot.toggleAttribute('aria-current', isActive);
    });
  };

  const updateArrows = () => {
    const showDots = canScroll && measureOneCardVisible();
    const showArrows = canScroll && !showDots;
    arrows.hidden = !showArrows;
    arrows.classList.toggle('is-visible', showArrows);
  };

  const updateControls = () => {
    activeIndex = getNearestIndex();
    prevBtn.disabled = !canScroll || !canScrollPrev();
    nextBtn.disabled = !canScroll || !canScrollNext();
    updateArrows();
    updateDots();
  };

  const refreshState = (resetIfFits = false) => {
    canScroll = measureCanScroll();
    viewport.classList.toggle('is-scrollable', canScroll);

    if (!canScroll) {
      if (resetIfFits) viewport.scrollLeft = 0;
      activeIndex = 0;
      arrows.hidden = true;
      arrows.classList.remove('is-visible');
      dotsNav.hidden = true;
      dotsNav.classList.remove('is-visible');
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    activeIndex = getNearestIndex();

    if (measureOneCardVisible() && dotsNav.childElementCount !== getItems().length) {
      renderDots();
    }

    updateControls();
  };

  const onScroll = () => {
    if (!canScroll) return;
    updateControls();
  };

  refreshState(true);
  new ResizeObserver(() => refreshState(true)).observe(viewport);
  new ResizeObserver(() => refreshState(true)).observe(carousel);
  window.addEventListener('resize', () => refreshState(true), { passive: true });
  mobileQuery.addEventListener('change', () => refreshState(false));

  viewport.addEventListener('scroll', onScroll, { passive: true });
  viewport.addEventListener('scrollend', onScroll, { passive: true });

  prevBtn.addEventListener('click', () => {
    if (!canScrollPrev()) return;
    scrollToIndex(activeIndex - 1);
  });
  nextBtn.addEventListener('click', () => {
    if (!canScrollNext()) return;
    scrollToIndex(activeIndex + 1);
  });
}

function initStickyHeader() {
  const spacer = document.querySelector('.header-spacer');
  const header = document.querySelector<HTMLElement>('.header');
  const glass = document.querySelector<HTMLElement>('.header__glass');
  const track = document.querySelector('.header__track');
  if (!spacer || !header || !glass || !track) return;

  const glassPadY = 14;
  const mobileQuery = window.matchMedia('(max-width: 1136px)');
  let ticking = false;
  let isStuck = false;

  const getGlassPadX = () => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-shell-pad-x')
      .trim();
    return Number.parseFloat(value) || 32;
  };

  const clearGlass = () => {
    glass.style.top = '';
    glass.style.left = '';
    glass.style.width = '';
    glass.style.height = '';
    glass.style.borderRadius = '';
  };

  const syncGlass = () => {
    ticking = false;

    if (!isStuck) {
      clearGlass();
      return;
    }

    if (mobileQuery.matches) {
      const headerRect = header.getBoundingClientRect();
      glass.style.top = '0px';
      glass.style.left = '0px';
      glass.style.width = '100%';
      glass.style.height = `${headerRect.height}px`;
      glass.style.borderRadius = '0px';
      return;
    }

    clearGlass();

    const padX = getGlassPadX();
    const rect = track.getBoundingClientRect();

    glass.style.top = `${rect.top - glassPadY}px`;
    glass.style.left = `${rect.left - padX}px`;
    glass.style.width = `${rect.width + padX * 2}px`;
    glass.style.height = `${rect.height + glassPadY * 2}px`;
  };

  const scheduleSync = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncGlass);
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      isStuck = !entry.isIntersecting;
      header.classList.toggle('is-stuck', isStuck);
      glass.classList.toggle('is-visible', isStuck);
      scheduleSync();
    },
    { threshold: 0 }
  );

  observer.observe(spacer);
  window.addEventListener('scroll', scheduleSync, { passive: true });
  window.addEventListener('resize', scheduleSync);
  window.addEventListener('load', scheduleSync);
  mobileQuery.addEventListener('change', scheduleSync);
  scheduleSync();
}

function initNavHighlight() {
  const container = document.querySelector<HTMLElement>('.header__nav-links');
  const highlight = document.querySelector<HTMLElement>('.header__nav-highlight');
  const links = container?.querySelectorAll<HTMLElement>('.header__link');
  if (!container || !highlight || !links?.length) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeLink: HTMLElement | null = null;

  const moveHighlight = (link: HTMLElement) => {
    activeLink = link;
    const containerRect = container.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    highlight.style.width = `${linkRect.width}px`;
    highlight.style.height = `${linkRect.height}px`;
    highlight.style.transform = `translate3d(${linkRect.left - containerRect.left}px, ${linkRect.top - containerRect.top}px, 0)`;
    highlight.classList.add('is-visible');
  };

  const hideHighlight = () => {
    activeLink = null;
    highlight.classList.remove('is-visible');
  };

  const syncHighlight = () => {
    if (activeLink) moveHighlight(activeLink);
  };

  links.forEach((link) => {
    link.addEventListener('mouseenter', () => moveHighlight(link));
    link.addEventListener('focus', () => moveHighlight(link));
  });

  container.addEventListener('mouseleave', hideHighlight);
  container.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (next instanceof Node && container.contains(next)) return;
    hideHighlight();
  });

  if (!prefersReducedMotion) {
    window.addEventListener('resize', syncHighlight, { passive: true });
    new ResizeObserver(syncHighlight).observe(container);
  }

  window.addEventListener('load', syncHighlight, { once: true });
}

function initTextLinkUnderline() {
  const links = document.querySelectorAll<HTMLElement>('.text-link');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  links.forEach((link) => {
    const show = () => {
      link.classList.remove('is-underline-leaving');
      link.classList.add('is-underline-active');
    };

    const hide = () => {
      if (prefersReducedMotion) {
        link.classList.remove('is-underline-active', 'is-underline-leaving');
        return;
      }

      if (!link.classList.contains('is-underline-active')) return;

      link.classList.remove('is-underline-active');
      link.classList.add('is-underline-leaving');
    };

    link.addEventListener('mouseenter', show);
    link.addEventListener('mouseleave', hide);
    link.addEventListener('focus', show);
    link.addEventListener('blur', hide);

    link.addEventListener('transitionend', (event) => {
      if (event.target !== link) return;
      if ((event as TransitionEvent).propertyName !== 'transform') return;
      link.classList.remove('is-underline-leaving');
    });
  });
}

const PORTRAIT_ASPECT = 752 / 920;
const ABOUT_DESKTOP_QUERY = '(min-width: 1137px)';

function initAboutPortrait() {
  const text = document.querySelector<HTMLElement>('.about-section__text');
  const photo = document.querySelector<HTMLElement>('.about-section__photo');
  const wrap = document.querySelector<HTMLElement>('.about-section__photo-wrap');
  if (!text || !photo || !wrap) return;

  const desktopQuery = window.matchMedia(ABOUT_DESKTOP_QUERY);

  const clearSize = () => {
    photo.style.width = '';
    photo.style.height = '';
  };

  const syncSize = () => {
    if (!desktopQuery.matches) {
      clearSize();
      return;
    }

    const textHeight = text.getBoundingClientRect().height;
    const columnWidth = wrap.getBoundingClientRect().width;

    if (!textHeight || !columnWidth) return;

    let width = textHeight * PORTRAIT_ASPECT;

    if (width > columnWidth) {
      width = columnWidth;
    }

    photo.style.width = `${Math.round(width)}px`;
    photo.style.height = `${Math.round(textHeight)}px`;
  };

  syncSize();
  new ResizeObserver(syncSize).observe(text);
  new ResizeObserver(syncSize).observe(wrap);
  window.addEventListener('resize', syncSize, { passive: true });
  desktopQuery.addEventListener('change', syncSize);
  window.addEventListener('load', syncSize, { once: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(syncSize);
  }
}

function initPhonePreviewVideo() {
  const speeds = [1, 1.2, 1.4, 1.6, 1.8, 2] as const;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const formatSpeed = (speed: number) =>
    Number.isInteger(speed) ? `${speed}×` : `${speed.toFixed(1)}×`;

  document.querySelectorAll<HTMLElement>('[data-phone-video]').forEach((wrapper) => {
    const video = wrapper.querySelector<HTMLVideoElement>('video');
    const speedBtn = wrapper.querySelector<HTMLButtonElement>('[data-speed]');
    const playPauseBtn = wrapper.querySelector<HTMLButtonElement>('[data-play-pause]');
    if (!video || !speedBtn || !playPauseBtn) return;

    const defaultSpeedIndex = speeds.indexOf(1.4);
    let speedIndex = defaultSpeedIndex >= 0 ? defaultSpeedIndex : 0;

    video.playbackRate = speeds[speedIndex];
    speedBtn.textContent = formatSpeed(speeds[speedIndex]);

    const togglePlayback = () => {
      if (video.paused) void video.play();
      else video.pause();
    };

    const setPaused = (paused: boolean) => {
      wrapper.classList.toggle('is-paused', paused);
      playPauseBtn.textContent = paused ? '▶' : '⏸';
      playPauseBtn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    };

    if (prefersReducedMotion) {
      video.removeAttribute('autoplay');
      video.pause();
    }

    setPaused(video.paused);

    wrapper.addEventListener('click', togglePlayback);

    playPauseBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePlayback();
    });

    speedBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      speedIndex = (speedIndex + 1) % speeds.length;
      video.playbackRate = speeds[speedIndex];
      speedBtn.textContent = formatSpeed(speeds[speedIndex]);
      if (video.paused) void video.play();
    });

    video.addEventListener('play', () => setPaused(false));
    video.addEventListener('pause', () => setPaused(true));
  });
}

initSmoothScroll();
initPhonePreviewVideo();
initScrollReveal();
initExperienceCarousel();
initStickyHeader();
initNavHighlight();
initTextLinkUnderline();
initAboutPortrait();
initCustomCursor();
initThemeToggle();
initCanvaConfetti();
