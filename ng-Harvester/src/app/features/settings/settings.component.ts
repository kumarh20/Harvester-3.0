import { Component, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../shared/services/dialog.service';

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

  // Language preference signal
  language = signal('hi'); // 'hi' for Hindi, 'en' for English

  // Notifications preference signal
  notificationsEnabled = signal(true);

  // Currency format signal
  currencyFormat = signal('hi-IN'); // hi-IN for Indian Rupee, etc.

  constructor(private dialogService: DialogService) {
    this.loadSettings();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    const theme = localStorage.getItem('theme') || 'light';
    this.isDarkMode.set(theme === 'dark');

    const lang = localStorage.getItem('language') || 'hi';
    this.language.set(lang);

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
    this.language.set(lang);
    localStorage.setItem('language', lang);
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
      this.dialogService.alert('कोई डेटा एक्सपोर्ट करने के लिए नहीं है', 'सूचना', 'info');
      return;
    }

    try {
      const data = JSON.parse(records);
      const csvContent = this.convertToCSV(data);
      this.downloadCSV(csvContent, 'harvester_records.csv');
      this.dialogService.alert('डेटा सफलतापूर्वक एक्सपोर्ट किया गया', 'सफलता', 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.dialogService.alert('डेटा एक्सपोर्ट करने में त्रुटि', 'त्रुटि', 'error');
    }
  }

  /**
   * Clear all data (with confirmation)
   */
  clearAllData(): void {
    this.dialogService.confirm(
      'क्या आप सभी डेटा हटाना चाहते हैं? यह कार्य अपरिवर्तनीय है।',
      'पुष्टि करें',
      'हाँ, हटाएं',
      'रद्द करें',
      'warning'
    ).subscribe(confirmed => {
      if (confirmed) {
        localStorage.removeItem('harvester_records');
        this.dialogService.alert('सभी डेटा सफलतापूर्वक हटा दिया गया', 'सफलता', 'success');
      }
    });
  }

  /**
   * Reset settings to default
   */
  resetSettings(): void {
    this.dialogService.confirm(
      'क्या आप सभी सेटिंग्स डिफ़ॉल्ट में रीसेट करना चाहते हैं?',
      'पुष्टि करें',
      'हाँ, रीसेट करें',
      'रद्द करें',
      'warning'
    ).subscribe(confirmed => {
      if (confirmed) {
        localStorage.removeItem('theme');
        localStorage.removeItem('language');
        localStorage.removeItem('notifications');
        localStorage.removeItem('currency');
        this.loadSettings();
        document.documentElement.setAttribute('data-theme', 'light');
        this.dialogService.alert('सेटिंग्स डिफ़ॉल्ट में रीसेट कर दी गई हैं', 'सफलता', 'success');
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
}
