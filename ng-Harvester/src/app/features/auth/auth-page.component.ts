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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
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
    if (this.loginForm.invalid) return;

    try {
      const phone = this.loginForm.get('phone')?.value;
      const password = this.loginForm.get('password')?.value;
      const user = await this.authService.login(phone, password);

      // Update last login timestamp
      await this.userService.updateLastLogin(user.uid);

      // Navigate to dashboard
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Login error:', error);
      // Handle error (show message to user)
    }
  }

  async onSignup(): Promise<void> {
    if (this.signupForm.invalid || !this.agreeToTerms()) return;

    try {
      const fullName = this.signupForm.get('fullName')?.value;
      const phone = this.signupForm.get('phone')?.value;
      const password = this.signupForm.get('password')?.value;
      // Create user account
      const user = await this.authService.signup(phone, password);

      // Save user data to Firestore
      await this.userService.createUser(user.uid, fullName, phone);

      // Navigate to dashboard
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Signup error:', error);
      // Handle error (show message to user)
    }
  }





























  setState(state: AuthState): void {
    this.currentState.set(state);
    // Reset forms when changing states
    if (state === 'LOGIN') {
      this.loginForm.reset();
    } else if (state === 'SIGNUP') {
      this.signupForm.reset();
    }
  }

  onSocialAuth(provider: string): void {
    console.log('Social auth with:', provider);
    // Implement social authentication
  }
}
