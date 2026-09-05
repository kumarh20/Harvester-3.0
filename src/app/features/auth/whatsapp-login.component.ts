import { Component, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OtpService } from '../../core/services/otp.service';
import { LoaderService } from '../../shared/services/loader.service';
import { UserService } from '../../services/user/user-service';
import { AuthService } from '../../services/auth/auth-service';

@Component({
  selector: 'app-whatsapp-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="whatsapp-login-wrapper">
      <div class="whatsapp-login-card">
        <!-- Brand Header -->
        <div class="card-header">
          <div class="whatsapp-icon-bubble">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.146-.539-1.859-.769-3.036-2.671-3.13-2.794-.09-.124-.748-.995-.748-1.9 0-.906.474-1.353.644-1.537.17-.185.372-.232.497-.232.126 0 .25.001.36.006.115.006.269-.044.42.321.156.376.533 1.3.579 1.395.045.094.076.205.015.328-.062.124-.093.201-.184.309-.092.107-.193.239-.276.321-.092.093-.189.194-.081.38.108.186.48 0.793 1.031 1.284.708.63 1.306.825 1.492.918.186.092.296.077.405-.046.11-.125.468-.545.593-.732.124-.187.25-.156.421-.093.171.062 1.089.514 1.275.607.187.093.312.14.358.219.046.078.046.452-.098.857zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.436 5.176L2 22l4.982-1.396A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.063c-1.637 0-3.16-.474-4.453-1.295l-.319-.202-2.956.827.834-2.883-.223-.332A8.026 8.026 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8.063-8 8.063z"/>
            </svg>
          </div>
          <h2 class="title">WhatsApp OTP Login</h2>
          <p class="subtitle">Quick and passwordless sign-in for Harvester App</p>
        </div>

        <!-- Notification / Error Banner -->
        @if (errorMessage()) {
          <div class="error-banner" role="alert">
            <mat-icon class="error-icon">error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (successMessage()) {
          <div class="success-banner" role="status">
            <mat-icon class="success-icon">check_circle_outline</mat-icon>
            <span>{{ successMessage() }}</span>
          </div>
        }

        <!-- STEP 1: Phone Number Input -->
        @if (!otpSent()) {
          <form [formGroup]="phoneForm" (ngSubmit)="handleSendOtp()" class="auth-form">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>10-Digit Mobile Number</mat-label>
              <span matPrefix class="country-prefix">+91 &nbsp;</span>
              <input
                matInput
                type="tel"
                formControlName="phone"
                placeholder="9876543210"
                maxlength="10"
                inputmode="numeric"
                autocomplete="tel"
              />
              <mat-icon matSuffix>smartphone</mat-icon>
              @if (phoneForm.get('phone')?.hasError('required') && phoneForm.get('phone')?.touched) {
                <mat-error>Mobile number is required</mat-error>
              }
              @if (phoneForm.get('phone')?.hasError('pattern') && phoneForm.get('phone')?.touched) {
                <mat-error>Enter a valid 10-digit mobile number</mat-error>
              }
            </mat-form-field>

            <button
              type="submit"
              mat-raised-button
              class="submit-btn whatsapp-green-btn"
              [disabled]="phoneForm.invalid || isLoading()"
            >
              @if (isLoading()) {
                <div class="spinner-inline">
                  <mat-spinner diameter="18"></mat-spinner>
                  <span>Sending WhatsApp OTP...</span>
                </div>
              } @else {
                <span>Send WhatsApp OTP</span>
              }
            </button>
          </form>
        }

        <!-- STEP 2: OTP Verification Input -->
        @if (otpSent()) {
          <div class="otp-verification-section">
            <div class="phone-display-badge">
              <span>Code sent to WhatsApp on: <strong>+91 {{ currentPhoneNumber() }}</strong></span>
              <button type="button" class="change-phone-link" (click)="handleChangePhone()" [disabled]="isLoading()">
                Change
              </button>
            </div>

            <form (ngSubmit)="handleVerifyOtp()" class="auth-form">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>6-Digit Verification Code</mat-label>
                <input
                  matInput
                  type="text"
                  [(ngModel)]="otpValue"
                  name="otp"
                  placeholder="123456"
                  maxlength="6"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                />
                <mat-icon matSuffix>lock_clock</mat-icon>
                <mat-hint>Check WhatsApp on your phone for code from MSG91</mat-hint>
              </mat-form-field>

              <div class="otp-timer-row">
                <span class="timer-label" [class.timer-expired]="countdown() === 0">
                  @if (countdown() > 0) {
                    Expires in: <strong>{{ formattedCountdown() }}</strong>
                  } @else {
                    <span class="expired-tag">OTP Expired</span>
                  }
                </span>

                <button
                  type="button"
                  class="resend-btn"
                  (click)="handleResendOtp()"
                  [disabled]="isLoading() || isResending() || resendCooldown() > 0"
                >
                  @if (isResending()) {
                    <span>Resending...</span>
                  } @else if (resendCooldown() > 0) {
                    <span>Resend in {{ resendCooldown() }}s</span>
                  } @else {
                    <span>Resend Code</span>
                  }
                </button>
              </div>

              <button
                type="submit"
                mat-raised-button
                class="submit-btn whatsapp-green-btn"
                [disabled]="isLoading() || !otpValue || otpValue.length !== 6 || countdown() === 0"
              >
                @if (isLoading()) {
                  <div class="spinner-inline">
                    <mat-spinner diameter="18"></mat-spinner>
                    <span>Verifying & Signing In...</span>
                  </div>
                } @else {
                  <span>Verify OTP & Sign In</span>
                }
              </button>
            </form>
          </div>
        }

        <!-- Footer / Alternate Sign-In -->
        <div class="card-footer">
          <div class="divider-line">
            <span>OR</span>
          </div>
          <p class="alternate-link">
            Prefer traditional password?
            <a routerLink="/auth" class="link-text">Login with Password</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .whatsapp-login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: linear-gradient(135deg, #eef5ef 0%, #e3ede4 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .whatsapp-login-card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
      width: 100%;
      max-width: 440px;
      padding: 32px 24px;
      box-sizing: border-box;
    }

    .card-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .whatsapp-icon-bubble {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background-color: #25D366;
      color: #ffffff;
      border-radius: 50%;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35);
    }

    .title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 6px;
    }

    .subtitle {
      font-size: 0.9rem;
      color: #6b7280;
      margin: 0;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 8px;
    }

    .country-prefix {
      font-weight: 600;
      color: #374151;
      font-size: 0.95rem;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 16px;
    }

    .success-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #047857;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 16px;
    }

    .error-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #dc2626;
    }

    .success-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #059669;
    }

    .phone-display-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f3f4f6;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #374151;
      margin-bottom: 16px;
    }

    .change-phone-link {
      background: none;
      border: none;
      color: #2563eb;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
    }

    .otp-timer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: -8px;
      margin-bottom: 8px;
      font-size: 0.85rem;
    }

    .timer-label {
      color: #4b5563;
    }

    .timer-expired {
      color: #dc2626;
      font-weight: 600;
    }

    .resend-btn {
      background: none;
      border: none;
      color: #059669;
      font-weight: 600;
      cursor: pointer;
      padding: 4px;
    }

    .resend-btn:disabled {
      color: #9ca3af;
      cursor: not-allowed;
    }

    .submit-btn {
      height: 48px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px !important;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .whatsapp-green-btn {
      background-color: #25D366 !important;
      color: #ffffff !important;
    }

    .whatsapp-green-btn:disabled {
      background-color: #e5e7eb !important;
      color: #9ca3af !important;
    }

    .spinner-inline {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .card-footer {
      margin-top: 24px;
      text-align: center;
    }

    .divider-line {
      position: relative;
      margin: 16px 0;
      text-align: center;
    }

    .divider-line::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 100%;
      height: 1px;
      background: #e5e7eb;
    }

    .divider-line span {
      position: relative;
      background: #ffffff;
      padding: 0 10px;
      font-size: 0.75rem;
      color: #9ca3af;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .alternate-link {
      font-size: 0.875rem;
      color: #4b5563;
      margin: 0;
    }

    .link-text {
      color: #447a44;
      font-weight: 600;
      text-decoration: none;
      margin-left: 4px;
    }

    .link-text:hover {
      text-decoration: underline;
    }
  `]
})
export class WhatsappLoginComponent implements OnDestroy {
  phoneForm: FormGroup;
  otpValue = '';

  otpSent = signal(false);
  isLoading = signal(false);
  isResending = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  currentPhoneNumber = signal<string>('');

  countdown = signal<number>(300); // 5 minutes in seconds
  resendCooldown = signal<number>(0);

  formattedCountdown = computed(() => {
    const total = this.countdown();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  });

  private countdownTimer: any = null;
  private cooldownTimer: any = null;

  constructor(
    private fb: FormBuilder,
    private otpService: OtpService,
    private router: Router,
    private loaderService: LoaderService,
    private userService: UserService,
    private authService: AuthService
  ) {
    this.phoneForm = this.fb.group({
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]]
    });
  }

  async handleSendOtp(): Promise<void> {
    if (this.phoneForm.invalid) return;

    const phone = this.phoneForm.get('phone')?.value;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.otpService.sendOtp(phone);
      this.currentPhoneNumber.set(phone);
      this.otpSent.set(true);
      this.otpValue = '';
      this.successMessage.set('OTP has been delivered to your WhatsApp account!');
      this.startCountdown(300);
      this.startResendCooldown(60);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to send WhatsApp OTP. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleResendOtp(): Promise<void> {
    if (this.resendCooldown() > 0) return;

    const phone = this.currentPhoneNumber();
    if (!phone) return;

    this.isResending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.otpService.sendOtp(phone);
      this.otpValue = '';
      this.successMessage.set('A new OTP has been sent to your WhatsApp.');
      this.startCountdown(300);
      this.startResendCooldown(60);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to resend WhatsApp OTP.');
    } finally {
      this.isResending.set(false);
    }
  }

  async handleVerifyOtp(): Promise<void> {
    const otp = this.otpValue.trim();
    if (otp.length !== 6) {
      this.errorMessage.set('Please enter the 6-digit OTP code.');
      return;
    }

    const phone = this.currentPhoneNumber();
    this.isLoading.set(true);
    this.loaderService.show();
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const isSuccess = await this.otpService.verifyOtpAndLogin(phone, otp);
      if (isSuccess) {
        this.clearTimers();
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          await this.userService.loadUserProfile(currentUser.uid, phone);
        }
        this.successMessage.set('Login successful! Redirecting...');
        await this.router.navigate(['/dashboard']);
        setTimeout(() => this.loaderService.hide(), 800);
      } else {
        this.loaderService.hide();
      }
    } catch (err: any) {
      this.loaderService.hide();
      this.errorMessage.set(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  handleChangePhone(): void {
    this.otpSent.set(false);
    this.otpValue = '';
    this.clearTimers();
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private startCountdown(seconds: number): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdown.set(seconds);
    this.countdownTimer = setInterval(() => {
      const current = this.countdown();
      if (current > 0) {
        this.countdown.set(current - 1);
      } else {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }, 1000);
  }

  private startResendCooldown(seconds: number): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.resendCooldown.set(seconds);
    this.cooldownTimer = setInterval(() => {
      const current = this.resendCooldown();
      if (current > 0) {
        this.resendCooldown.set(current - 1);
      } else {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }

  private clearTimers(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.countdown.set(0);
    this.resendCooldown.set(0);
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }
}
