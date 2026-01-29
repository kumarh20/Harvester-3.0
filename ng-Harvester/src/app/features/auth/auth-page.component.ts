import { Component, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../../services/auth/auth-service';
import { UserService } from '../../services/user/user-service';
import { LoaderService } from '../../shared/services/loader.service';
import { ToastService } from '../../shared/services/toast.service';
import { Router } from '@angular/router';
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
  currentState = signal<AuthState>('WELCOME');
  timeGreeting = signal(this.getTimeGreeting());
  loginForm!: FormGroup;
  signupForm!: FormGroup;
  rememberMe = signal(false);
  agreeToTerms = signal(false);

  // Password visibility toggles
  hideLoginPassword = signal(true);
  hideSignupPassword = signal(true);

  otpSent: boolean = false;
  otpVerified: boolean = false;
  otp: string = '';
  loadingOTP: boolean = false;
  resendingOTP: boolean = false;


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

  private initializeForms(): void {
    // Strong password pattern: At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/;

    this.loginForm = this.fb.group({
      phone: ['', [
        Validators.required,
        Validators.pattern(/^\d{10}$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(strongPasswordPattern)
      ]]
    });

    this.signupForm = this.fb.group({
      fullName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^\d{10}$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(strongPasswordPattern)
      ]]
    });
  }

  private getTimeGreeting(): string {
    const now = new Date();
    const hour = now.getHours(); // 0–23
    const isAM = hour < 12;
  
    if (isAM) {
      return 'Good morning!';
    }
  
    if (hour < 17) {
      return 'Good afternoon!';
    }
  
    return 'Good evening!';
  }
  


  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.toastService.warning('Please fill all fields correctly');
      return;
    }

    // Show loader
    this.loaderService.show();

    try {
      const phone = this.loginForm.get('phone')?.value;
      const password = this.loginForm.get('password')?.value;
      
      const user = await this.authService.login(phone, password);

      // Update last login timestamp
      await this.userService.updateLastLogin(user.uid);

      this.toastService.success('Login successful! Welcome back.');
      
      // Navigate to dashboard
      await this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Login failed. Please try again.';
      
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password') {
        errorMessage = 'Invalid phone number or password';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Check your internet connection.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      this.toastService.error(errorMessage);
    } finally {
      // Hide loader
      this.loaderService.hide();  
    }
  }

  async onSignup(): Promise<void> {
    if (this.signupForm.invalid) {
      this.toastService.warning('Please fill all fields correctly');
      return;
    }
    
    if (!this.agreeToTerms()) {
      this.toastService.warning('Please agree to the terms and conditions');
      return;
    }

    if (!this.otpVerified) {
      this.toastService.warning('Please verify OTP first');
      return;
    }

    // Show loader
    this.loaderService.show();

    try {
      const fullName = this.signupForm.get('fullName')?.value;
      const phone = this.signupForm.get('phone')?.value;
      const password = this.signupForm.get('password')?.value;
      
      // Create user account
      const user = await this.authService.signup(phone, password);

      // Save user data to Firestore
      await this.userService.createUser(user.uid, fullName, phone);

      this.toastService.success('Account created successfully! Welcome aboard.');

      // Navigate to dashboard
      await this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Signup failed. Please try again.';
      
      if (error?.code === 'auth/email-already-in-use') {
        errorMessage = 'This phone number is already registered. Please login.';
      } else if (error?.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Check your internet connection.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      this.toastService.error(errorMessage);
    } finally {
      // Hide loader
      this.loaderService.hide();
    }
  }

  setState(state: AuthState): void {
    this.currentState.set(state);
    // Reset forms when changing states
    if (state === 'LOGIN') {
      this.loginForm.reset();
    } else if (state === 'SIGNUP') {
      this.signupForm.reset();
      // Reset OTP-related states
      this.otpSent = false;
      this.otpVerified = false;
      this.otp = '';
      this.loadingOTP = false;
      this.resendingOTP = false;
    }
  }

  onSocialAuth(provider: string): void {
    console.log('Social auth with:', provider);
    // Implement social authentication
  }

  private timeoutPromise<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout. Please try again.')), timeoutMs)
      )
    ]);
  }

  async sendOTP() {
    // Validate full name first
    if (this.signupForm.get('fullName')?.invalid) {
      this.toastService.warning('Please enter your full name first');
      this.signupForm.get('fullName')?.markAsTouched();
      return;
    }

    // Validate phone number
    let phone = this.signupForm.get('phone')?.value;
    phone = String(phone).trim();
    
    if (!phone) {
      this.toastService.warning('Phone number is required');
      this.signupForm.get('phone')?.markAsTouched();
      return;
    }

    if (this.signupForm.get('phone')?.invalid) {
      this.toastService.warning('Please enter a valid 10-digit phone number');
      this.signupForm.get('phone')?.markAsTouched();
      return;
    }
  
    // Reset all states before starting
    this.loadingOTP = true;
    this.otpSent = false;
    this.otpVerified = false;
    this.otp = '';
    this.toastService.info('Sending OTP...');
  
    try {
      // Add 30-second timeout to prevent hanging
      await this.timeoutPromise(this.authService.sendSignupOTP(phone), 30000);
      // Only mark as sent if successful
      this.otpSent = true;
      this.toastService.success('OTP sent successfully to your mobile!');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      
      // CRITICAL: Ensure otpSent is false on ANY error
      this.otpSent = false;
      this.otpVerified = false;
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (err?.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please check your internet connection and try again.';
      } else if (err?.code === 'functions/invalid-argument') {
        errorMessage = 'Invalid phone number. Please check and try again.';
      } else if (err?.code === 'functions/unavailable') {
        errorMessage = 'Service unavailable. Please check your internet connection.';
      } else if (err?.code === 'functions/internal') {
        errorMessage = 'Server error. Please try again later.';
      } else if (err?.code === 'functions/deadline-exceeded') {
        errorMessage = 'Request timeout. Please try again.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      this.toastService.error(errorMessage);
    } finally {
      // CRITICAL: Always reset loading state regardless of success/failure
      this.loadingOTP = false;
      
      // Double-check: If still loading after 100ms, force reset (safety net)
      setTimeout(() => {
        if (this.loadingOTP) {
          console.warn('Force resetting loadingOTP state');
          this.loadingOTP = false;
        }
      }, 100);
    }
  }

  async verifyOTPAndSignup() {
    let phone = this.signupForm.get('phone')?.value;
    phone = String(phone).trim();
    
    if (!phone) {
      this.toastService.warning('Phone number is missing');
      return;
    }
    
    if (!this.otp || this.otp.trim().length === 0) {
      this.toastService.warning('Please enter the OTP');
      return;
    }

    if (this.otp.trim().length !== 6) {
      this.toastService.warning('OTP must be 6 digits');
      return;
    }
  
    // Reset states before starting
    this.loadingOTP = true;
    this.otpVerified = false;
    this.toastService.info('Verifying OTP...');
  
    try {
      // Add 30-second timeout to prevent hanging
      await this.timeoutPromise(this.authService.verifySignupOTP(phone, this.otp.trim()), 30000);
      // ✅ OTP verified - only set to true on success
      this.otpVerified = true;
      this.toastService.success('OTP verified successfully! Now create your password.');
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      
      // CRITICAL: Ensure otpVerified is false on ANY error
      this.otpVerified = false;
      
      let errorMessage = 'OTP verification failed. Please try again.';
      
      if (err?.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please check your internet connection and try again.';
      } else if (err?.code === 'functions/invalid-argument') {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (err?.code === 'functions/not-found') {
        errorMessage = 'OTP not found. Please request a new one.';
      } else if (err?.code === 'functions/permission-denied') {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (err?.code === 'functions/deadline-exceeded') {
        errorMessage = 'OTP expired. Please request a new one.';
      } else if (err?.code === 'functions/unavailable') {
        errorMessage = 'Service unavailable. Please check your internet connection.';
      } else if (err?.code === 'functions/internal') {
        errorMessage = 'Server error. Please try again later.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      this.toastService.error(errorMessage);
    } finally {
      // CRITICAL: Always reset loading state regardless of success/failure
      this.loadingOTP = false;
      
      // Double-check: If still loading after 100ms, force reset (safety net)
      setTimeout(() => {
        if (this.loadingOTP) {
          console.warn('Force resetting loadingOTP state');
          this.loadingOTP = false;
        }
      }, 100);
    }
  }

  async resendOTP() {
    let phone = this.signupForm.get('phone')?.value;
    phone = String(phone).trim();
    
    if (!phone) {
      this.toastService.warning('Phone number is missing');
      return;
    }
  
    // Reset states before starting
    this.resendingOTP = true;
    this.otp = ''; // Clear previous OTP
    this.otpVerified = false; // Reset verification
    this.toastService.info('Resending OTP...');
  
    try {
      // Add 30-second timeout to prevent hanging
      await this.timeoutPromise(this.authService.sendSignupOTP(phone), 30000);
      this.toastService.success('OTP resent successfully to your mobile!');
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      
      let errorMessage = 'Failed to resend OTP. Please try again.';
      
      if (err?.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please check your internet connection and try again.';
      } else if (err?.code === 'functions/invalid-argument') {
        errorMessage = 'Invalid phone number. Please check and try again.';
      } else if (err?.code === 'functions/unavailable') {
        errorMessage = 'Service unavailable. Please check your internet connection.';
      } else if (err?.code === 'functions/internal') {
        errorMessage = 'Server error. Please try again later.';
      } else if (err?.code === 'functions/deadline-exceeded') {
        errorMessage = 'Request timeout. Please try again.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      this.toastService.error(errorMessage);
    } finally {
      // CRITICAL: Always reset loading state regardless of success/failure
      this.resendingOTP = false;
      
      // Double-check: If still loading after 100ms, force reset (safety net)
      setTimeout(() => {
        if (this.resendingOTP) {
          console.warn('Force resetting resendingOTP state');
          this.resendingOTP = false;
        }
      }, 100);
    }
  }
  
  
}
