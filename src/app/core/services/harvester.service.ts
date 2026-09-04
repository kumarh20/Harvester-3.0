import { Injectable, signal, computed } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

const DEFAULT_HARVESTERS = ['Harvester 1'];

@Injectable({ providedIn: 'root' })
export class HarvesterService {
  private harvestersSignal = signal<string[]>([]);
  harvesters = computed(() => this.harvestersSignal());

  private defaultHarvesterSignal = signal<string>('');
  defaultHarvester = computed(() => this.defaultHarvesterSignal());

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  private getUserDocRef() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not logged in');
    return doc(this.firestore, 'users', uid);
  }

  /**
   * Load user's harvester list and default selection from Firestore/local cache.
   */
  async loadHarvesters(): Promise<string[]> {
    let localDefault = '';
    let localList: string[] = [];
    try {
      localDefault = localStorage.getItem('default_harvester') || '';
      const cached = localStorage.getItem('harvester_list');
      if (cached) {
        localList = JSON.parse(cached);
      }
    } catch {
      // Ignored
    }

    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      const list = Array.isArray(localList) && localList.length > 0
        ? [...localList]
        : [...DEFAULT_HARVESTERS];
      const activeDefault = (localDefault && list.includes(localDefault))
        ? localDefault
        : list[0];
      this.harvestersSignal.set(list);
      this.defaultHarvesterSignal.set(activeDefault);
      return list;
    }

    try {
      const userRef = doc(this.firestore, 'users', uid);
      const snap = await getDoc(userRef);
      const data = snap.data();
      const list = Array.isArray(data?.['harvesters']) && data!['harvesters'].length > 0
        ? [...(data['harvesters'] as string[])]
        : (localList.length > 0 ? localList : [...DEFAULT_HARVESTERS]);

      let activeDefault = (data?.['defaultHarvester'] as string) || localDefault || list[0];
      if (!list.includes(activeDefault)) {
        activeDefault = list[0] || DEFAULT_HARVESTERS[0];
      }

      this.harvestersSignal.set(list);
      this.defaultHarvesterSignal.set(activeDefault);

      try {
        localStorage.setItem('harvester_list', JSON.stringify(list));
        localStorage.setItem('default_harvester', activeDefault);
      } catch {
        // Ignored
      }
      return list;
    } catch (e) {
      console.warn('Could not load harvesters from Firestore, falling back to local cache', e);
      const list = localList.length > 0 ? localList : [...DEFAULT_HARVESTERS];
      const activeDefault = (localDefault && list.includes(localDefault)) ? localDefault : list[0];
      this.harvestersSignal.set(list);
      this.defaultHarvesterSignal.set(activeDefault);
      return list;
    }
  }

  /**
   * Save full harvester list and default selection to Firestore & localStorage.
   */
  async setHarvesters(harvesters: string[], defaultHarvesterName?: string): Promise<void> {
    const list = harvesters.filter(s => typeof s === 'string' && s.trim().length > 0);
    if (list.length === 0) list.push(DEFAULT_HARVESTERS[0]);

    let activeDefault = defaultHarvesterName || this.defaultHarvesterSignal();
    if (!activeDefault || !list.includes(activeDefault)) {
      activeDefault = list[0];
    }

    this.harvestersSignal.set([...list]);
    this.defaultHarvesterSignal.set(activeDefault);

    try {
      localStorage.setItem('harvester_list', JSON.stringify(list));
      localStorage.setItem('default_harvester', activeDefault);
    } catch {
      // Ignored
    }

    const uid = this.auth.currentUser?.uid;
    if (uid) {
      try {
        const userRef = this.getUserDocRef();
        await setDoc(userRef, { harvesters: list, defaultHarvester: activeDefault }, { merge: true });
      } catch (err) {
        console.error('Error saving harvesters to Firestore:', err);
      }
    }
  }

  /**
   * Set a specific harvester as the default for new records.
   */
  async setDefaultHarvester(name: string): Promise<void> {
    const trimmed = name.trim();
    const list = this.harvestersSignal();
    if (!trimmed || !list.includes(trimmed)) return;

    this.defaultHarvesterSignal.set(trimmed);

    try {
      localStorage.setItem('default_harvester', trimmed);
    } catch {
      // Ignored
    }

    const uid = this.auth.currentUser?.uid;
    if (uid) {
      try {
        const userRef = this.getUserDocRef();
        await setDoc(userRef, { defaultHarvester: trimmed }, { merge: true });
      } catch (err) {
        console.error('Error updating default harvester in Firestore:', err);
      }
    }
  }

  /**
   * Add a new harvester name with optional makeDefault flag.
   */
  async addHarvester(name: string, makeDefault: boolean = false): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.harvestersSignal().slice();
    if (!current.includes(trimmed)) {
      current.push(trimmed);
    }
    const shouldBeDefault = makeDefault || current.length === 1 || !this.defaultHarvesterSignal();
    await this.setHarvesters(current, shouldBeDefault ? trimmed : this.defaultHarvesterSignal());
  }

  /**
   * Update harvester name at index.
   */
  async updateHarvester(index: number, newName: string, makeDefault?: boolean): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const current = this.harvestersSignal().slice();
    if (index < 0 || index >= current.length) return;

    const oldName = current[index];
    current[index] = trimmed;

    let nextDefault = this.defaultHarvesterSignal();
    if (makeDefault === true || oldName === nextDefault) {
      nextDefault = trimmed;
    }

    await this.setHarvesters(current, nextDefault);
  }

  /**
   * Remove harvester at index. Keeps at least one option.
   */
  async removeHarvester(index: number): Promise<void> {
    const current = this.harvestersSignal().slice();
    if (current.length <= 1) return;
    if (index < 0 || index >= current.length) return;

    const removed = current[index];
    current.splice(index, 1);

    let nextDefault = this.defaultHarvesterSignal();
    if (removed === nextDefault) {
      nextDefault = current[0];
    }

    await this.setHarvesters(current, nextDefault);
  }

  /**
   * Get default harvester for new records.
   */
  getDefaultHarvester(): string {
    const activeDefault = this.defaultHarvesterSignal();
    const list = this.harvestersSignal();
    if (activeDefault && list.includes(activeDefault)) {
      return activeDefault;
    }
    return list.length > 0 ? list[0] : DEFAULT_HARVESTERS[0];
  }
}
