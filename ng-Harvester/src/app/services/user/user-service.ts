import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
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
