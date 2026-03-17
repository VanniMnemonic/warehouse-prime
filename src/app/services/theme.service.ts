import { isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'warehouse-prime-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _isDark = signal<boolean>(this.resolveInitial());
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    // Reactively apply the theme class whenever the signal changes.
    effect(() => this.applyClass(this._isDark()));
  }

  setDark(value: boolean): void {
    this._isDark.set(value);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
    }
  }

  toggle(): void {
    this.setDark(!this._isDark());
  }

  // ---------------------------------------------------------------------------

  private resolveInitial(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;

    // Fall back to the OS preference when no explicit choice has been saved.
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyClass(isDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.documentElement.classList.toggle('dark', isDark);
  }
}
