const THEME_PREFERENCE_KEY = 'mel-theme-preference';
const LEGACY_LIGHT_MODE_KEY = 'mel-light-mode';
const LEGACY_THEME_KEY = 'mel-theme';

export type Theme = 'light' | 'dark';

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredThemePreference(): Theme | null {
  const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  if (localStorage.getItem(LEGACY_LIGHT_MODE_KEY) === '1') {
    return 'light';
  }

  return null;
}

export function getPreferredTheme(): Theme {
  return getStoredThemePreference() ?? getSystemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  localStorage.setItem(THEME_PREFERENCE_KEY, theme);
  localStorage.removeItem(LEGACY_LIGHT_MODE_KEY);
  localStorage.removeItem(LEGACY_THEME_KEY);
}

export function initThemeToggle() {
  localStorage.removeItem(LEGACY_THEME_KEY);

  const toggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!toggle) return;

  const sunIcon = toggle.querySelector('.theme-toggle__icon--sun');
  const moonIcon = toggle.querySelector('.theme-toggle__icon--moon');

  const syncToggle = () => {
    const isDark = getPreferredTheme() === 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute(
      'aria-label',
      isDark ? 'Switch to light mode' : 'Switch to dark mode'
    );
    sunIcon?.toggleAttribute('hidden', !isDark);
    moonIcon?.toggleAttribute('hidden', isDark);
  };

  toggle.addEventListener('click', () => {
    setTheme(getPreferredTheme() === 'dark' ? 'light' : 'dark');
    syncToggle();
  });

  const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemQuery.addEventListener('change', () => {
    if (getStoredThemePreference() !== null) return;
    applyTheme(getSystemTheme());
    syncToggle();
  });

  applyTheme(getPreferredTheme());
  syncToggle();
}
