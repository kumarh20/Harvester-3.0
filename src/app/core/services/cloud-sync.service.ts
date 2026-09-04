// import { Injectable, signal } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Observable, catchError, map, of, tap } from 'rxjs';
// import { TranslationService } from '../../shared/services/translation.service';

// export interface CloudRecord {
//   id?: string; // Entry ID from Google Sheet
//   farmerName: string;
//   contactNumber: string;
//   date: string;
//   landInAcres: number;
//   ratePerAcre: number;
//   totalPayment: number;
//   paidOnSight: number;
//   fullPaymentDate: string;
// }

// export interface LocalRecord {
//   id: string;
//   farmerName: string;
//   contactNumber: string;
//   date: string;
//   landInAcres: number;
//   ratePerAcre: number;
//   totalPayment: number;
//   paidOnSight: number;
//   pendingAmount: number;
//   fullPaymentDate: string;
//   harvester?: string;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class CloudSyncService {
//   private readonly API_URL = 'http://localhost:3000/api/cloud-data';
//   private deviceId = signal<string>('');
//   public isSyncing = signal<boolean>(false);
//   public lastSyncTime = signal<Date | null>(null);
//   public syncError = signal<string | null>(null);

//   constructor(
//     private http: HttpClient,
//     private translationService: TranslationService
//   ) {
//     this.initializeDeviceId();
//   }

//   /**
//    * Initialize device ID (or retrieve from localStorage)
//    */
//   private initializeDeviceId(): void {
//     let id = localStorage.getItem('deviceId');
//     if (!id) {
//       id = `device_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
//       localStorage.setItem('deviceId', id);
//     }
//     this.deviceId.set(id);
//     console.log('Device ID:', id);
//   }

//   /**
//    * Get device ID
//    */
//   getDeviceId(): string {
//     return this.deviceId();
//   }

//   /**
//    * Load records from cloud
//    */
//   loadRecordsFromCloud(): Observable<LocalRecord[]> {
//     this.isSyncing.set(true);
//     this.syncError.set(null);

//     return this.http.get<CloudRecord[]>(`${this.API_URL}?deviceId=${this.deviceId()}`).pipe(
//       map((cloudRecords) => this.convertCloudToLocal(cloudRecords)),
//       tap({
//         next: () => {
//           this.isSyncing.set(false);
//           this.lastSyncTime.set(new Date());
//         },
//         error: (error) => {
//           console.error('Error loading records from cloud:', error);
//           this.isSyncing.set(false);
//           this.syncError.set(this.translationService.get('messages.saveError'));
//         }
//       }),
//       catchError((error) => {
//         console.error('Cloud sync error:', error);
//         return of([]); // Return empty array on error
//       })
//     );
//   }

//   /**
//    * Save record to cloud
//    */
//   saveRecordToCloud(record: LocalRecord): Observable<any> {
//     this.isSyncing.set(true);
//     this.syncError.set(null);

//     const payload = {
//       deviceId: this.deviceId(),
//       farmerName: record.farmerName,
//       contactNumber: record.contactNumber,
//       date: record.date,
//       landInAcres: record.landInAcres.toString(),
//       ratePerAcre: record.ratePerAcre.toString(),
//       totalPayment: record.totalPayment.toString(),
//       paidOnSight: record.paidOnSight.toString(),
//       fullPaymentDate: record.fullPaymentDate || '',
//       ...(record.harvester ? { harvester: record.harvester } : {})
//     };

//     // Log payload to verify it's using English column names
//     console.log('📤 Sending to API with English columns:', payload);

//     return this.http.post(this.API_URL, payload).pipe(
//       tap({
//         next: () => {
//           this.isSyncing.set(false);
//           this.lastSyncTime.set(new Date());
//         },
//         error: (error) => {
//           console.error('Error saving record to cloud:', error);
//           this.isSyncing.set(false);
//           this.syncError.set(this.translationService.get('messages.saveError'));
//         }
//       }),
//       catchError((error) => {
//         console.error('Save to cloud error:', error);
//         return of({ success: false, error: error.message });
//       })
//     );
//   }

