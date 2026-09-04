import { Injectable, signal } from '@angular/core';

export type DefaultRecordFilterSetting = 'today' | 'week' | 'month' | 'all';

@Injectable({
  providedIn: 'root'
})
export class UiPreferencesService {
  private readonly STORAGE_KEY_NAV_LABELS = 'showBottomNavLabels';
  private readonly STORAGE_KEY_DEFAULT_RECORD_FILTER = 'defaultRecordFilter';

  /**
   * Whether to display text labels under icons in the bottom navigation bar.
   * By default this is FALSE (hidden) to keep the navigation bar compact, sleek,
   * and modern. Users can toggle this ON in the Settings page.
   */
  readonly showNavLabels = signal<boolean>(this.getInitialNavLabelsPreference());

  /**
   * Default date filter for the Records page.
   * By default this is 'today' (आज) as requested.
   * Configurable in Settings.
   */
  readonly defaultRecordFilter = signal<DefaultRecordFilterSetting>(this.getInitialDefaultRecordFilter());

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

  private getInitialDefaultRecordFilter(): DefaultRecordFilterSetting {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'today';
    }
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_DEFAULT_RECORD_FILTER);
      if (stored === 'today' || stored === 'week' || stored === 'month' || stored === 'all') {
        return stored as DefaultRecordFilterSetting;
      }
      return 'today';
    } catch {
      return 'today';
    }
  }

  setDefaultRecordFilter(filter: DefaultRecordFilterSetting): void {
    this.defaultRecordFilter.set(filter);
    try {
      localStorage.setItem(this.STORAGE_KEY_DEFAULT_RECORD_FILTER, filter);
    } catch (e) {
      console.warn('Could not persist default record filter preference in localStorage', e);
    }
  }
}
