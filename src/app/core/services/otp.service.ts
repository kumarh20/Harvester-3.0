import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Auth, signInWithCustomToken, UserCredential } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';

/**
 * BASE_URL for the backend API hosted on Vercel.
 * Replace this with your actual Vercel deployment URL once deployed.
 * Example: 'https://harvester-whatsapp-otp.vercel.app'
 */
export const BASE_URL = 'https://harvester-whatsapp-otp-backend.vercel.app';

interface SendOtpResponse {
  success: boolean;
  message?: string;
  details?: any;
}

interface VerifyOtpResponse {
  success: boolean;
  token?: string;
  message?: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class OtpService {
  constructor(
    private http: HttpClient,
    private auth: Auth
  ) {}

  /**
   * Sends a 6-digit WhatsApp OTP to the given 10-digit Indian phone number
   * via the Vercel backend serverless function (/api/send-otp).
   */
  async sendOtp(phoneNumber: string, mode?: 'login' | 'signup'): Promise<void> {
    const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<SendOtpResponse>(`${BASE_URL}/api/send-otp`, {
          phoneNumber: cleanPhone,
          mode: mode
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to send WhatsApp OTP.');
      }
    } catch (error: any) {
      const errorObj = error?.error;
      const errMsg =
        errorObj?.message ||
        error?.message ||
        'Could not reach the OTP service. Please verify your connection.';
      
      const customErr: any = new Error(errMsg);
      customErr.code = errorObj?.code;
      throw customErr;
    }
  }

  /**
   * Verifies the 6-digit OTP via the Vercel backend serverless function (/api/verify-otp).
   * On successful verification, receives a Firebase custom token and signs the user in
   * using signInWithCustomToken from Firebase Auth.
   * Returns true on success, or throws/returns false on failure.
   */
  async verifyOtpAndLogin(phoneNumber: string, otp: string, fullName?: string): Promise<boolean> {
    const cleanPhone = String(phoneNumber).replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();

    if (cleanPhone.length !== 10) {
      throw new Error('Please enter a valid 10-digit phone number.');
    }

    if (cleanOtp.length !== 6) {
      throw new Error('Please enter the complete 6-digit OTP.');
    }

    try {
      const response = await firstValueFrom(
        this.http.post<VerifyOtpResponse>(`${BASE_URL}/api/verify-otp`, {
          phoneNumber: cleanPhone,
          otp: cleanOtp,
          fullName: fullName ? fullName.trim() : undefined
        })
      );

      if (!response || !response.success || !response.token) {
        throw new Error(response?.message || 'OTP verification failed.');
      }

      // Sign in user into Firebase Auth using the custom token
      const userCredential: UserCredential = await signInWithCustomToken(
        this.auth,
        response.token
      );

      return !!userCredential.user;
    } catch (error: any) {
      const errMsg =
        error?.error?.message ||
        error?.message ||
        'OTP verification failed. Please try again.';
      throw new Error(errMsg);
    }
  }
}
