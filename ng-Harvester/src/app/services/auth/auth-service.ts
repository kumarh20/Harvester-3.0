import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  User
} from '@angular/fire/auth';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from '@angular/fire/functions';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private functions = getFunctions(undefined, 'us-central1');

  constructor(private auth: Auth) {
    // connectFunctionsEmulator(this.functions, '127.0.0.1', 5001);


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

  /** Sends OTP. For signup (forSignup=true): only if user is new. For login (forSignup=false): always. Returns { sessionId } or { existingUser: true }. */
  async sendSignupOTP(phone: string, forSignup = true): Promise<{ sessionId: string } | { existingUser: true }> {
    const fn = httpsCallable<
      { phone: string; forSignup?: boolean },
      { success: boolean; sessionId?: string; existingUser?: boolean }
    >(this.functions, 'sendSignupOTP');
    const res = await fn({ phone, forSignup });
    const data = res.data;
    if (data?.existingUser) {
      return { existingUser: true };
    }
    if (!data?.sessionId) {
      throw new Error('Invalid response: missing sessionId');
    }
    return { sessionId: data.sessionId };
  }

  /** Verifies OTP. Returns { verified, existingUser?, customToken? } on success. customToken when forLogin=true for OTP-only login. */
  async verifySignupOTP(
    sessionId: string,
    otp: string,
    phone?: string,
    forLogin = false
  ): Promise<{ verified: boolean; existingUser?: boolean; customToken?: string }> {
    const fn = httpsCallable<
      { sessionId: string; otp: string; phone?: string; forLogin?: boolean },
      { verified: boolean; existingUser?: boolean; customToken?: string }
    >(this.functions, 'verifySignupOTP');
    const res = await fn({ sessionId, otp, phone, forLogin });
    return res.data ?? { verified: false };
  }

  /** Login with OTP only: verify OTP and sign in with custom token, no password. */
  async loginWithOTP(sessionId: string, otp: string, phone: string): Promise<User> {
    const result = await this.verifySignupOTP(sessionId, otp, phone, true);
    if (!result?.verified || !result?.customToken) {
      throw new Error(result?.verified === false ? 'Invalid OTP' : 'Login with OTP failed');
    }
    const userCred = await signInWithCustomToken(this.auth, result.customToken);
    return userCred.user;
  }
}
