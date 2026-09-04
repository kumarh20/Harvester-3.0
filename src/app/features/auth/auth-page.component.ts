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
  // LOGIN (Phone + Password)
  // =============================
  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.toastService.warning('Please enter valid phone and password');
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
  // SIGNUP (Full Name + Phone + Password)
  // =============================
  async onSignup(): Promise<void> {
    if (this.signupForm.invalid) {
      this.toastService.warning('Please fill all fields correctly');
      return;
    }

    if (!this.agreeToTerms()) {
      this.toastService.warning('Please accept terms & conditions');
      return;
    }

    this.loaderService.show();

    try {
      const { fullName, phone, password } = this.signupForm.value;
      const user = await this.authService.signup(phone, password);
      await this.userService.createUser(user.uid, fullName, phone);
      this.toastService.success('Account created successfully');
      await this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.toastService.error(err?.message || 'Signup failed');
    } finally {
      this.loaderService.hide();
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
    }

    if (state === 'SIGNUP') {
      this.signupForm.reset();
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
