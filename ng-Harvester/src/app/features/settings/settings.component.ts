import { Component, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../shared/services/dialog.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { AuthService } from '../../services/auth/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SettingsComponent {
  // Theme preference signal
  isDarkMode = signal(false);

  // Language preference signal - computed from LanguageService
  language = computed(() => this.languageService.getCurrentLanguage());

  // Notifications preference signal
  notificationsEnabled = signal(true);

  // Currency format signal
  currencyFormat = signal('hi-IN'); // hi-IN for Indian Rupee, etc.

  constructor(
    private dialogService: DialogService,
    public translationService: TranslationService,
    private languageService: LanguageService,
    private authService: AuthService,
    private router: Router
  ) {
    this.loadSettings();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    const theme = localStorage.getItem('theme') || 'light';
    this.isDarkMode.set(theme === 'dark');

    // Language is managed by LanguageService, no need to set here

    const notifications = localStorage.getItem('notifications');
    this.notificationsEnabled.set(notifications !== 'false');

    const currency = localStorage.getItem('currency') || 'hi-IN';
    this.currencyFormat.set(currency);
  }

  /**
   * Toggle dark/light mode
   */
  onThemeToggle(value: boolean): void {
    this.isDarkMode.set(value);
    const theme = value ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Change language preference
   */
  onLanguageChange(lang: string): void {
    this.languageService.setLanguage(lang as 'hi' | 'en');
    console.log('Language changed to:', lang);
  }

  /**
   * Toggle notifications
   */
  onNotificationsToggle(value: boolean): void {
    this.notificationsEnabled.set(value);
    localStorage.setItem('notifications', value ? 'true' : 'false');
  }

  /**
   * Change currency format
   */
  onCurrencyChange(format: string): void {
    this.currencyFormat.set(format);
    localStorage.setItem('currency', format);
    console.log('Currency changed to:', format);
  }

  /**
   * Export data (CSV format)
   */
  exportData(): void {
    const records = localStorage.getItem('harvester_records');
    if (!records) {
      this.dialogService.alert(
        this.translationService.get('messages.noDataToExport'),
        this.translationService.get('common.edit'),
        'info'
      );
      return;
    }

    try {
      const data = JSON.parse(records);
      const csvContent = this.convertToCSV(data);
      this.downloadCSV(csvContent, 'harvester_records.csv');
      this.dialogService.alert(
        this.translationService.get('messages.dataExported'),
        this.translationService.get('common.save'),
        'success'
      );
    } catch (error) {
      console.error('Error exporting data:', error);
      this.dialogService.alert(
        this.translationService.get('messages.saveError'),
        this.translationService.get('common.delete'),
        'error'
      );
    }
  }

  /**
   * Clear all data (with confirmation)
   */
  clearAllData(): void {
    const confirmMessage = this.translationService.get('messages.deleteConfirm').replace('{{farmerName}}', 'all');
    
    this.dialogService.confirm(
      confirmMessage,
      this.translationService.get('messages.deleteConfirmMessage'),
      this.translationService.get('common.delete'),
      this.translationService.get('common.cancel'),
      'warning'
    ).subscribe(confirmed => {
      if (confirmed) {
        localStorage.removeItem('harvester_records');
        this.dialogService.alert(
          this.translationService.get('messages.dataCleared'),
          this.translationService.get('common.save'),
          'success'
        );
      }
    });
  }

  /**
   * Reset settings to default
   */
  resetSettings(): void {
    const confirmMessage = this.translationService.get('messages.resetConfirm');
    
    this.dialogService.confirm(
      confirmMessage,
      this.translationService.get('messages.resetConfirmMessage'),
      this.translationService.get('settings.resetButton'),
      this.translationService.get('common.cancel'),
      'warning'
    ).subscribe(confirmed => {
      if (confirmed) {
        localStorage.removeItem('theme');
        localStorage.removeItem('language');
        localStorage.removeItem('notifications');
        localStorage.removeItem('currency');
        this.loadSettings();
        document.documentElement.setAttribute('data-theme', 'light');
        this.dialogService.alert(
          this.translationService.get('messages.settingsReset'),
          this.translationService.get('common.save'),
          'success'
        );
      }
    });
  }

  /**
   * Convert JSON records to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    const csvRows = data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Download CSV file
   */
  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
