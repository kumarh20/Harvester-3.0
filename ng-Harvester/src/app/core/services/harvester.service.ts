import { Injectable, signal, computed } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

const DEFAULT_HARVESTERS = ['Harvester 1'];

@Injectable({ providedIn: 'root' })
export class HarvesterService {
  private harvestersSignal = signal<string[]>([]);
  harvesters = computed(() => this.harvestersSignal());

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
   * Load user's harvester list from Firestore. If none exists, initializes with default.
   */
  async loadHarvesters(): Promise<string[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.harvestersSignal.set([...DEFAULT_HARVESTERS]);
      return this.harvestersSignal();
    }

    const userRef = doc(this.firestore, 'users', uid);
    const snap = await getDoc(userRef);
    const data = snap.data();
    const list = Array.isArray(data?.['harvesters']) && data!['harvesters'].length > 0
      ? [...(data['harvesters'] as string[])]
      : [...DEFAULT_HARVESTERS];
    this.harvestersSignal.set(list);
    return list;
  }

  /**
   * Save full harvester list to Firestore. Ensures at least one option.
   */
  async setHarvesters(harvesters: string[]): Promise<void> {
    const list = harvesters.filter(s => typeof s === 'string' && s.trim().length > 0);
    if (list.length === 0) list.push(DEFAULT_HARVESTERS[0]);
    const userRef = this.getUserDocRef();
    await setDoc(userRef, { harvesters: list }, { merge: true });
    this.harvestersSignal.set([...list]);
  }

  /**
   * Add a new harvester name.
   */
  async addHarvester(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.harvestersSignal().slice();
    if (current.includes(trimmed)) return;
    current.push(trimmed);
    await this.setHarvesters(current);
  }

  /**
   * Update harvester name at index.
   */
  async updateHarvester(index: number, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const current = this.harvestersSignal().slice();
    if (index < 0 || index >= current.length) return;
    current[index] = trimmed;
    await this.setHarvesters(current);
  }

  /**
   * Remove harvester at index. Keeps at least one option.
   */
  async removeHarvester(index: number): Promise<void> {
    const current = this.harvestersSignal().slice();
    if (current.length <= 1) return;
    if (index < 0 || index >= current.length) return;
    current.splice(index, 1);
    await this.setHarvesters(current);
  }

  /**
   * Get default (first) harvester for new records.
   */
  getDefaultHarvester(): string {
    const list = this.harvestersSignal();
    return list.length > 0 ? list[0] : DEFAULT_HARVESTERS[0];
  }
}
