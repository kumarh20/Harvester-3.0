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
  loginOtpSent = signal(false);
  loginOtp = signal('');
  loginLoading = signal(false);
  loginResending = signal(false);
  loginCountdown = signal(0);
  loginResendCooldown = signal(0);
  private loginTimer: any = null;
  private loginCooldownTimer: any = null;

  // ---------- SIGN UP STATE (WhatsApp OTP) ----------
  signupName = signal('');
  signupPhone = signal('');
  signupAgreeTerms = signal(false);
  signupOtpSent = signal(false);
  signupOtp = signal('');
  signupLoading = signal(false);
  signupResending = signal(false);
  signupCountdown = signal(0);
  signupResendCooldown = signal(0);
  private signupTimer: any = null;
  private signupCooldownTimer: any = null;

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
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required]]
    });
  }

  // ==========================================
  // SIGN IN FLOW (WhatsApp OTP)
  // ==========================================
  async sendLoginOtp(): Promise<void> {
    const cleanPhone = String(this.loginPhone() || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      this.toastService.warning(this.translationService.get('auth.phoneInvalid'));
      return;
    }

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
    this.clearLoginTimers();
  }

  // ==========================================
  // SIGN UP FLOW (WhatsApp OTP)
  // ==========================================
  async sendSignupOtp(): Promise<void> {
    const cleanName = String(this.signupName() || '').trim();
    const cleanPhone = String(this.signupPhone() || '').replace(/\D/g, '').slice(-10);

    if (!cleanName || cleanName.length < 2) {
      this.toastService.warning(this.translationService.get('auth.fullNameRequired'));
      return;
    }

    if (cleanPhone.length !== 10) {
      this.toastService.warning(this.translationService.get('auth.phoneInvalid'));
      return;
    }

    if (!this.signupAgreeTerms()) {
      this.toastService.warning(this.translationService.get('auth.agreeTerms'));
      return;
    }

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
          await this.userService.createUser(currentUser.uid, cleanName, cleanPhone);
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
      this.clearLoginTimers();
    } else if (state === 'SIGNUP') {
      this.signupOtpSent.set(false);
      this.signupOtp.set('');
      this.clearSignupTimers();
    } else {
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

