'use client';

import { create } from 'zustand';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'manuscrito-theme';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
  /** Sincroniza el store con lo que el script inline del <head> ya aplicó al montar. */
  hydrate: () => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', theme === 'light');
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // El default real (dark, o lo que haya en localStorage/prefers-color-scheme)
  // ya lo aplica el script inline antes del primer paint — ver root layout.
  theme: 'dark',

  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  hydrate: () => {
    if (typeof document === 'undefined') return;
    const current: Theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    set({ theme: current });
  },
}));
