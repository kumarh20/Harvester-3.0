import { Component, signal, ViewEncapsulation } from '@angular/core';
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

type AuthState = 'WELCOME' | 'LOGIN' | 'SIGNUP';

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
export class AuthPageComponent {

  // ---------- UI STATE ----------
  currentState = signal<AuthState>('WELCOME');
  timeGreeting = signal(this.getTimeGreeting());

  rememberMe = signal(false);
  agreeToTerms = signal(false);

  hideLoginPassword = signal(true);
  hideSignupPassword = signal(true);

  // ---------- FORMS ----------
  loginForm!: FormGroup;
  signupForm!: FormGroup;

  // ---------- OTP STATE ----------
  otpSent = false;
  otpVerified = false;
  otp = '';
  loadingOTP = false;
  resendingOTP = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private loaderService: LoaderService,
    private toastService: ToastService
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
  }

  private getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 17) return 'Good afternoon!';
    return 'Good evening!';
  }

  // =============================
  // LOGIN
  // =============================
  async onLogin(): Promise<void> {
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
  // SEND WHATSAPP OTP (TWILIO)
  // =============================
  async sendOTP(): Promise<void> {
    if (this.signupForm.get('phone')?.invalid) {
      this.toastService.warning('Enter valid 10-digit phone number');
      return;
    }

    const phone = this.signupForm.get('phone')?.value;

    this.loadingOTP = true;
    this.otpSent = false;
    this.otpVerified = false;
    this.otp = '';

    try {
      await this.authService.sendWhatsAppOTP(phone);
      this.otpSent = true;
      this.toastService.success('OTP sent on WhatsApp');
    } catch (err: any) {
      this.toastService.error(err?.message || 'Failed to send OTP');
    } finally {
      this.loadingOTP = false;
    }
  }

  // =============================
  // VERIFY OTP
  // =============================
  async verifyOTPAndSignup(): Promise<void> {
    if (!this.otp || this.otp.length !== 6) {
      this.toastService.warning('Enter valid 6-digit OTP');
      return;
    }

    const phone = this.signupForm.get('phone')?.value;

    this.loadingOTP = true;

    try {
      await this.authService.verifyWhatsAppOTP(phone, this.otp);
      this.otpVerified = true;
      this.toastService.success('OTP verified successfully');
    } catch (err: any) {
      this.otpVerified = false;
      this.toastService.error(err?.message || 'OTP verification failed');
    } finally {
      this.loadingOTP = false;
    }
  }

  // =============================
  // FINAL SIGNUP
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
      await this.authService.sendWhatsAppOTP(phone);
      this.toastService.success('OTP resent on WhatsApp');
    } catch (err: any) {
      this.toastService.error(err?.message || 'Failed to resend OTP');
    } finally {
      this.resendingOTP = false;
    }
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
      this.otpSent = false;
      this.otpVerified = false;
      this.otp = '';
    }
  }
}
