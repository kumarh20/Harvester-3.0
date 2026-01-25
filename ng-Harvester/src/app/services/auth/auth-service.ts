import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from '@angular/fire/auth';
import {setPersistence, browserLocalPersistence } from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private auth: Auth) {
    setPersistence(this.auth, browserLocalPersistence)
    .then(() => {
      console.log('Firebase session persistence set to LOCAL');
    })
    .catch((error) => {
      console.error('Persistence error', error);
    });
  }

  // Convert phone to email
  private phoneToEmail(phone: string): string {
    return `${phone}@harvester.app`;
  }

  // SIGN UP
  async signup(phone: string, password: string): Promise<User> {
    const email = this.phoneToEmail(phone);
    const result = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    return result.user;
  }

  // LOGIN
  async login(phone: string, password: string): Promise<User> {
    const email = this.phoneToEmail(phone);
    const result = await signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    return result.user;
  }

  logout() {
    return signOut(this.auth);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}
