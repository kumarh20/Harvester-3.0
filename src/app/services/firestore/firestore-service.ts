import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class FirestoreService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  // READ: only current user's records
  async getUserRecords(): Promise<any[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return [];

    const ref = collection(this.firestore, 'records');
    const q = query(ref, where('uid', '==', uid));

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // CREATE
  async addRecord(record: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not logged in');

    const ref = collection(this.firestore, 'records');
    return addDoc(ref, {
      ...record,
      uid,
      createdAt: new Date()
    });
  }

  // UPDATE
  updateRecord(id: string, data: any) {
    return updateDoc(doc(this.firestore, `records/${id}`), data);
  }

  // DELETE
  deleteRecord(id: string) {
    return deleteDoc(doc(this.firestore, `records/${id}`));
  }
}
