import { Injectable, inject } from '@angular/core';
import { FirestoreService } from '../../services/firestore/firestore-service';
import { Record } from '../../core/models/record.model';

/**
 * Records API Service
 * Exclusively handles CRUD operations with backend Firestore for harvest records.
 * Adheres to Single Responsibility Principle (SRP).
 */
@Injectable({
  providedIn: 'root'
})
export class RecordsApiService {
  private firestoreService = inject(FirestoreService);

  async fetchRecords(): Promise<Record[]> {
    return this.firestoreService.getUserRecords();
  }

  async createRecord(recordData: Omit<Record, 'id'>): Promise<any> {
    return this.firestoreService.addRecord(recordData);
  }

  async updateRecord(id: string, recordData: Partial<Record>): Promise<void> {
    return this.firestoreService.updateRecord(id, recordData);
  }

  async deleteRecord(id: string): Promise<void> {
    return this.firestoreService.deleteRecord(id);
  }
}
