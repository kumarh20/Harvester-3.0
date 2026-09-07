import { Injectable, signal, computed } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme';
  private readonly DEFAULT_THEME: ThemeMode = 'light';

  // Current theme signal
  private darkModeSignal = signal<boolean>(false);

  // Public readonly accessors
  public readonly isDarkMode = this.darkModeSignal.asReadonly();
  public readonly currentTheme = computed<ThemeMode>(() => this.darkModeSignal() ? 'dark' : 'light');

  constructor() {
    this.initializeTheme();
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  private initializeTheme(): void {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(this.STORAGE_KEY);
    const isDark = stored === 'dark';
    
    this.darkModeSignal.set(isDark);
    this.applyTheme(isDark, false);
  }

  /**
   * Toggle between Daylight (Light) and Dark Mode with smooth animation
   */
  public toggleTheme(): void {
    this.setDarkMode(!this.darkModeSignal());
  }

  /**
   * Set theme explicitly
   */
  public setDarkMode(isDark: boolean): void {
    if (this.darkModeSignal() === isDark) return;

    this.darkModeSignal.set(isDark);
    const theme: ThemeMode = isDark ? 'dark' : 'light';
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.applyTheme(isDark, true);
  }

  /**
   * Apply theme attribute to document and trigger smooth transition animation
   */
  private applyTheme(isDark: boolean, animate = true): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    if (animate) {
      root.classList.add('theme-transitioning');
      window.setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 500);
    }

    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }
}
