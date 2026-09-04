import { ChangeDetectorRef, Component, OnDestroy, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth/auth-service';
import { UserService } from '../../services/user/user-service';
import { LoaderService } from '../../shared/services/loader.service';
import { ToastService } from '../../shared/services/toast.service';
import { TranslationService } from '../../shared/services/translation.service';

type AuthState = 'WELCOME' | 'LOGIN' | 'SIGNUP' | 'WHATSAPP';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule
  ],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('cardContent', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AuthPageComponent implements OnDestroy {

  // ---------- UI STATE ----------
  currentState = signal<AuthState>('WELCOME');
  timeGreeting = computed(() => {
    this.translationService.t();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const hour = new Date().getHours();
    if (hour < 12) return isHi ? 'सुप्रभात!' : 'Good morning!';
    if (hour < 17) return isHi ? 'शुभ दोपहर!' : 'Good afternoon!';
    return isHi ? 'शुभ संध्या!' : 'Good evening!';
  });

  rememberMe = signal(false);
  agreeToTerms = signal(false);

  hideLoginPassword = signal(true);
  hideSignupPassword = signal(true);

  // ---------- FORMS ----------
  loginForm!: FormGroup;
  signupForm!: FormGroup;
  whatsappForm!: FormGroup;

  // ---------- OTP STATE (Signup) ----------
  otpSent = false;
  otpVerified = false;
  otp = '';
  loadingOTP = false;
  resendingOTP = false;

  // ---------- OTP STATE (Login - required after logout from Settings) ----------
  loginOtpSent = false;
  loginOtpVerified = false;
  loginOtp = '';
  loadingLoginOTP = false;
  resendingLoginOTP = false;
  /** When true, user chose "Login with password" — show password field + submit, skip OTP */
  loginWithPasswordOnly = false;
  otpSessionId: string = '';
  /** Session ID for login OTP verify (from sendOTPForLogin) */
  loginOtpSessionId: string = '';

  // ---------- WHATSAPP OTP STATE ----------
  whatsappOtpSent = false;
  whatsappOtp = '';
  whatsappSessionId = '';
  loadingWhatsApp = false;
  resendingWhatsApp = false;
  whatsappCountdown = 0;
  whatsappResendCooldown = 0;
  private whatsappTimer: any = null;
  private whatsappCooldownTimer: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private loaderService: LoaderService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    public translationService: TranslationService
  ) {
    this.initializeForms();
  }

  // =============================
  // FORM INITIALIZATION
  // =============================
  private initializeForms(): void {
    const strongPasswordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/;

    this.loginForm = this.fb.group({
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required]]
    });

    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: [
        '',
        [Validators.required, Validators.pattern(strongPasswordPattern)]
      ]
    });

    this.whatsappForm = this.fb.group({
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]]
    });
  }

  get whatsappCountdownDisplay(): string {
    const mins = Math.floor(this.whatsappCountdown / 60);
    const secs = this.whatsappCountdown % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 17) return 'Good afternoon!';
    return 'Good evening!';
  }

  // =============================
  // LOGIN (after logout: number + OTP required first)
  // =============================
  async onLogin(): Promise<void> {
    const allowedWithoutOtp = this.loginOtpVerified || this.loginWithPasswordOnly;
    if (!allowedWithoutOtp) {
      this.toastService.warning('Please verify OTP first (Send OTP → Verify OTP) or use Login with password');
      return;
    }
    if (this.loginForm.invalid) {
      this.toastService.warning('Please enter valid login details');
      return;
    }

    this.loaderService.show();

    try {
      const { phone, password } = this.loginForm.value;
      const user = await this.authService.login(phone, password);
      await this.userService.updateLastLogin(user.uid);
      this.toastService.success('Login successful');
      await this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.toastService.error(err?.message || 'Login failed');
    } finally {
      this.loaderService.hide();
    }
  }

  // =============================
  // SEND OTP FOR LOGIN (re-login after logout from Settings)
  // =============================
  async sendOTPForLogin(): Promise<void> {
    if (this.loginForm.get('phone')?.invalid) {
      this.toastService.warning('Enter valid 10-digit phone number');
      return;
    }
    const phone = this.loginForm.get('phone')?.value;
    this.loadingLoginOTP = true;
    this.loginOtpSent = false;
    this.loginOtpVerified = false;
    this.loginOtp = '';
    this.loginOtpSessionId = '';
    try {
      const result = await this.authService.sendSignupOTP(phone, false); // false = login, always send OTP
      if ('existingUser' in result && result.existingUser) {
        this.loginOtpSent = false;
        this.toastService.warning('Unexpected response. Please try again.');
        return;
      }
      this.loginOtpSessionId = 'sessionId' in result ? result.sessionId : '';
      this.loginOtpSent = true;
      this.toastService.success('OTP sent');
    } catch (err: any) {
      this.toastService.error(err?.message || 'Failed to send OTP');
    } finally {
      this.loadingLoginOTP = false;
      this.cdr.detectChanges();
    }
  }

  // =============================
  // VERIFY OTP FOR LOGIN (OTP-only: sign in and go to dashboard, no password)
  // =============================
  async verifyOTPForLogin(): Promise<void> {
    if (!this.loginOtp || this.loginOtp.length !== 6) {
      this.toastService.warning('Enter valid 6-digit OTP');
      return;
    }
    if (!this.loginOtpSessionId) {
      this.toastService.warning('Send OTP first');
      return;
    }
    const phone = this.loginForm.get('phone')?.value;
    if (!phone) {
      this.toastService.warning('Phone number required');
      return;
    }
    this.loadingLoginOTP = true;
    try {
      const user = await this.authService.loginWithOTP(
        this.loginOtpSessionId,
        this.loginOtp,
        phone
      );
      await this.userService.updateLastLogin(user.uid);
      this.toastService.success('Login successful');
      await this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.toastService.error(err?.message || 'OTP verification failed');
    } finally {
      this.loadingLoginOTP = false;
      this.cdr.detectChanges();
    }
  }

  /** Switch to password-only login (hide Send OTP, show password + submit) */
  usePasswordOnlyLogin(): void {
    this.loginWithPasswordOnly = true;
  }

  async resendOTPForLogin(): Promise<void> {
    if (this.loginForm.get('phone')?.invalid) {
      this.toastService.warning('Invalid phone number');
      return;
    }
    const phone = this.loginForm.get('phone')?.value;
    this.resendingLoginOTP = true;
    try {
      const result = await this.authService.sendSignupOTP(phone, false);
      this.loginOtpSessionId = 'sessionId' in result ? result.sessionId : '';
      this.loginOtp = '';
      this.toastService.success('OTP resent');
    } catch (err: any) {
      this.toastService.error(err?.message || 'Failed to resend OTP');
    } finally {
      this.resendingLoginOTP = false;
      this.cdr.detectChanges();
    }
  }

  // =============================
  // SEND OTP (2Factor / SMS)
  // =============================
  async sendOTP(): Promise<void> {
    if (this.signupForm.get('phone')?.invalid) {
      this.toastService.warning('Enter valid phone number');
      return;
    }

    const phone = this.signupForm.get('phone')?.value;
    this.loadingOTP = true;
    this.otpSent = false;
    this.otpVerified = false;
    this.otp = '';
    this.otpSessionId = '';

    try {
      const result = await this.authService.sendSignupOTP(phone);
      if ('existingUser' in result && result.existingUser) {
        this.toastService.warning('You are already registered. Please login.');
        this.setState('LOGIN');
        this.loginForm.patchValue({ phone });
        return;
      }
      this.otpSessionId = 'sessionId' in result ? result.sessionId : '';
      this.otpSent = true;
      this.toastService.success('OTP sent successfully');
    } catch (error: any) {
      this.toastService.error(error?.message || 'Failed to send OTP');
    } finally {
      this.loadingOTP = false;
      this.cdr.detectChanges();
    }
  }

  // =============================
  // VERIFY OTP (then check existing user or show password)
  // =============================
  async verifyOTPAndSignup(): Promise<void> {
    if (!this.otpSessionId) {
      this.toastService.warning('Send OTP first');
      return;
    }
    if (!this.otp || this.otp.length !== 6) {
      this.toastService.warning('Enter valid 6 digit OTP');
      return;
    }

    const phone = this.signupForm.get('phone')?.value;
    if (!phone) return;

    this.loadingOTP = true;
    try {
      const result = await this.authService.verifySignupOTP(
        this.otpSessionId,
        this.otp,
        phone
      );
      if (!result?.verified) {
        this.otpVerified = false;
        this.toastService.error('Invalid OTP');
        return;
      }

      // Existing user? (checked server-side to avoid Firestore permission errors)
      if (result.existingUser) {
        this.toastService.warning('You are an existing user. Please login.');
        this.setState('LOGIN');
        this.loginForm.patchValue({ phone });
        this.otpSent = false;
        this.otpVerified = false;
        this.otp = '';
        this.cdr.detectChanges();
        return;
      }

      // New user: show password field, then signup will route to dashboard
      this.otpVerified = true;
      this.toastService.success('OTP verified successfully');
    } catch (error: any) {
      this.toastService.error(error?.message || 'Invalid OTP');
      this.otpVerified = false;
    } finally {
      this.loadingOTP = false;
      this.cdr.detectChanges();
    }
  }
  // =============================
  // FINAL SIGNUP (create user and log in; user stays logged in)
  // =============================
  async onSignup(): Promise<void> {
    if (this.signupForm.invalid) {
      this.toastService.warning('Fill all fields correctly');
      return;
    }

    if (!this.agreeToTerms()) {
      this.toastService.warning('Please accept terms & conditions');
      return;
    }

    if (!this.otpVerified) {
      this.toastService.warning('Please verify OTP first');
      return;
    }

    this.loaderService.show();

    try {
      const { fullName, phone, password } = this.signupForm.value;
      const user = await this.authService.signup(phone, password);
      await this.userService.createUser(user.uid, fullName, phone);
      this.toastService.success('Account created successfully');
      await this.router.navigate(['/dashboard']);
      // User is now logged in; persistence keeps them logged in until they manually logout
    } catch (err: any) {
      this.toastService.error(err?.message || 'Signup failed');
    } finally {
      this.loaderService.hide();
    }
  }

  // =============================
  // RESEND OTP
  // =============================
  async resendOTP(): Promise<void> {
    if (this.signupForm.get('phone')?.invalid) {
      this.toastService.warning('Invalid phone number');
      return;
    }

    const phone = this.signupForm.get('phone')?.value;
    this.resendingOTP = true;

    try {
      const result = await this.authService.sendSignupOTP(phone);
      this.otpSessionId = 'sessionId' in result ? result.sessionId : '';
      this.otp = '';
      this.toastService.success('OTP resent');
    } catch (err: any) {
      this.toastService.error(err?.message || 'Failed to resend OTP');
    } finally {
      this.resendingOTP = false;
      this.cdr.detectChanges();
    }
  }

  // =============================
  // WHATSAPP OTP AUTHENTICATION (MSG91)
  // =============================
  async sendWhatsAppOtp(): Promise<void> {
    if (this.whatsappForm.invalid) {
      this.toastService.warning('Please enter a valid phone number with country code (e.g. +919876543210)');
      return;
    }
    const phone = this.whatsappForm.get('phone')?.value;
    this.loadingWhatsApp = true;
    this.whatsappOtp = '';
    this.whatsappSessionId = '';

    try {
      const res = await this.authService.sendWhatsAppOtp(phone);
      this.whatsappSessionId = res.sessionId;
      this.whatsappOtpSent = true;
      this.toastService.success('OTP sent to your WhatsApp!');
      this.startWhatsAppCountdown(res.expiresInSeconds || 300);
      this.startWhatsAppResendCooldown(60);
    } catch (err: any) {
      const msg = err?.message || 'Failed to send WhatsApp OTP. Please check the number and try again.';
      this.toastService.error(msg);
    } finally {
      this.loadingWhatsApp = false;
      this.cdr.detectChanges();
    }
  }

  async resendWhatsAppOtp(): Promise<void> {
    if (this.whatsappResendCooldown > 0) {
      this.toastService.warning(`Please wait ${this.whatsappResendCooldown}s before requesting a new OTP.`);
      return;
    }
    const phone = this.whatsappForm.get('phone')?.value;
    if (!phone) {
      this.toastService.warning('Phone number is required');
      return;
    }
    this.resendingWhatsApp = true;
    try {
      const res = await this.authService.sendWhatsAppOtp(phone);
      this.whatsappSessionId = res.sessionId;
      this.whatsappOtp = '';
      this.toastService.success('New OTP sent to your WhatsApp!');
      this.startWhatsAppCountdown(res.expiresInSeconds || 300);
      this.startWhatsAppResendCooldown(60);
    } catch (err: any) {
      this.toastService.error(err?.message || 'Failed to resend OTP');
    } finally {
      this.resendingWhatsApp = false;
      this.cdr.detectChanges();
    }
  }

  async verifyWhatsAppOtp(): Promise<void> {
    const cleanOtp = String(this.whatsappOtp || '').trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      this.toastService.warning('Please enter the 6-digit OTP received on WhatsApp');
      return;
    }
    if (!this.whatsappSessionId) {
      this.toastService.warning('Session expired. Please request a new OTP.');
      return;
    }
    const phone = this.whatsappForm.get('phone')?.value;
    this.loadingWhatsApp = true;

    try {
      const user = await this.authService.verifyWhatsAppOtpAndLogin(
        this.whatsappSessionId,
        cleanOtp,
        phone
      );
      this.clearWhatsAppTimers();
      await this.userService.updateLastLogin(user.uid);
      this.toastService.success('WhatsApp Login successful!');
      await this.router.navigate(['/dashboard']);
    } catch (err: any) {
      const msg = err?.message || 'Invalid or expired OTP. Please try again.';
      this.toastService.error(msg);
    } finally {
      this.loadingWhatsApp = false;
      this.cdr.detectChanges();
    }
  }

  changeWhatsAppPhone(): void {
    this.whatsappOtpSent = false;
    this.whatsappOtp = '';
    this.whatsappSessionId = '';
    this.clearWhatsAppTimers();
    this.cdr.detectChanges();
  }

  private startWhatsAppCountdown(seconds: number): void {
    if (this.whatsappTimer) clearInterval(this.whatsappTimer);
    this.whatsappCountdown = seconds;
    this.whatsappTimer = setInterval(() => {
      if (this.whatsappCountdown > 0) {
        this.whatsappCountdown--;
        this.cdr.detectChanges();
      } else {
        clearInterval(this.whatsappTimer);
        this.whatsappTimer = null;
      }
    }, 1000);
  }

  private startWhatsAppResendCooldown(seconds: number): void {
    if (this.whatsappCooldownTimer) clearInterval(this.whatsappCooldownTimer);
    this.whatsappResendCooldown = seconds;
    this.whatsappCooldownTimer = setInterval(() => {
      if (this.whatsappResendCooldown > 0) {
        this.whatsappResendCooldown--;
        this.cdr.detectChanges();
      } else {
        clearInterval(this.whatsappCooldownTimer);
        this.whatsappCooldownTimer = null;
      }
    }, 1000);
  }

  private clearWhatsAppTimers(): void {
    if (this.whatsappTimer) {
      clearInterval(this.whatsappTimer);
      this.whatsappTimer = null;
    }
    if (this.whatsappCooldownTimer) {
      clearInterval(this.whatsappCooldownTimer);
      this.whatsappCooldownTimer = null;
    }
    this.whatsappCountdown = 0;
    this.whatsappResendCooldown = 0;
  }

  ngOnDestroy(): void {
    this.clearWhatsAppTimers();
  }

  // =============================
  // STATE SWITCH
  // =============================
  setState(state: AuthState): void {
    this.currentState.set(state);

    if (state === 'LOGIN') {
      this.loginForm.reset();
      this.loginOtpSent = false;
      this.loginOtpVerified = false;
      this.loginOtp = '';
      this.loginOtpSessionId = '';
      this.loginWithPasswordOnly = false;
    }

    if (state === 'SIGNUP') {
      this.signupForm.reset();
      this.otpSent = false;
      this.otpVerified = false;
      this.otp = '';
    }

    if (state === 'WHATSAPP') {
      this.whatsappForm.reset();
      this.whatsappOtpSent = false;
      this.whatsappOtp = '';
      this.whatsappSessionId = '';
      this.clearWhatsAppTimers();
    } else {
      this.clearWhatsAppTimers();
    }
  }
}
