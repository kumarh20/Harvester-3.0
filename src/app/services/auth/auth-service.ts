import { Injectable } from '@angular/core';
import { Auth, type User } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private auth: Auth) {}

  // Convert phone to email for standard Firebase Email/Password auth
  private phoneToEmail(phone: string): string {
    return `${phone}@harvester.app`;
  }

  async signup(phone: string, password: string): Promise<User> {
    const email = this.phoneToEmail(phone);
    const result = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );
    return result.user;
  }

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
