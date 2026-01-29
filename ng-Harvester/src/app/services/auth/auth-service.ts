import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from '@angular/fire/auth';
import {setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFunctions, httpsCallable } from '@angular/fire/functions';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private functions = getFunctions();


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
    try {
      const email = this.phoneToEmail(phone);
      const result = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return result.user;
    } catch (error: any) {
      console.error('Signup service error:', error);
      throw error;
    }
  }

  // LOGIN
  async login(phone: string, password: string): Promise<User> {
    try {
      const email = this.phoneToEmail(phone);
      const result = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return result.user;
    } catch (error: any) {
      console.error('Login service error:', error);
      throw error;
    }
  }

  logout() {
    return signOut(this.auth);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // SEND OTP (Signup)
  async sendSignupOTP(phone: string): Promise<any> {
    try {
      const fn = httpsCallable(this.functions, 'sendSignupOTP');
      const result = await fn({ phone });
      return result;
    } catch (error: any) {
      console.error('Send OTP service error:', error);
      throw error;
    }
  }

  // VERIFY OTP (Signup)
  async verifySignupOTP(phone: string, otp: string): Promise<any> {
    try {
      const fn = httpsCallable(this.functions, 'verifySignupOTP');
      const result = await fn({ phone, otp });
      return result;
    } catch (error: any) {
      console.error('Verify OTP service error:', error);
      throw error;
    }
  }

}
