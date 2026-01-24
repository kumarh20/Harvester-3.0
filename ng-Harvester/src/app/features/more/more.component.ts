import { Component, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { DialogService } from '../../shared/services/dialog.service';
import { TranslationService } from '../../shared/services/translation.service';
import { computed } from '@angular/core';
import { AuthService } from '../../services/auth/auth-service';
import { Router } from '@angular/router';

interface Option {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: () => void;
}

@Component({
  selector: 'app-more',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule
  ],
  templateUrl: './more.component.html',
  styleUrl: './more.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class MoreComponent {
  email: string = 'user@example.com';
  constructor(
    private dialogService: DialogService,
    public translationService: TranslationService,
    private authService: AuthService,
    private router: Router
  ) {}
  appVersion = '1.0.0';

  appName = computed(() => this.translationService.get('app.appTitle'));

  options = computed<Option[]>(() => [
    {
      id: 'export',
      title: this.translationService.get('settings.exportData'),
      description: this.translationService.get('settings.exportData'),
      icon: 'download',
      action: () => this.exportData()
    },
    {
      id: 'import',
      title: this.translationService.get('settings.exportData'),
      description: this.translationService.get('settings.exportData'),
      icon: 'upload',
      action: () => this.importData()
    },
    {
      id: 'about',
      title: this.translationService.get('more.about'),
      description: this.translationService.get('more.version') + ' ' + this.appVersion,
      icon: 'info',
      action: () => this.showAbout()
    }
  ]);

  expandedAbout = signal(false);
  expandedHelp = signal(false);
  expandedContact = signal(false);

  /**
   * Export harvester data to CSV
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
   * Import harvester data from CSV/JSON
   */
  importData(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const content = e.target.result;
          let data;

          if (file.name.endsWith('.json')) {
            data = JSON.parse(content);
          } else if (file.name.endsWith('.csv')) {
            data = this.parseCSV(content);
          } else {
            this.dialogService.alert(
              this.translationService.get('messages.saveError'),
              this.translationService.get('common.delete'),
              'error'
            );
            return;
          }

          localStorage.setItem('harvester_records', JSON.stringify(data));
          this.dialogService.alert(
            this.translationService.get('messages.dataImported'),
            this.translationService.get('common.save'),
            'success'
          );
        } catch (error) {
          console.error('Error importing data:', error);
          this.dialogService.alert(
            this.translationService.get('messages.saveError'),
            this.translationService.get('common.delete'),
            'error'
          );
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  /**
   * Show about information
   */
  showAbout(): void {
    this.expandedAbout.set(!this.expandedAbout());
  }

  /**
   * Share app information
   */
  shareApp(): void {
    const text = `${this.appName()} - ${this.translationService.get('more.description')}`;

    if (navigator.share) {
      navigator.share({
        title: this.appName(),
        text: text
      });
    } else {
      navigator.clipboard.writeText(text);
      this.dialogService.alert(
        this.translationService.get('messages.copiedToClipboard'),
        this.translationService.get('common.save'),
        'success'
      );
    }
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
   * Parse CSV content to JSON
   */
  private parseCSV(content: string): any[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });

    return data;
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
