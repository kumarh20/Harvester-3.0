import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

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
  styleUrl: './more.component.scss'
})
export class MoreComponent {
  appVersion = '1.0.0';
  appName = 'हार्वेस्टर ट्रैकर';

  options = signal<Option[]>([
    {
      id: 'export',
      title: 'डेटा एक्सपोर्ट',
      description: 'अपना डेटा डाउनलोड करें',
      icon: 'download',
      action: () => this.exportData()
    },
    {
      id: 'import',
      title: 'डेटा इम्पोर्ट',
      description: 'डेटा अपलोड करें',
      icon: 'upload',
      action: () => this.importData()
    },
    {
      id: 'about',
      title: 'ऐप के बारे में',
      description: 'वर्जन 1.0.0',
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
      alert('कोई डेटा एक्सपोर्ट करने के लिए नहीं है');
      return;
    }

    try {
      const data = JSON.parse(records);
      const csvContent = this.convertToCSV(data);
      this.downloadCSV(csvContent, 'harvester_records.csv');
      alert('डेटा सफलतापूर्वक एक्सपोर्ट किया गया');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('डेटा एक्सपोर्ट करने में त्रुटि');
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
            alert('कृपया .json या .csv फाइल चुनें');
            return;
          }

          localStorage.setItem('harvester_records', JSON.stringify(data));
          alert('डेटा सफलतापूर्वक इम्पोर्ट किया गया');
        } catch (error) {
          console.error('Error importing data:', error);
          alert('डेटा इम्पोर्ट करने में त्रुटि');
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
    const text = `${this.appName} - हार्वेस्टर ट्रैकर ऐप्लिकेशन। अपने किसान डेटा को आसानी से ट्रैक करें।`;

    if (navigator.share) {
      navigator.share({
        title: this.appName,
        text: text
      });
    } else {
      alert('शेयर करने के लिए क्लिपबोर्ड में कॉपी किया गया: ' + text);
      navigator.clipboard.writeText(text);
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
