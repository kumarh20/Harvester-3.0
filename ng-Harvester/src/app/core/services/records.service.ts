import { Injectable, signal } from '@angular/core';
import { CloudSyncService, LocalRecord } from './cloud-sync.service';
import { firstValueFrom } from 'rxjs';

export interface Record {
  id: string;
  farmerName: string;
  contactNumber: string;
  date: string;
  landInAcres: number;
  ratePerAcre: number;
  paidOnSight: number;
  fullPaymentDate: string;
  totalPayment: number;
  pendingAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecordsService {
  // Signal to store all records
  private recordsSignal = signal<Record[]>([]);

  // Public accessor for records
  records = this.recordsSignal.asReadonly();

  // Loading state
  isLoading = signal<boolean>(false);

  constructor(private cloudSync: CloudSyncService) {
    this.loadRecords();
  }

  /**
   * Load records from cloud (primary) or localStorage (fallback)
   */
  private async loadRecords(): Promise<void> {
    this.isLoading.set(true);

    try {
      // Try to load from cloud
      const cloudRecords = await firstValueFrom(this.cloudSync.loadRecordsFromCloud());

      if (cloudRecords && cloudRecords.length > 0) {
        this.recordsSignal.set(cloudRecords);
        // Also save to localStorage as backup
        this.saveToLocalStorage();
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem('harvester_records');
        if (stored) {
          const parsed = JSON.parse(stored);
          const migrated = this.migrateOldData(parsed);
          this.recordsSignal.set(migrated);
        }
      }
    } catch (error) {
      console.error('Error loading records:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('harvester_records');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const migrated = this.migrateOldData(parsed);
          this.recordsSignal.set(migrated);
        } catch (parseError) {
          console.error('Error parsing localStorage records:', parseError);
          this.recordsSignal.set([]);
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Migrate old data with Hindi column names to English
   */
  private migrateOldData(data: any[]): Record[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: any) => {
      // If already in English format, return as is
      if (item.farmerName !== undefined) {
        return item as Record;
      }

      // Migrate from old field names to current structure
      return {
        id: item.id || item.ID || Date.now().toString(),
        farmerName: item.farmerName || '',
        contactNumber: item.contactNumber || '',
        date: item.date || '',
        landInAcres: parseFloat(item.landInAcres?.toString() || '0'),
        ratePerAcre: parseFloat(item.ratePerAcre?.toString() || '0'),
        totalPayment: parseFloat(item.totalPayment?.toString() || '0'),
        paidOnSight: parseFloat(item.paidOnSight?.toString() || item.nakadPaid?.toString() || '0'),
        pendingAmount: parseFloat(item.pendingAmount?.toString() || (parseFloat(item.totalPayment?.toString() || '0') - parseFloat(item.paidOnSight?.toString() || item.nakadPaid?.toString() || '0'))),
        fullPaymentDate: item.fullPaymentDate || ''
      };
    });
  }

  /**
   * Save records to localStorage
   */
  private saveToLocalStorage(): void {
    localStorage.setItem('harvester_records', JSON.stringify(this.recordsSignal()));
  }

  /**
   * Reload records from cloud
   */
  async refreshRecords(): Promise<void> {
    await this.loadRecords();
  }

  /**
   * Add a new record (save to both cloud and localStorage)
   */
  async addRecord(record: Omit<Record, 'id'>): Promise<Record> {
    const newRecord: Record = {
      ...record,
      id: Date.now().toString()
    };

    // Add to local state immediately
    this.recordsSignal.update(records => [...records, newRecord]);
    this.saveToLocalStorage();

    // Sync to cloud (async, non-blocking)
    try {
      await firstValueFrom(this.cloudSync.saveRecordToCloud(newRecord));
      // Reload from cloud to get server-assigned ID if any
      await this.loadRecords();
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      // Record is still saved locally
    }

    return newRecord;
  }

  /**
   * Update an existing record
   */
  async updateRecord(id: string, updates: Partial<Record>): Promise<void> {
    // Update locally first
    this.recordsSignal.update(records =>
      records.map(record => record.id === id ? { ...record, ...updates } : record)
    );
    this.saveToLocalStorage();

    // Sync to cloud
    const updatedRecord = this.recordsSignal().find(r => r.id === id);
    if (updatedRecord) {
      try {
        await firstValueFrom(this.cloudSync.updateRecordInCloud(updatedRecord));
      } catch (error) {
        console.error('Error syncing update to cloud:', error);
      }
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord(id: string): Promise<void> {
    // Delete locally first
    this.recordsSignal.update(records => records.filter(record => record.id !== id));
    this.saveToLocalStorage();

    // Sync deletion to cloud
    try {
      await firstValueFrom(this.cloudSync.deleteRecordFromCloud(id));
    } catch (error) {
      console.error('Error syncing deletion to cloud:', error);
    }
  }

  /**
   * Get all records
   */
  getAllRecords(): Record[] {
    return this.recordsSignal();
  }

  /**
   * Get a single record by ID
   */
  getRecordById(id: string): Record | undefined {
    return this.recordsSignal().find(record => record.id === id);
  }

  /**
   * Clear all records
   */
  clearAllRecords(): void {
    this.recordsSignal.set([]);
    localStorage.removeItem('harvester_records');
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.cloudSync.getDeviceId();
  }

  /**
   * Check sync status
   */
  isSyncing(): boolean {
    return this.cloudSync.isSyncing();
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.cloudSync.lastSyncTime();
  }

  /**
   * Get sync error
   */
  getSyncError(): string | null {
    return this.cloudSync.syncError();
  }
}
