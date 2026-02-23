import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  serverTimestamp
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class UserService {

  constructor(private firestore: Firestore) {}

  async getUser(uid: string) {
    const ref = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  /** Check if a user with this phone already exists in Firestore. */
  async getUserByPhone(phone: string): Promise<{ uid: string } | null> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('phone', '==', phone), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return data?.["uid"] ? { uid: data["uid"] as string } : null;
  }

  async createUser(uid: string, name: string, phone: string) {
    const ref = doc(this.firestore, `users/${uid}`);
    return setDoc(ref, {
      uid,
      name,
      phone,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
  }

  async updateLastLogin(uid: string) {
    const ref = doc(this.firestore, `users/${uid}`);
    return setDoc(ref, {
      lastLoginAt: serverTimestamp()
    }, { merge: true });
  }
}
