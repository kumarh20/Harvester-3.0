import { computed, Injectable, signal } from '@angular/core';
import { FirestoreService } from '../../services/firestore-service';

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

  private recordsSignal = signal<Record[]>([]);
  records = computed(() => this.recordsSignal());

  isLoading = signal<boolean>(false);

  constructor(private firestoreService: FirestoreService) {}

  async loadRecords(): Promise<void> {
    const records = await this.firestoreService.getAllRecords();
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
