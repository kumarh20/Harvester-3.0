import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, signal, computed, ViewEncapsulation } from '@angular/core';
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
import { OtpService } from '../../core/services/otp.service';

type AuthState = 'WELCOME' | 'LOGIN' | 'SIGNUP';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AuthPageComponent implements OnDestroy {

  // ---------- UI STATE ----------
  currentState = signal<AuthState>('WELCOME');
  loginWithPasswordMode = signal(false);

  timeGreeting = computed(() => {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const hour = new Date().getHours();
    if (hour < 12) return isHi ? 'सुप्रभात!' : 'Good morning!';
    if (hour < 17) return isHi ? 'शुभ दोपहर!' : 'Good afternoon!';
    return isHi ? 'शुभ संध्या!' : 'Good evening!';
  });

  hideLoginPassword = signal(true);
  rememberMe = signal(false);

  // ---------- SIGN IN STATE (WhatsApp OTP) ----------
  loginPhone = signal('');
  loginPhoneTouched = signal(false);
  loginOtpSent = signal(false);
  loginOtp = signal('');
  loginLoading = signal(false);
  loginResending = signal(false);
  loginCountdown = signal(0);
  loginResendCooldown = signal(0);
  private loginTimer: any = null;
  private loginCooldownTimer: any = null;

  // ---------- SIGN IN VALIDATION (Real-time) ----------
  loginPhoneError = computed(() => {
    const raw = this.loginPhone();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    if (!raw) {
      return this.loginPhoneTouched() ? (isHi ? 'मोबाइल नंबर आवश्यक है' : 'Mobile number is required') : null;
    }
    const clean = raw.replace(/\D/g, '');
    if (clean.length > 0 && !/^[6-9]/.test(clean)) {
      return isHi ? 'मोबाइल नंबर 6, 7, 8 या 9 से शुरू होना चाहिए' : 'Mobile number must start with 6, 7, 8, or 9';
    }
    if (clean.length < 10) {
      return isHi ? `10 अंकों का मोबाइल नंबर दर्ज करें (अभी: ${clean.length}/10)` : `Enter 10-digit mobile number (${clean.length}/10)`;
    }
    if (/^(\d)\1{9}$/.test(clean)) {
      return isHi ? 'कृपया मान्य मोबाइल नंबर दर्ज करें (सभी अंक समान नहीं हो सकते)' : 'Please enter a valid mobile number (digits cannot be all identical)';
    }
    if (clean === '1234567890' || clean === '9876543210' || clean === '0123456789') {
      return isHi ? 'कृपया एक मान्य मोबाइल नंबर दर्ज करें (डमी नंबर मान्य नहीं है)' : 'Please enter a valid active mobile number';
    }
    return null;
  });

  isLoginPhoneValid = computed(() => {
    const clean = (this.loginPhone() || '').replace(/\D/g, '');
    return clean.length === 10 && 
      /^[6-9]\d{9}$/.test(clean) && 
      !/^(\d)\1{9}$/.test(clean) && 
      clean !== '1234567890' && 
      clean !== '9876543210' && 
      clean !== '0123456789';
  });

  // ---------- SIGN UP STATE (WhatsApp OTP) ----------
  signupName = signal('');
  signupNameTouched = signal(false);
  signupBusinessName = signal('');
  signupBusinessNameTouched = signal(false);
  signupPhone = signal('');
  signupPhoneTouched = signal(false);
  signupAgreeTerms = signal(false);
  signupOtpSent = signal(false);
  signupOtp = signal('');
  signupLoading = signal(false);
  signupResending = signal(false);
  signupCountdown = signal(0);
  signupResendCooldown = signal(0);
  private signupTimer: any = null;
  private signupCooldownTimer: any = null;

  // ---------- SIGN UP VALIDATION (Real-time) ----------
  signupNameError = computed(() => {
    const raw = this.signupName();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const trimmed = raw.trim();
    if (!trimmed) {
      return this.signupNameTouched() ? (isHi ? 'पूरा नाम आवश्यक है' : 'Full name is required') : null;
    }
    if (/[0-9\u0966-\u096F]/.test(raw)) {
      return isHi ? 'नाम में अंक (0-9) मान्य नहीं हैं' : 'Name cannot contain digits (0-9)';
    }
    if (trimmed.length < 2) {
      return isHi ? 'नाम में कम से कम 2 अक्षर होने चाहिए' : 'Name must be at least 2 characters';
    }
    if (trimmed.length > 50) {
      return isHi ? 'नाम अधिकतम 50 अक्षरों का हो सकता है' : 'Name cannot exceed 50 characters';
    }
    const letterCount = (trimmed.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
    if (letterCount < 2) {
      return isHi ? 'नाम में मान्य अक्षर होने चाहिए' : 'Name must contain valid letters';
    }
    if (!/^[a-zA-Z\u0900-\u097F\s.'-]+$/.test(trimmed)) {
      return isHi ? 'नाम में विशेष चिह्न मान्य नहीं हैं' : 'Special symbols are not allowed in name';
    }
    return null;
  });

  isSignupNameValid = computed(() => {
    return this.signupNameError() === null && this.signupName().trim().length >= 2;
  });

  signupBusinessNameError = computed(() => {
    const raw = this.signupBusinessName();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const trimmed = raw.trim();
    if (!trimmed) {
      return this.signupBusinessNameTouched() ? (isHi ? 'कंपनी या फार्म का नाम आवश्यक है' : 'Company or farm name is required') : null;
    }
    if (trimmed.length < 2) {
      return isHi ? 'कम से कम 2 अक्षर होने चाहिए' : 'Must be at least 2 characters';
    }
    if (trimmed.length > 60) {
      return isHi ? 'अधिकतम 60 अक्षर हो सकते हैं' : 'Cannot exceed 60 characters';
    }
    // Company name must contain letters, cannot be only numbers
    const letterCount = (trimmed.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
    if (letterCount < 2) {
      return isHi ? 'कंपनी नाम में कम से कम 2 मान्य अक्षर होने चाहिए (केवल अंक नहीं)' : 'Company name must contain at least 2 letters (cannot be only numbers)';
    }
    if (/^[\d\s]+$/.test(trimmed)) {
      return isHi ? 'कंपनी नाम केवल संख्याएं नहीं हो सकती' : 'Company name cannot be only numbers';
    }
    if (!/^[a-zA-Z0-9\u0900-\u097F\u0966-\u096F\s.&,'/#()\-]+$/.test(trimmed)) {
      return isHi ? 'कंपनी नाम में अमान्य चिह्न नहीं हो सकते' : 'Invalid characters in company name';
    }
    return null;
  });

  isSignupBusinessNameValid = computed(() => {
    return this.signupBusinessNameError() === null && this.signupBusinessName().trim().length >= 2;
  });

  signupPhoneError = computed(() => {
    const raw = this.signupPhone();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    if (!raw) {
      return this.signupPhoneTouched() ? (isHi ? 'मोबाइल नंबर आवश्यक है' : 'Mobile number is required') : null;
    }
    const clean = raw.replace(/\D/g, '');
    if (clean.length > 0 && !/^[6-9]/.test(clean)) {
      return isHi ? 'मोबाइल नंबर 6, 7, 8 या 9 से शुरू होना चाहिए' : 'Mobile number must start with 6, 7, 8, or 9';
    }
    if (clean.length < 10) {
      return isHi ? `10 अंकों का मोबाइल नंबर दर्ज करें (अभी: ${clean.length}/10)` : `Enter 10-digit mobile number (${clean.length}/10)`;
    }
    if (/^(\d)\1{9}$/.test(clean)) {
      return isHi ? 'कृपया मान्य मोबाइल नंबर दर्ज करें (सभी अंक समान नहीं हो सकते)' : 'Please enter a valid mobile number (digits cannot be all identical)';
    }
    if (clean === '1234567890' || clean === '9876543210' || clean === '0123456789') {
      return isHi ? 'कृपया एक मान्य मोबाइल नंबर दर्ज करें (डमी नंबर मान्य नहीं है)' : 'Please enter a valid active mobile number';
    }
    return null;
  });

  isSignupPhoneValid = computed(() => {
    const clean = (this.signupPhone() || '').replace(/\D/g, '');
    return clean.length === 10 && 
      /^[6-9]\d{9}$/.test(clean) && 
      !/^(\d)\1{9}$/.test(clean) && 
      clean !== '1234567890' && 
      clean !== '9876543210' && 
      clean !== '0123456789';
  });

  loginCountdownDisplay = computed(() => {
    const count = this.loginCountdown();
    const mins = Math.floor(count / 60);
    const secs = count % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  });

  signupCountdownDisplay = computed(() => {
    const count = this.signupCountdown();
    const mins = Math.floor(count / 60);
    const secs = count % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  });

  // ---------- PASSWORD LOGIN FORM ----------
  passwordLoginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private loaderService: LoaderService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    public translationService: TranslationService,
    private otpService: OtpService
  ) {
    this.initializeForms();
  }

  private initializeForms(): void {
    this.passwordLoginForm = this.fb.group({
      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[6-9]\d{9}$/),
          (control: any) => {
            const val = String(control?.value || '').replace(/\D/g, '');
            if (val.length === 10 && /^(\d)\1{9}$/.test(val)) {
              return { allSameDigits: true };
            }
            if (val === '1234567890' || val === '9876543210' || val === '0123456789') {
              return { dummyNumber: true };
            }
            return null;
          }
        ]
      ],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // Sanitization input handlers
  onLoginPhoneInput(val: string): void {
    const clean = String(val || '').replace(/\D/g, '').slice(0, 10);
    this.loginPhone.set(clean);
    this.loginPhoneTouched.set(true);
  }

  onSignupNameInput(val: string): void {
    // Strips all digits (0-9 and Devanagari ०-९) immediately so user physically cannot type numbers into name
    const withoutDigits = String(val || '').replace(/[0-9\u0966-\u096F]/g, '');
    this.signupName.set(withoutDigits);
    this.signupNameTouched.set(true);
  }

  onSignupBusinessNameInput(val: string): void {
    // Allows letters, numbers, spaces, and standard business characters & , . ' / - ( )
    const sanitized = String(val || '').replace(/[<>{}[\]~^;`$%*+=|\\]/g, '');
    this.signupBusinessName.set(sanitized);
    this.signupBusinessNameTouched.set(true);
  }

  onSignupPhoneInput(val: string): void {
    const clean = String(val || '').replace(/\D/g, '').slice(0, 10);
    this.signupPhone.set(clean);
    this.signupPhoneTouched.set(true);
  }

  onPasswordPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const clean = input.value.replace(/\D/g, '').slice(0, 10);
      input.value = clean;
      this.passwordLoginForm.get('phone')?.setValue(clean);
    }
  }

  // ==========================================
  // SIGN IN FLOW (WhatsApp OTP)
  // ==========================================
  async sendLoginOtp(): Promise<void> {
    this.loginPhoneTouched.set(true);
    if (!this.isLoginPhoneValid()) {
      const err = this.loginPhoneError();
      this.toastService.warning(err || this.translationService.get('auth.phoneInvalid'));
      return;
    }

    const cleanPhone = String(this.loginPhone() || '').replace(/\D/g, '').slice(-10);

    this.loginLoading.set(true);
    try {
      // Send WhatsApp OTP with 'login' verification mode (server validates if user exists)
      await this.otpService.sendOtp(cleanPhone, 'login');
      this.loginOtpSent.set(true);
      this.loginOtp.set('');
      this.toastService.success(this.translationService.get('auth.checkWhatsappHint'));
      this.startLoginCountdown(300);
      this.startLoginResendCooldown(60);
    } catch (err: any) {
      if (err?.code === 'USER_NOT_FOUND') {
        this.toastService.warning(this.translationService.get('auth.accountNotRegistered'));
        this.signupPhone.set(cleanPhone);
      } else {
        const msg = err?.message || 'Failed to send WhatsApp OTP. Please check your number.';
        this.toastService.error(msg);
      }
    } finally {
      this.loginLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async resendLoginOtp(): Promise<void> {
    if (this.loginResendCooldown() > 0) {
      this.toastService.warning(`Please wait ${this.loginResendCooldown()}s before requesting a new OTP.`);
      return;
    }
    const cleanPhone = String(this.loginPhone() || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return;

    this.loginResending.set(true);
    try {
      await this.otpService.sendOtp(cleanPhone, 'login');
      this.loginOtp.set('');
      this.toastService.success(this.translationService.get('auth.checkWhatsappHint'));
      this.startLoginCountdown(300);
      this.startLoginResendCooldown(60);
    } catch (err: any) {
      this.toastService.error(err?.message || 'Failed to resend OTP');
    } finally {
      this.loginResending.set(false);
      this.cdr.markForCheck();
    }
  }

  async verifyLoginOtp(): Promise<void> {
    const cleanPhone = String(this.loginPhone() || '').replace(/\D/g, '').slice(-10);
    const cleanOtp = String(this.loginOtp() || '').trim();

    if (cleanOtp.length !== 6) {
      this.toastService.warning(this.translationService.get('auth.enterOtp6Digit'));
      return;
    }

    this.loginLoading.set(true);
    this.loaderService.show();
    try {
      const isSuccess = await this.otpService.verifyOtpAndLogin(cleanPhone, cleanOtp);
      if (isSuccess) {
        this.clearLoginTimers();
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          await this.userService.loadUserProfile(currentUser.uid, cleanPhone);
          await this.userService.updateLastLogin(currentUser.uid).catch(() => {});
        }
        this.toastService.success(this.translationService.get('auth.welcomeBack'));
        await this.router.navigate(['/dashboard']);
        setTimeout(() => this.loaderService.hide(), 800);
      } else {
        this.loaderService.hide();
      }
    } catch (err: any) {
      this.loaderService.hide();
      const msg = err?.message || 'Invalid or expired OTP. Please try again.';
      this.toastService.error(msg);
    } finally {
      this.loginLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  changeLoginPhone(): void {
    this.loginOtpSent.set(false);
    this.loginOtp.set('');
    this.loginPhoneTouched.set(false);
    this.clearLoginTimers();
  }

  // ==========================================
  // SIGN UP FLOW (WhatsApp OTP)
  // ==========================================
  async sendSignupOtp(): Promise<void> {
    this.signupNameTouched.set(true);
    this.signupBusinessNameTouched.set(true);
    this.signupPhoneTouched.set(true);

    if (!this.isSignupNameValid()) {
      const err = this.signupNameError();
      this.toastService.warning(err || this.translationService.get('auth.fullNameRequired'));
      return;
    }

    if (!this.isSignupBusinessNameValid()) {
      const err = this.signupBusinessNameError();
      this.toastService.warning(err || this.translationService.get('auth.companyNameRequired'));
      return;
    }

    if (!this.isSignupPhoneValid()) {
      const err = this.signupPhoneError();
      this.toastService.warning(err || this.translationService.get('auth.phoneInvalid'));
      return;
    }

    if (!this.signupAgreeTerms()) {
      this.toastService.warning(this.translationService.get('auth.agreeTerms'));
      return;
    }

    const cleanName = String(this.signupName() || '').trim();
    const cleanBusinessName = String(this.signupBusinessName() || '').trim();
    const cleanPhone = String(this.signupPhone() || '').replace(/\D/g, '').slice(-10);

    this.signupLoading.set(true);
    try {
      // Send WhatsApp OTP with 'signup' validation mode (server validates if user already exists)
      await this.otpService.sendOtp(cleanPhone, 'signup');
      this.signupOtpSent.set(true);
      this.signupOtp.set('');
      this.toastService.success(this.translationService.get('auth.checkWhatsappHint'));
      this.startSignupCountdown(300);
      this.startSignupResendCooldown(60);
    } catch (err: any) {
      if (err?.code === 'USER_ALREADY_EXISTS') {
        this.toastService.warning(this.translationService.get('auth.accountAlreadyRegistered'));
        this.loginPhone.set(cleanPhone);
      } else {
        const msg = err?.message || 'Failed to send WhatsApp OTP. Please check your number.';
        this.toastService.error(msg);
      }
    } finally {
      this.signupLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async resendSignupOtp(): Promise<void> {
    if (this.signupResendCooldown() > 0) {
      this.toastService.warning(`Please wait ${this.signupResendCooldown()}s before requesting a new OTP.`);
      return;
    }
    const cleanPhone = String(this.signupPhone() || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return;

    this.signupResending.set(true);
    try {
      await this.otpService.sendOtp(cleanPhone, 'signup');
      this.signupOtp.set('');
      this.toastService.success(this.translationService.get('auth.checkWhatsappHint'));
      this.startSignupCountdown(300);
      this.startSignupResendCooldown(60);
    } catch (err: any) {
      this.toastService.error(err?.message || 'Failed to resend OTP');
    } finally {
      this.signupResending.set(false);
      this.cdr.markForCheck();
    }
  }

  async verifySignupOtp(): Promise<void> {
    const cleanName = String(this.signupName() || '').trim();
    const cleanBusinessName = String(this.signupBusinessName() || '').trim();
    const cleanPhone = String(this.signupPhone() || '').replace(/\D/g, '').slice(-10);
    const cleanOtp = String(this.signupOtp() || '').trim();

    if (cleanOtp.length !== 6) {
      this.toastService.warning(this.translationService.get('auth.enterOtp6Digit'));
      return;
    }

    this.signupLoading.set(true);
    this.loaderService.show();
    try {
      const isSuccess = await this.otpService.verifyOtpAndLogin(cleanPhone, cleanOtp, cleanName);
      if (isSuccess) {
        this.clearSignupTimers();
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          await this.userService.createUser(currentUser.uid, cleanName, cleanPhone, {
            businessName: cleanBusinessName
          });
          await this.userService.loadUserProfile(currentUser.uid, cleanPhone);
        }
        this.toastService.success('Account created successfully');
        await this.router.navigate(['/dashboard']);
        setTimeout(() => this.loaderService.hide(), 800);
      } else {
        this.loaderService.hide();
      }
    } catch (err: any) {
      this.loaderService.hide();
      const msg = err?.message || 'Invalid or expired OTP. Please try again.';
      this.toastService.error(msg);
    } finally {
      this.signupLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  changeSignupPhone(): void {
    this.signupOtpSent.set(false);
    this.signupOtp.set('');
    this.signupPhoneTouched.set(false);
    this.clearSignupTimers();
  }

  // ==========================================
  // PASSWORD LOGIN (Fallback / Optional)
  // ==========================================
  async onPasswordLogin(): Promise<void> {
    if (this.passwordLoginForm.invalid) {
      this.toastService.warning('Please enter valid phone and password');
      return;
    }

    this.loaderService.show();
    try {
      const { phone, password } = this.passwordLoginForm.value;
      const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
      const user = await this.authService.login(cleanPhone, password);
      await this.userService.loadUserProfile(user.uid);
      await this.userService.updateLastLogin(user.uid);
      this.toastService.success('Login successful');
      await this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.toastService.error(err?.message || 'Login failed');
    } finally {
      this.loaderService.hide();
    }
  }

  // ==========================================
  // TIMERS
  // ==========================================
  private startLoginCountdown(seconds: number): void {
    if (this.loginTimer) clearInterval(this.loginTimer);
    this.loginCountdown.set(seconds);
    this.loginTimer = setInterval(() => {
      if (this.loginCountdown() > 0) {
        this.loginCountdown.update(v => v - 1);
      } else {
        clearInterval(this.loginTimer);
        this.loginTimer = null;
      }
    }, 1000);
  }

  private startLoginResendCooldown(seconds: number): void {
    if (this.loginCooldownTimer) clearInterval(this.loginCooldownTimer);
    this.loginResendCooldown.set(seconds);
    this.loginCooldownTimer = setInterval(() => {
      if (this.loginResendCooldown() > 0) {
        this.loginResendCooldown.update(v => v - 1);
      } else {
        clearInterval(this.loginCooldownTimer);
        this.loginCooldownTimer = null;
      }
    }, 1000);
  }

  private clearLoginTimers(): void {
    if (this.loginTimer) clearInterval(this.loginTimer);
    if (this.loginCooldownTimer) clearInterval(this.loginCooldownTimer);
    this.loginTimer = null;
    this.loginCooldownTimer = null;
    this.loginCountdown.set(0);
    this.loginResendCooldown.set(0);
  }

  private startSignupCountdown(seconds: number): void {
    if (this.signupTimer) clearInterval(this.signupTimer);
    this.signupCountdown.set(seconds);
    this.signupTimer = setInterval(() => {
      if (this.signupCountdown() > 0) {
        this.signupCountdown.update(v => v - 1);
      } else {
        clearInterval(this.signupTimer);
        this.signupTimer = null;
      }
    }, 1000);
  }

  private startSignupResendCooldown(seconds: number): void {
    if (this.signupCooldownTimer) clearInterval(this.signupCooldownTimer);
    this.signupResendCooldown.set(seconds);
    this.signupCooldownTimer = setInterval(() => {
      if (this.signupResendCooldown() > 0) {
        this.signupResendCooldown.update(v => v - 1);
      } else {
        clearInterval(this.signupCooldownTimer);
        this.signupCooldownTimer = null;
      }
    }, 1000);
  }

  private clearSignupTimers(): void {
    if (this.signupTimer) clearInterval(this.signupTimer);
    if (this.signupCooldownTimer) clearInterval(this.signupCooldownTimer);
    this.signupTimer = null;
    this.signupCooldownTimer = null;
    this.signupCountdown.set(0);
    this.signupResendCooldown.set(0);
  }

  ngOnDestroy(): void {
    this.clearLoginTimers();
    this.clearSignupTimers();
  }

  // ==========================================
  // STATE SWITCHING
  // ==========================================
  setState(state: AuthState): void {
    this.currentState.set(state);
    this.loginWithPasswordMode.set(false);

    if (state === 'LOGIN') {
      this.loginOtpSent.set(false);
      this.loginOtp.set('');
      this.loginPhoneTouched.set(false);
      this.clearLoginTimers();
    } else if (state === 'SIGNUP') {
      this.signupOtpSent.set(false);
      this.signupOtp.set('');
      this.signupNameTouched.set(false);
      this.signupBusinessNameTouched.set(false);
      this.signupPhoneTouched.set(false);
      this.clearSignupTimers();
    } else {
      this.loginPhoneTouched.set(false);
      this.signupNameTouched.set(false);
      this.signupBusinessNameTouched.set(false);
      this.signupPhoneTouched.set(false);
      this.clearLoginTimers();
      this.clearSignupTimers();
    }
  }

  togglePasswordMode(enable: boolean): void {
    this.loginWithPasswordMode.set(enable);
    if (enable && this.loginPhone()) {
      this.passwordLoginForm.patchValue({ phone: this.loginPhone() });
    }
  }
}

