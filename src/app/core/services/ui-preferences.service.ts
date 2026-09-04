import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UiPreferencesService {
  private readonly STORAGE_KEY_NAV_LABELS = 'showBottomNavLabels';

  /**
   * Whether to display text labels under icons in the bottom navigation bar.
   * By default this is FALSE (hidden) to keep the navigation bar compact, sleek,
   * and modern. Users can toggle this ON in the Settings page.
   */
  readonly showNavLabels = signal<boolean>(this.getInitialNavLabelsPreference());

  private getInitialNavLabelsPreference(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_NAV_LABELS);
      return stored === 'true';
    } catch {
      return false;
    }
  }

  setShowNavLabels(show: boolean): void {
    this.showNavLabels.set(show);
    try {
      localStorage.setItem(this.STORAGE_KEY_NAV_LABELS, show ? 'true' : 'false');
    } catch (e) {
      console.warn('Could not persist nav label preference in localStorage', e);
    }
  }

  toggleNavLabels(): boolean {
    const next = !this.showNavLabels();
    this.setShowNavLabels(next);
    return next;
  }
}
