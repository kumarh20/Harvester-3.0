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

  /** Sends WhatsApp OTP via Cloud Function (MSG91). Returns { sessionId, expiresInSeconds } */
  async sendWhatsAppOtp(phone: string): Promise<{ sessionId: string; expiresInSeconds: number }> {
    const fn = httpsCallable<
      { phone: string },
      { success: boolean; sessionId: string; expiresInSeconds?: number }
    >(this.functions, 'sendWhatsAppOtp');
    const res = await fn({ phone });
    if (!res.data?.sessionId) {
      throw new Error('Could not initiate WhatsApp OTP session.');
    }
    return {
      sessionId: res.data.sessionId,
      expiresInSeconds: res.data.expiresInSeconds ?? 300
    };
  }

  /** Verifies WhatsApp OTP and signs in user with custom token via Firebase Authentication */
  async verifyWhatsAppOtpAndLogin(sessionId: string, otp: string, phone: string): Promise<User> {
    const fn = httpsCallable<
      { sessionId: string; otp: string; phone: string },
      { verified: boolean; customToken: string; uid: string }
    >(this.functions, 'verifyWhatsAppOtp');
    const res = await fn({ sessionId, otp, phone });
    if (!res.data?.verified || !res.data?.customToken) {
      throw new Error('WhatsApp OTP verification failed.');
    }
    const userCred = await signInWithCustomToken(this.auth, res.data.customToken);
    return userCred.user;
  }
}
