import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from '@angular/fire/auth';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator
} from '@angular/fire/functions';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private functions = getFunctions();

  constructor(private auth: Auth) {

    // ✅ IMPORTANT: Connect to emulator ONLY in local
    if (location.hostname === 'localhost') {
      connectFunctionsEmulator(this.functions, 'localhost', 5001);
      console.log('Connected to Firebase Functions Emulator');
    }

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

  // ✅ WhatsApp OTP
  sendWhatsAppOTP(phone: string) {
    const fn = httpsCallable(this.functions, 'sendWhatsAppOTP');
    return fn({ phone });
  }

  verifyWhatsAppOTP(phone: string, otp: string) {
    const fn = httpsCallable(this.functions, 'verifyWhatsAppOTP');
    return fn({ phone, otp });
  }
}
