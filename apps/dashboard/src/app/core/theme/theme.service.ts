import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type Theme = 'petrol' | 'slate' | 'navy' | 'plum' | 'light';

export interface ThemePreset {
  id: Theme;
  label: string;
  swatch: string; // preset --bg (swatch rangi)
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'petrol', label: 'Petrol', swatch: '#0f1311' },
  { id: 'slate', label: 'Slate', swatch: '#171c24' },
  { id: 'navy', label: 'Navy', swatch: '#0a0f1c' },
  { id: 'plum', label: 'Plum', swatch: '#0a0711' },
  { id: 'light', label: 'Light', swatch: '#f2f1fb' },
];

const STORAGE_KEY = 'sq_theme';
const DARK_CLASS = 'app-dark'; // PrimeNG (toast/overlaylar) — light'dan tashqari hamma dark
const VALID: readonly Theme[] = ['petrol', 'slate', 'navy', 'plum', 'light'];

/**
 * Ilova mavzusi — 5 preset (petrol standart). Accent'lar hamma presetda bir xil,
 * faqat sirt ranglari o'zgaradi (aurora-tokens.css). effect() `<html>` ga
 * `data-theme` atributini qo'yadi; PrimeNG uchun light'dan tashqari `.app-dark`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly _theme = signal<Theme>(this.resolveInitial());
  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() !== 'light');

  readonly presets = THEME_PRESETS;

  constructor() {
    effect(() => {
      const t = this._theme();
      const root = this.document.documentElement;
      root.setAttribute('data-theme', t);
      root.classList.toggle(DARK_CLASS, t !== 'light');
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  set(theme: Theme): void {
    this._theme.set(theme);
  }

  private resolveInitial(): Theme {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (VALID as readonly string[]).includes(saved)) return saved as Theme;
    if (saved === 'dark') return 'petrol'; // eski qiymatdan migratsiya
    const prefersLight = this.document.defaultView?.matchMedia?.(
      '(prefers-color-scheme: light)',
    ).matches;
    return prefersLight ? 'light' : 'petrol';
  }
}
