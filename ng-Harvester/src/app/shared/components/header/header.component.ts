import { Component, output, signal, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';
import { LanguageService } from '../../services/language.service';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  themeToggle = output<void>();
  languageToggle = output<void>();
  
  // Use a signal to track auth state
  currentUser = signal<User | null>(null);

  constructor(
    public translationService: TranslationService,
    private languageService: LanguageService,
    private auth: Auth,
    private ngZone: NgZone
  ) {
    // Check initial auth state immediately
    if (this.auth.currentUser) {
      this.currentUser.set(this.auth.currentUser);
    }
  }

  ngOnInit(): void {
    // Listen to auth state changes and update signal
    // Run inside Angular zone to ensure change detection works on Safari/iOS
    onAuthStateChanged(this.auth, (user) => {
      this.ngZone.run(() => {
        this.currentUser.set(user);
      });
    });
  }

  onThemeToggle(): void {
    this.themeToggle.emit();
  }

  onLanguageToggle(): void {
    this.languageToggle.emit();
  }

  getCurrentLanguage(): string {
    return this.languageService.getCurrentLanguage();
  }
}
