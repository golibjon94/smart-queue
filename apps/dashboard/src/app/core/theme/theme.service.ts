import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'sq_theme';
const DARK_CLASS = 'app-dark'; // PrimeNG darkModeSelector + tailwind @custom-variant

/**
 * Ilova mavzusi (light/dark). Holat signalda, localStorage'da saqlanadi,
 * birinchi yuklashda tizim sozlamasiga (prefers-color-scheme) qaraydi.
 * effect() <html> ga bitta manba sifatida `data-theme` atributini qo'yadi —
 * Aurora tokenlari (aurora-tokens.css) shunga qarab almashadi. PrimeNG uchun
 * `.app-dark` klassi ham parallel qo'yiladi (toast, login inputlari).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly _mode = signal<ThemeMode>(this.resolveInitial());
  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    effect(() => {
      const mode = this._mode();
      const root = this.document.documentElement;
      root.setAttribute('data-theme', mode);
      root.classList.toggle(DARK_CLASS, mode === 'dark');
      localStorage.setItem(STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this._mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this._mode.set(mode);
  }

  private resolveInitial(): ThemeMode {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark = this.document.defaultView?.matchMedia?.(
      '(prefers-color-scheme: dark)',
    ).matches;
    return prefersDark ? 'dark' : 'light';
  }
}