//   /**
//    * Update record in cloud
//    */
//   updateRecordInCloud(record: LocalRecord): Observable<any> {
//     this.isSyncing.set(true);
//     this.syncError.set(null);

//     const payload = {
//       _method: 'PUT',
//       id: record.id,
//       deviceId: this.deviceId(),
//       farmerName: record.farmerName,
//       contactNumber: record.contactNumber,
//       date: record.date,
//       landInAcres: record.landInAcres.toString(),
//       ratePerAcre: record.ratePerAcre.toString(),
//       totalPayment: record.totalPayment.toString(),
//       paidOnSight: record.paidOnSight.toString(),
//       fullPaymentDate: record.fullPaymentDate || '',
//       ...(record.harvester ? { harvester: record.harvester } : {})
//     };

//     return this.http.post(this.API_URL, payload).pipe(
//       tap({
//         next: () => {
//           this.isSyncing.set(false);
//           this.lastSyncTime.set(new Date());
//         },
//         error: (error) => {
//           console.error('Error updating record in cloud:', error);
//           this.isSyncing.set(false);
//           this.syncError.set(this.translationService.get('messages.updateError'));
//         }
//       }),
//       catchError((error) => {
//         console.error('Update in cloud error:', error);
//         return of({ success: false, error: error.message });
//       })
//     );
//   }

//   /**
//    * Delete record from cloud
//    */
//   deleteRecordFromCloud(id: string): Observable<any> {
//     this.isSyncing.set(true);
//     this.syncError.set(null);

//     const payload = {
//       _method: 'DELETE',
//       id: id,
//       deviceId: this.deviceId()
//     };

//     return this.http.post(this.API_URL, payload).pipe(
//       tap({
//         next: () => {
//           this.isSyncing.set(false);
//           this.lastSyncTime.set(new Date());
//         },
//         error: (error) => {
//           console.error('Error deleting record from cloud:', error);
//           this.isSyncing.set(false);
//           this.syncError.set(this.translationService.get('messages.deleteError'));
//         }
//       }),
//       catchError((error) => {
//         console.error('Delete from cloud error:', error);
//         return of({ success: false, error: error.message });
//       })
//     );
//   }

//   /**
//    * Convert cloud records to local format
//    * API now returns only English column names
//    * Also handles migration from old Hindi column names if backend still sends them
//    */
//   private convertCloudToLocal(cloudRecords: CloudRecord[] | any[]): LocalRecord[] {
//     if (!Array.isArray(cloudRecords)) {
//       return [];
//     }

//     return cloudRecords.map((item: any) => {
//       // Handle English column names (backward compatibility for old field names)
//       const farmerName = item.farmerName || '';
//       const contactNumber = item.contactNumber || '';
//       const date = item.date || '';
//       const landInAcres = parseFloat(item.landInAcres?.toString() || '0');
//       const ratePerAcre = parseFloat(item.ratePerAcre?.toString() || '0');
//       const totalPayment = parseFloat(item.totalPayment?.toString() || '0');
//       const paidOnSight = parseFloat(item.paidOnSight?.toString() || item.nakadPaid?.toString() || '0');
//       const fullPaymentDate = item.fullPaymentDate || '';

//       return {
//         id: item.id || item.ID ? (item.id || item.ID).toString() : Date.now().toString(),
//         farmerName: farmerName,
//         contactNumber: contactNumber,
//         date: date,
//         landInAcres: landInAcres,
//         ratePerAcre: ratePerAcre,
//         totalPayment: totalPayment,
//         paidOnSight: paidOnSight,
//         pendingAmount: totalPayment - paidOnSight,
//         fullPaymentDate: fullPaymentDate,
//         ...(item.harvester ? { harvester: item.harvester } : {})
//       };
//     });
//   }

//   /**
//    * Check if online
//    */
//   isOnline(): boolean {
//     return navigator.onLine;
//   }

//   /**
//    * Clear sync error
//    */
//   clearSyncError(): void {
//     this.syncError.set(null);
//   }
// }


