import { Injectable, signal, computed } from '@angular/core';

export type Language = 'hi' | 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'language';
  private readonly DEFAULT_LANGUAGE: Language = 'en';

  // Current language signal
  private currentLanguage = signal<Language>(this.DEFAULT_LANGUAGE);

  // Public readonly accessor
  public readonly language = this.currentLanguage.asReadonly();

  // Computed signal for checking if Hindi
  public readonly isHindi = computed(() => this.currentLanguage() === 'hi');

  constructor() {
    this.initializeLanguage();
  }

  /**
   * Initialize language from localStorage
   */
  private initializeLanguage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'hi' || stored === 'en') {
      this.currentLanguage.set(stored as Language);
    } else {
      this.currentLanguage.set(this.DEFAULT_LANGUAGE);
      localStorage.setItem(this.STORAGE_KEY, this.DEFAULT_LANGUAGE);
    }
  }

  /**
   * Set language preference
   */
  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage();
  }
}
