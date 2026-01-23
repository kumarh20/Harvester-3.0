import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class FirestoreService {

  constructor(private firestore: Firestore) {}

  // ✅ READ (NO collectionData)
  async getAllRecords(): Promise<any[]> {
    const ref = collection(this.firestore, 'records');
    const q = query(ref);

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // ✅ CREATE
  addRecord(record: any) {
    const ref = collection(this.firestore, 'records');
    return addDoc(ref, {
      ...record,
      createdAt: new Date()
    });
  }

  // ✅ UPDATE
  updateRecord(id: string, data: any) {
    return updateDoc(doc(this.firestore, `records/${id}`), data);
  }

  // ✅ DELETE
  deleteRecord(id: string) {
    return deleteDoc(doc(this.firestore, `records/${id}`));
  }
}
