import { computed, Injectable, signal } from '@angular/core';
import { FirestoreService } from '../../services/firestore/firestore-service';

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
  /** Optional harvester name (e.g. Harvester 1, Harvester 2) */
  harvester?: string;
  /** When true, record is soft-deleted: shown with strikethrough, pending = 0, status Paid. User can edit to revert. */
  markedAsPaid?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecordsService {

  private recordsSignal = signal<Record[]>([]);
  records = computed(() => this.recordsSignal());

  isLoading = signal<boolean>(false);

  constructor(private firestoreService: FirestoreService) {}

  async loadRecords(): Promise<void> {
    const records = await this.firestoreService.getUserRecords();
    this.recordsSignal.set(records);
  }
  

  refreshRecords(): void {
    this.loadRecords();
  }

  addRecord(record: any) {
    return this.firestoreService.addRecord(record);
  }

  updateRecord(id: string, data: any) {
    return this.firestoreService.updateRecord(id, data);
  }

  /**
   * Mark record as paid (soft delete): set pendingAmount = 0, paidOnSight = totalPayment, markedAsPaid = true.
   * Record stays in Firestore; user can edit later to revert.
   */
  async markRecordAsPaid(id: string): Promise<void> {
    const record = this.getRecordById(id);
    if (!record) throw new Error('Record not found');
    const total = record.totalPayment ?? 0;
    await this.firestoreService.updateRecord(id, {
      paidOnSight: total,
      pendingAmount: 0,
      markedAsPaid: true
    });
    await this.loadRecords();
  }

  deleteRecord(id: string) {
    return this.firestoreService.deleteRecord(id);
  }

  getAllRecords(): Record[] {
    return this.recordsSignal();
  }

  getRecordById(id: string): Record | undefined {
    return this.recordsSignal().find(r => r.id === id);
  }

  clearAllRecords(): void {
    this.recordsSignal.set([]);
  }
}
