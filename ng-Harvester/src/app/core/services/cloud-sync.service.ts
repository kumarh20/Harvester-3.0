import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

export interface CloudRecord {
  ID?: string;
  'किसान का नाम': string;
  'संपर्क नंबर': string;
  'तारीख': string;
  'ज़मीन (एकड़)': number;
  'प्रति एकड़ दर': number;
  'कुल राशि': number;
  'नकद भुगतान': number;
  'पूरा भुगतान तारीख': string;
}

export interface LocalRecord {
  id: string;
  farmerName: string;
  contactNumber: string;
  date: string;
  landInAcres: number;
  ratePerAcre: number;
  totalPayment: number;
  nakadPaid: number;
  pendingAmount: number;
  fullPaymentDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class CloudSyncService {
  private readonly API_URL = 'http://localhost:3000/api/cloud-data';
  private deviceId = signal<string>('');
  public isSyncing = signal<boolean>(false);
  public lastSyncTime = signal<Date | null>(null);
  public syncError = signal<string | null>(null);

  constructor(private http: HttpClient) {
    this.initializeDeviceId();
  }

  /**
   * Initialize device ID (or retrieve from localStorage)
   */
  private initializeDeviceId(): void {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = `device_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('deviceId', id);
    }
    this.deviceId.set(id);
    console.log('Device ID:', id);
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.deviceId();
  }

  /**
   * Load records from cloud
   */
  loadRecordsFromCloud(): Observable<LocalRecord[]> {
    this.isSyncing.set(true);
    this.syncError.set(null);

    return this.http.get<CloudRecord[]>(`${this.API_URL}?deviceId=${this.deviceId()}`).pipe(
      map((cloudRecords) => this.convertCloudToLocal(cloudRecords)),
      tap({
        next: () => {
          this.isSyncing.set(false);
          this.lastSyncTime.set(new Date());
        },
        error: (error) => {
          console.error('Error loading records from cloud:', error);
          this.isSyncing.set(false);
          this.syncError.set('डेटा लोड करने में समस्या आई');
        }
      }),
      catchError((error) => {
        console.error('Cloud sync error:', error);
        return of([]); // Return empty array on error
      })
    );
  }

  /**
   * Save record to cloud
   */
  saveRecordToCloud(record: LocalRecord): Observable<any> {
    this.isSyncing.set(true);
    this.syncError.set(null);

    const payload = {
      deviceId: this.deviceId(),
      name: record.farmerName,
      contact: record.contactNumber,
      date: record.date,
      acres: record.landInAcres.toString(),
      rate: record.ratePerAcre.toString(),
      total: record.totalPayment.toString(),
      cash: record.nakadPaid.toString(),
      fullPaymentDate: record.fullPaymentDate || ''
    };

    return this.http.post(this.API_URL, payload).pipe(
      tap({
        next: () => {
          this.isSyncing.set(false);
          this.lastSyncTime.set(new Date());
        },
        error: (error) => {
          console.error('Error saving record to cloud:', error);
          this.isSyncing.set(false);
          this.syncError.set('रिकॉर्ड सेव करने में समस्या आई');
        }
      }),
      catchError((error) => {
        console.error('Save to cloud error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Update record in cloud
   */
  updateRecordInCloud(record: LocalRecord): Observable<any> {
    this.isSyncing.set(true);
    this.syncError.set(null);

    const payload = {
      _method: 'PUT',
      id: record.id,
      deviceId: this.deviceId(),
      farmerName: record.farmerName,
      contactNumber: record.contactNumber,
      date: record.date,
      landInAcres: record.landInAcres.toString(),
      ratePerAcre: record.ratePerAcre.toString(),
      totalPayment: record.totalPayment.toString(),
      nakadPaid: record.nakadPaid.toString(),
      fullPaymentDate: record.fullPaymentDate || ''
    };

    return this.http.post(this.API_URL, payload).pipe(
      tap({
        next: () => {
          this.isSyncing.set(false);
          this.lastSyncTime.set(new Date());
        },
        error: (error) => {
          console.error('Error updating record in cloud:', error);
          this.isSyncing.set(false);
          this.syncError.set('रिकॉर्ड अपडेट करने में समस्या आई');
        }
      }),
      catchError((error) => {
        console.error('Update in cloud error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Delete record from cloud
   */
  deleteRecordFromCloud(id: string): Observable<any> {
    this.isSyncing.set(true);
    this.syncError.set(null);

    const payload = {
      _method: 'DELETE',
      id: id,
      deviceId: this.deviceId()
    };

    return this.http.post(this.API_URL, payload).pipe(
      tap({
        next: () => {
          this.isSyncing.set(false);
          this.lastSyncTime.set(new Date());
        },
        error: (error) => {
          console.error('Error deleting record from cloud:', error);
          this.isSyncing.set(false);
          this.syncError.set('रिकॉर्ड डिलीट करने में समस्या आई');
        }
      }),
      catchError((error) => {
        console.error('Delete from cloud error:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Convert cloud records to local format
   */
  private convertCloudToLocal(cloudRecords: CloudRecord[]): LocalRecord[] {
    if (!Array.isArray(cloudRecords)) {
      return [];
    }

    return cloudRecords.map((item) => {
      const totalPayment = parseFloat(item['कुल राशि']?.toString() || '0');
      const nakadPaid = parseFloat(item['नकद भुगतान']?.toString() || '0');

      return {
        id: item.ID ? item.ID.toString() : Date.now().toString(),
        farmerName: item['किसान का नाम'] || '',
        contactNumber: item['संपर्क नंबर'] || '',
        date: item['तारीख'] || '',
        landInAcres: parseFloat(item['ज़मीन (एकड़)']?.toString() || '0'),
        ratePerAcre: parseFloat(item['प्रति एकड़ दर']?.toString() || '0'),
        totalPayment: totalPayment,
        nakadPaid: nakadPaid,
        pendingAmount: totalPayment - nakadPaid,
        fullPaymentDate: item['पूरा भुगतान तारीख'] || ''
      };
    });
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Clear sync error
   */
  clearSyncError(): void {
    this.syncError.set(null);
  }
}

