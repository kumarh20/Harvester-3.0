import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
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

  // READ: only current user's records
  async getUserRecords(): Promise<any[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return [];

    const ref = collection(this.firestore, 'records');
    const recordsMap = new Map<string, any>();

    // Primary query: where('uid', '==', uid) (Authorized by Firestore Security Rules)
    try {
      const q1 = query(ref, where('uid', '==', uid));
      const snap1 = await getDocs(q1);
      snap1.docs.forEach(d => recordsMap.set(d.id, { id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Query by uid error:', e);
    }

    const allRecords = Array.from(recordsMap.values());

    const parseRecordTime = (rec: any): number => {
      if (rec.createdAt?.toDate) {
        return rec.createdAt.toDate().getTime();
      }
      if (rec.date && typeof rec.date === 'string') {
        const clean = rec.date.trim().replace(/\//g, '-');
        const parts = clean.split('-');
        if (parts.length === 3) {
          let year: number, month: number, day: number;
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
          }
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            let hours = 0;
            let minutes = 0;
            if (rec.cuttingTime && typeof rec.cuttingTime === 'string') {
              const timeParts = rec.cuttingTime.split(':');
              if (timeParts.length >= 2) {
                hours = parseInt(timeParts[0], 10) || 0;
                minutes = parseInt(timeParts[1], 10) || 0;
              }
            }
            return new Date(year, month, day, hours, minutes).getTime();
          }
        }
      }
      const fallback = new Date(rec.date || rec.createdAt || 0).getTime();
      return isNaN(fallback) ? 0 : fallback;
    };

    // Sort by date and time descending (newest first)
    return allRecords.sort((a, b) => {
      return parseRecordTime(b) - parseRecordTime(a);
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

  // -----------------------------
  // REMINDERS / FUTURE BOOKINGS
  // -----------------------------

  // READ: only current user's reminders
  async getUserReminders(): Promise<any[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return [];

    const remindersMap = new Map<string, any>();

    // 1. Try reading from 'reminders' collection
    try {
      const ref = collection(this.firestore, 'reminders');
      const q = query(ref, where('uid', '==', uid));
      const snap = await getDocs(q);
      snap.docs.forEach(d => remindersMap.set(d.id, { id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Query reminders collection (rules may restrict collection query):', e);
    }

    // 2. Also read from user document: users/{uid}.reminders
    try {
      const userRef = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const storedReminders = userData?.['reminders'];
        if (Array.isArray(storedReminders)) {
          storedReminders.forEach((r: any) => {
            if (r && (r.id || r._id)) {
              const rId = r.id || r._id;
              if (!remindersMap.has(rId)) {
                remindersMap.set(rId, { ...r, id: rId });
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Query user doc reminders:', e);
    }

    const allReminders = Array.from(remindersMap.values());

    const parseReminderDate = (rem: any): number => {
      if (rem.scheduledDate && typeof rem.scheduledDate === 'string') {
        const clean = rem.scheduledDate.trim().replace(/\//g, '-');
        const parts = clean.split('-');
        if (parts.length === 3) {
          let year: number, month: number, day: number;
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
          }
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            let hours = 8;
            let minutes = 0;
            if (rem.scheduledTime && typeof rem.scheduledTime === 'string') {
              const tParts = rem.scheduledTime.split(':');
              if (tParts.length >= 2) {
                hours = parseInt(tParts[0], 10) || 0;
                minutes = parseInt(tParts[1], 10) || 0;
              }
            }
            return new Date(year, month, day, hours, minutes).getTime();
          }
        }
      }
      return 0;
    };

    // Sort by scheduledDate ascending (soonest first)
    return allReminders.sort((a, b) => parseReminderDate(a) - parseReminderDate(b));
  }

  // CREATE REMINDER
  async addReminder(reminder: any): Promise<{ id: string }> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('User not logged in');

    const cleanPhone = this.getCleanPhone();
    const reminderId = reminder.id || ('rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const reminderPayload = {
      ...reminder,
      id: reminderId,
      uid,
      status: reminder.status || 'pending',
      ...(cleanPhone ? { userPhone: cleanPhone } : {}),
      createdAt: reminder.createdAt || new Date().toISOString()
    };

    let savedToCollection = false;

    // 1. Try writing directly to 'reminders' collection
    try {
      const remDocRef = doc(this.firestore, `reminders/${reminderId}`);
      await setDoc(remDocRef, reminderPayload);
      savedToCollection = true;
    } catch (err: any) {
      console.warn('Could not save to reminders collection (permissions), using user profile storage:', err);
    }

    // 2. Always persist into user profile document (users/{uid}.reminders)
    // Every authenticated user is guaranteed to have write access to their own user document
    try {
      const userRef = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      let list: any[] = [];
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (Array.isArray(userData?.['reminders'])) {
          list = [...userData['reminders']];
        }
      }
      list = list.filter(r => r.id !== reminderId);
      list.unshift(reminderPayload);

      await setDoc(userRef, { reminders: list }, { merge: true });
    } catch (userDocErr: any) {
      console.warn('Could not save to user document:', userDocErr);
      if (!savedToCollection) {
        // Fallback: Still save to local storage cache so user never loses data
        try {
          const cachedStr = localStorage.getItem('harvester_reminders_cache');
          let cached: any[] = cachedStr ? JSON.parse(cachedStr) : [];
          cached = cached.filter((r: any) => r.id !== reminderId);
          cached.unshift(reminderPayload);
          localStorage.setItem('harvester_reminders_cache', JSON.stringify(cached));
        } catch {}
      }
    }

    return { id: reminderId };
  }

  // UPDATE REMINDER
  async updateReminder(id: string, data: any): Promise<void> {
    const uid = this.auth.currentUser?.uid;

    // 1. Try updating in 'reminders' collection
    try {
      await updateDoc(doc(this.firestore, `reminders/${id}`), data);
    } catch (err) {
      console.warn('Could not update in reminders collection (permissions):', err);
    }

    // 2. Always update in user profile document (users/{uid}.reminders)
    if (uid) {
      try {
        const userRef = doc(this.firestore, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (Array.isArray(userData?.['reminders'])) {
            const updated = userData['reminders'].map((r: any) => {
              if (r.id === id) {
                return { ...r, ...data };
              }
              return r;
            });
            await setDoc(userRef, { reminders: updated }, { merge: true });
          }
        }
      } catch (err) {
        console.warn('Could not update in user document:', err);
      }
    }

    // 3. Keep local storage in sync
    try {
      const cachedStr = localStorage.getItem('harvester_reminders_cache');
      if (cachedStr) {
        const cached: any[] = JSON.parse(cachedStr);
        const updated = cached.map((r: any) => r.id === id ? { ...r, ...data } : r);
        localStorage.setItem('harvester_reminders_cache', JSON.stringify(updated));
      }
    } catch {}
  }

  // DELETE REMINDER
  async deleteReminder(id: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;

    // 1. Try deleting from 'reminders' collection
    try {
      await deleteDoc(doc(this.firestore, `reminders/${id}`));
    } catch (err) {
      console.warn('Could not delete from reminders collection (permissions):', err);
    }

    // 2. Always remove from user profile document (users/{uid}.reminders)
    if (uid) {
      try {
        const userRef = doc(this.firestore, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (Array.isArray(userData?.['reminders'])) {
            const filtered = userData['reminders'].filter((r: any) => r.id !== id);
            await setDoc(userRef, { reminders: filtered }, { merge: true });
          }
        }
      } catch (err) {
        console.warn('Could not delete from user document:', err);
      }
    }

    // 3. Keep local storage in sync
    try {
      const cachedStr = localStorage.getItem('harvester_reminders_cache');
      if (cachedStr) {
        const cached: any[] = JSON.parse(cachedStr);
        const filtered = cached.filter((r: any) => r.id !== id);
        localStorage.setItem('harvester_reminders_cache', JSON.stringify(filtered));
      }
    } catch {}
  }
}
