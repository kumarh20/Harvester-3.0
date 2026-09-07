import { Injectable, signal, computed } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  query,
  where
} from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Season, getSeasonDisplayLabel } from '../models/season.model';

const SEASONS_CACHE_KEY = 'harvester_seasons_cache';

export const DEFAULT_INITIAL_SEASONS: Season[] = [
  {
    id: 'season_wheat_2026',
    name: 'गेहूं सीज़न (Rabi)',
    startMonth: 2,
    endMonth: 5,
    year: 2026,
    isDefault: true
  },
  {
    id: 'season_paddy_2026',
    name: 'धान सीज़न (Kharif)',
    startMonth: 9,
    endMonth: 12,
    year: 2026,
    isDefault: false
  }
];

@Injectable({
  providedIn: 'root'
})
export class SeasonService {
  private seasonsSignal = signal<Season[]>([]);
  public seasons = computed(() => this.seasonsSignal());

  public defaultSeason = computed(() => {
    const list = this.seasonsSignal();
    return list.find(s => s.isDefault) || (list.length > 0 ? list[0] : null);
  });

  public isLoading = signal<boolean>(false);

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {
    this.loadCachedSeasons();

    // Automatically load user's seasons as soon as auth state is confirmed
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.loadSeasons();
      }
    });
  }

  private loadCachedSeasons(): void {
    try {
      const cached = localStorage.getItem(SEASONS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.seasonsSignal.set(parsed);
          return;
        }
      }
    } catch {
      // Ignore JSON parse error
    }
    // Default fallback so seasons are always immediately accessible
    this.seasonsSignal.set(DEFAULT_INITIAL_SEASONS);
  }

  private saveCache(seasons: Season[]): void {
    try {
      localStorage.setItem(SEASONS_CACHE_KEY, JSON.stringify(seasons));
    } catch {
      // Ignore cache storage error
    }
  }

  /**
   * Load seasons from Firestore.
   * Checks the user's private document (users/{uid}) which is always authorized,
   * with fallback to root collection and local storage.
   */
  async loadSeasons(): Promise<Season[]> {
    const uid = this.auth.currentUser?.uid;
    const seasonsMap = new Map<string, Season>();

    // Seed with local cache first
    try {
      const cached = localStorage.getItem(SEASONS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: Season) => {
            if (s && s.id) seasonsMap.set(s.id, s);
          });
        }
      }
    } catch {}

    this.isLoading.set(true);
    try {
      if (uid) {
        // 1. Primary Source: users/{uid} document
        try {
          const userRef = doc(this.firestore, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const storedSeasons = userData?.['seasons'];
            const defaultSeasonId = userData?.['defaultSeasonId'];

            if (Array.isArray(storedSeasons)) {
              storedSeasons.forEach((s: any) => {
                if (s && s.id) {
                  seasonsMap.set(s.id, {
                    ...s,
                    isDefault: defaultSeasonId ? s.id === defaultSeasonId : Boolean(s.isDefault)
                  });
                }
              });
            }
          }
        } catch (userDocErr) {
          console.warn('Could not read seasons from user document:', userDocErr);
        }

        // 2. Secondary Source: 'seasons' collection (if permissions allow)
        try {
          const ref = collection(this.firestore, 'seasons');
          const q = query(ref, where('uid', '==', uid));
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            if (!seasonsMap.has(d.id)) {
              seasonsMap.set(d.id, { id: d.id, ...d.data() } as Season);
            }
          });
        } catch (colErr) {
          // It is expected that root collection queries may fail with permission errors if rules are locked down
        }
      }

      const list = Array.from(seasonsMap.values());

      // If user has no seasons configured yet, provide sensible initial defaults
      if (list.length === 0) {
        list.push(...DEFAULT_INITIAL_SEASONS);
        if (uid) {
          try {
            const userRef = doc(this.firestore, 'users', uid);
            setDoc(userRef, {
              seasons: list,
              defaultSeasonId: list[0].id
            }, { merge: true });
          } catch {
            // Ignore background save error
          }
        }
      }

      // Sort: highest year first, then highest startMonth first
      list.sort((a, b) => {
        const yearDiff = (b.year || 0) - (a.year || 0);
        if (yearDiff !== 0) return yearDiff;
        return (b.startMonth || 0) - (a.startMonth || 0);
      });

      // Ensure at least one default if seasons exist
      if (list.length > 0 && !list.some(s => s.isDefault)) {
        list[0].isDefault = true;
      }

      this.seasonsSignal.set(list);
      this.saveCache(list);
      return list;
    } catch (err) {
      console.warn('Error in loadSeasons, keeping local cache:', err);
      return this.seasonsSignal();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Add a new season.
   * Persists safely into users/{uid} document (which is guaranteed to have write permission),
   * also attempts root collection write gracefully, and immediately updates local cache.
   */
  async addSeason(data: {
    name: string;
    startMonth: number;
    endMonth: number;
    year: number;
    isDefault?: boolean;
  }): Promise<string> {
    const uid = this.auth.currentUser?.uid || '';
    const currentList = this.seasonsSignal().slice();
    const shouldBeDefault = data.isDefault ?? (currentList.length === 0);

    const newId = 'season_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const newSeason: Season = {
      id: newId,
      name: data.name.trim(),
      startMonth: Number(data.startMonth),
      endMonth: Number(data.endMonth),
      year: Number(data.year),
      isDefault: shouldBeDefault,
      uid,
      createdAt: new Date().toISOString()
    };

    // If default, unset previous default from other seasons
    let updatedList = currentList.map(s => shouldBeDefault ? { ...s, isDefault: false } : s);
    updatedList.unshift(newSeason);

    // Update local state and cache immediately (optimistic UI)
    this.seasonsSignal.set(updatedList);
    this.saveCache(updatedList);

    // 1. Primary Cloud Persistence: Save into users/{uid} document
    if (uid) {
      try {
        const userRef = doc(this.firestore, 'users', uid);
        await setDoc(userRef, {
          seasons: updatedList,
          ...(shouldBeDefault ? { defaultSeasonId: newId } : {})
        }, { merge: true });
      } catch (userErr) {
        console.warn('Could not save seasons array to user doc:', userErr);
      }

      // 2. Secondary Cloud Persistence: Attempt root 'seasons' collection without crashing on rules error
      try {
        const seasonDocRef = doc(this.firestore, `seasons/${newId}`);
        await setDoc(seasonDocRef, newSeason);
      } catch (colErr) {
        console.warn('Could not write to root seasons collection (rules restrict root collection), safely saved in user profile document:', colErr);
      }
    }

    return newId;
  }

  /**
   * Update an existing season.
   */
  async updateSeason(id: string, data: Partial<Season>): Promise<void> {
    const uid = this.auth.currentUser?.uid || '';
    const currentList = this.seasonsSignal().slice();
    const isTargetDefault = data.isDefault === true;

    const updatedList = currentList.map(s => {
      if (s.id === id) {
        return {
          ...s,
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.startMonth !== undefined ? { startMonth: Number(data.startMonth) } : {}),
          ...(data.endMonth !== undefined ? { endMonth: Number(data.endMonth) } : {}),
          ...(data.year !== undefined ? { year: Number(data.year) } : {}),
          ...(data.isDefault !== undefined ? { isDefault: Boolean(data.isDefault) } : {})
        };
      }
      if (isTargetDefault) {
        return { ...s, isDefault: false };
      }
      return s;
    });

    this.seasonsSignal.set(updatedList);
    this.saveCache(updatedList);

    // 1. Primary Cloud Persistence: users/{uid}
    if (uid) {
      try {
        const userRef = doc(this.firestore, 'users', uid);
        const activeDefault = updatedList.find(s => s.isDefault);
        await setDoc(userRef, {
          seasons: updatedList,
          defaultSeasonId: activeDefault?.id || ''
        }, { merge: true });
      } catch (userErr) {
        console.warn('Could not update seasons in user doc:', userErr);
      }

      // 2. Secondary Cloud Persistence: root 'seasons' collection
      try {
        const seasonDocRef = doc(this.firestore, `seasons/${id}`);
        const target = updatedList.find(s => s.id === id);
        if (target) {
          await setDoc(seasonDocRef, target, { merge: true });
        }
      } catch (colErr) {
        console.warn('Could not update season in root /seasons collection:', colErr);
      }
    }
  }

  /**
   * Set a season as default.
   */
  async setDefaultSeason(seasonId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid || '';
    const currentList = this.seasonsSignal().slice();

    const updatedList = currentList.map(s => ({
      ...s,
      isDefault: s.id === seasonId
    }));

    this.seasonsSignal.set(updatedList);
    this.saveCache(updatedList);

    // 1. Primary Cloud Persistence: users/{uid}
    if (uid) {
      try {
        const userRef = doc(this.firestore, 'users', uid);
        await setDoc(userRef, {
          seasons: updatedList,
          defaultSeasonId: seasonId
        }, { merge: true });
      } catch (userErr) {
        console.warn('Could not set default season in user doc:', userErr);
      }

      // 2. Secondary: try updating root collection
      try {
        const seasonDocRef = doc(this.firestore, `seasons/${seasonId}`);
        await setDoc(seasonDocRef, { isDefault: true }, { merge: true });
      } catch (colErr) {
        // Safely caught
      }
    }
  }

  /**
   * Delete a season with clean synchronization across user doc and local storage.
   */
  async deleteSeason(seasonId: string): Promise<void> {
    const uid = this.auth.currentUser?.uid || '';
    const currentList = this.seasonsSignal().slice();

    let filtered = currentList.filter(s => s.id !== seasonId);

    // If deleted season was default and others remain, make the first one default
    if (filtered.length > 0 && !filtered.some(s => s.isDefault)) {
      filtered[0] = { ...filtered[0], isDefault: true };
    }

    this.seasonsSignal.set(filtered);
    this.saveCache(filtered);

    // 1. Primary Cloud Persistence: users/{uid}
    if (uid) {
      try {
        const userRef = doc(this.firestore, 'users', uid);
        const newDefault = filtered.find(s => s.isDefault);
        await setDoc(userRef, {
          seasons: filtered,
          defaultSeasonId: newDefault?.id || ''
        }, { merge: true });
      } catch (userErr) {
        console.warn('Could not delete season in user doc:', userErr);
      }

      // 2. Secondary: try deleting from root collection
      try {
        const docRef = doc(this.firestore, `seasons/${seasonId}`);
        await deleteDoc(docRef);
      } catch (colErr) {
        // Safely caught
      }
    }
  }

  /**
   * Get default season if configured, or the first season in list
   */
  getDefaultSeason(): Season | undefined {
    return this.seasonsSignal().find(s => s.isDefault) || this.seasonsSignal()[0];
  }

  /**
   * Find a season by its ID or name
   */
  getSeasonById(seasonId?: string): Season | undefined {
    if (!seasonId) return undefined;
    return this.seasonsSignal().find(s => s.id === seasonId || s.name === seasonId);
  }

  /**
   * Helper to format computed display label for a season object
   */
  formatLabel(season: Partial<Season> | null | undefined): string {
    return getSeasonDisplayLabel(season);
  }

  /**
   * Helper to get computed display label by season document ID
   */
  getLabelById(seasonId?: string): string {
    if (!seasonId) return 'बिना सीज़न / पुराना डेटा';
    const found = this.getSeasonById(seasonId);
    if (!found) return 'बिना सीज़न / पुराना डेटा';
    return getSeasonDisplayLabel(found);
  }

  /**
   * Parse day, month (1-12), and year from common date string formats
   * Supports: "DD-MM-YYYY", "YYYY-MM-DD", "DD/MM/YYYY", "YYYY/MM/DD"
   */
  parseDateParts(dateStr?: string | null): { day: number; month: number; year: number } | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const clean = dateStr.trim().replace(/\//g, '-');
    const parts = clean.split('-');
    if (parts.length !== 3) return null;

    let day = 1;
    let month = 1;
    let year = new Date().getFullYear();

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    if (isNaN(month) || month < 1 || month > 12) return null;
    if (isNaN(year) || year < 2000) year = new Date().getFullYear();

    return { day, month, year };
  }

  /**
   * Resolve season by a specific date string
   */
  getSeasonForDate(dateStr?: string | null): Season | undefined {
    const seasons = this.seasonsSignal();
    if (seasons.length === 0) return undefined;

    const parts = this.parseDateParts(dateStr);
    if (!parts) {
      return this.defaultSeason() || seasons[0];
    }

    const { month, year } = parts;

    // 1. Match both year and month range
    const yearAndMonthMatch = seasons.find(s => {
      const sYear = Number(s.year) || year;
      const sStart = Number(s.startMonth) || 1;
      const sEnd = Number(s.endMonth) || 12;

      const isYearMatch = sYear === year;
      let isMonthMatch = false;
      if (sStart <= sEnd) {
        isMonthMatch = month >= sStart && month <= sEnd;
      } else {
        // Spans year boundary (e.g. Oct 10 to Mar 3)
        isMonthMatch = month >= sStart || month <= sEnd;
      }

      return isYearMatch && isMonthMatch;
    });

    if (yearAndMonthMatch) return yearAndMonthMatch;

    // 2. Match month range only (if year differed)
    const monthOnlyMatch = seasons.find(s => {
      const sStart = Number(s.startMonth) || 1;
      const sEnd = Number(s.endMonth) || 12;
      if (sStart <= sEnd) {
        return month >= sStart && month <= sEnd;
      } else {
        return month >= sStart || month <= sEnd;
      }
    });

    if (monthOnlyMatch) return monthOnlyMatch;

    // 3. Fallback to default season or first season
    return this.defaultSeason() || seasons[0];
  }

  /**
   * Resolve season for any record (first by seasonId, then inferred by record.date)
   */
  getSeasonForRecord(record?: { seasonId?: string; date?: string } | null): Season | undefined {
    if (!record) return this.defaultSeason() || undefined;

    if (record.seasonId) {
      const byId = this.getSeasonById(record.seasonId);
      if (byId) return byId;
      const byName = this.seasonsSignal().find(s => s.name.toLowerCase() === record.seasonId?.toLowerCase());
      if (byName) return byName;
    }

    return this.getSeasonForDate(record.date);
  }

  /**
   * Return a concise badge label for display inside cards and pills
   * e.g. "गेहूं सीज़न 2026" or "धान सीज़न 2026"
   */
  getSeasonBadgeLabel(season?: Season | null): string {
    if (!season) return '';
    const name = season.name?.trim() || '';
    const year = season.year ? String(season.year) : '';
    if (year && !name.includes(year)) {
      return `${name} ${year}`;
    }
    return name;
  }
}
