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

  /** Extract clean 10-digit Indian phone number from current user */
  private getCleanPhone(): string | null {
    const user = this.auth.currentUser;
    if (!user) return null;

    if (user.email && user.email.includes('@harvester.app')) {
      const p = user.email.split('@')[0].replace(/\D/g, '').slice(-10);
      if (p.length === 10) return p;
    }
    if (user.phoneNumber) {
      const p = user.phoneNumber.replace(/\D/g, '').slice(-10);
      if (p.length === 10) return p;
    }
    if (user.uid && user.uid.startsWith('phone_')) {
      const p = user.uid.replace('phone_', '').replace(/\D/g, '').slice(-10);
      if (p.length === 10) return p;
    }
    return null;
  }

  // READ: only current user's records (unified across Auth UID and phone_UID)
  async getUserRecords(): Promise<any[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return [];

    const ref = collection(this.firestore, 'records');
    const recordsMap = new Map<string, any>();

    // 1. Primary query: where('uid', '==', uid)
    try {
      const q1 = query(ref, where('uid', '==', uid));
      const snap1 = await getDocs(q1);
      snap1.docs.forEach(d => recordsMap.set(d.id, { id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Query by uid error:', e);
    }

    // 2. Secondary query: if user has cleanPhone, check alternative phone UID e.g. phone_XXXXXXXXXX or linked records
    const cleanPhone = this.getCleanPhone();
    if (cleanPhone) {
      const phoneUid = `phone_${cleanPhone}`;
      if (phoneUid !== uid) {
        try {
          const qPhone = query(ref, where('uid', '==', phoneUid));
          const snapPhone = await getDocs(qPhone);
          snapPhone.docs.forEach(d => {
            if (!recordsMap.has(d.id)) {
              recordsMap.set(d.id, { id: d.id, ...d.data() });
            }
          });
        } catch (e) {
          console.warn('Query by phoneUid error:', e);
        }
      }

      // Also check if any records were tagged with userPhone == cleanPhone
      try {
        const qUserPhone = query(ref, where('userPhone', '==', cleanPhone));
        const snapUserPhone = await getDocs(qUserPhone);
        snapUserPhone.docs.forEach(d => {
          if (!recordsMap.has(d.id)) {
            recordsMap.set(d.id, { id: d.id, ...d.data() });
          }
        });
      } catch (e) {
        // userPhone field might not exist on older records, silent ignore
      }

      // 3. Also check if there is a linked user document with the same phone to find another Auth UID
      try {
        const usersRef = collection(this.firestore, 'users');
        const userQ = query(usersRef, where('phone', '==', cleanPhone));
        const userSnap = await getDocs(userQ);
        for (const userDoc of userSnap.docs) {
          const altUid = userDoc.id;
          if (altUid !== uid && altUid !== `phone_${cleanPhone}`) {
            const qAlt = query(ref, where('uid', '==', altUid));
            const snapAlt = await getDocs(qAlt);
            snapAlt.docs.forEach(d => {
              if (!recordsMap.has(d.id)) {
                recordsMap.set(d.id, { id: d.id, ...d.data() });
              }
            });
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    const allRecords = Array.from(recordsMap.values());

    // Sort by date or createdAt descending
    return allRecords.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }

  // CREATE
  async addRecord(record: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not logged in');

    const cleanPhone = this.getCleanPhone();
    const ref = collection(this.firestore, 'records');
    return addDoc(ref, {
      ...record,
      uid,
      ...(cleanPhone ? { userPhone: cleanPhone } : {}),
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
