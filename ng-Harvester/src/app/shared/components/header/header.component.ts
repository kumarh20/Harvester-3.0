import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../services/translation.service';
import { LanguageService } from '../../services/language.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  themeToggle = output<void>();
  languageToggle = output<void>();

  constructor(
    public translationService: TranslationService,
    private languageService: LanguageService,
    public auth: Auth
  ) {}

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
