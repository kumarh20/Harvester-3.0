import { Injectable, inject } from '@angular/core';
import { FirestoreService } from '../../services/firestore/firestore-service';
import { Record } from '../../core/models/record.model';

/**
 * Dashboard API Service
 * Exclusively handles raw data acquisition for the Dashboard feature.
 * Adheres to Single Responsibility Principle (SRP).
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {
  private firestoreService = inject(FirestoreService);

  /**
   * Fetch raw user harvest records from backend/Firestore
   */
  async fetchUserRecords(): Promise<Record[]> {
    return this.firestoreService.getUserRecords();
  }
}
