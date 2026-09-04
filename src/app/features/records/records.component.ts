import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { RecordsService } from '../../core/services/records.service';
import { ToastService } from '../../shared/services/toast.service';
import { DialogService } from '../../shared/services/dialog.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { RecordSkeletonComponent } from '../../shared/components/skeleton/record-skeleton/record-skeleton.component';

interface Record {
  id: string;
  farmerName: string;
  contactNumber: string;
  date: string;
  landInAcres: number;
  ratePerAcre: number;
  totalPayment: number;
  paidOnSight: number;
  pendingAmount: number;
  fullPaymentDate?: string;
  harvester?: string;
  markedAsPaid?: boolean;
}

interface GroupedRecords {
  dateLabel: string;
  date: string;
  records: Record[];
}

@Component({
  selector: 'app-records',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatExpansionModule,
    RecordSkeletonComponent
  ],
  templateUrl: './records.component.html',
  styleUrl: './records.component.scss'
})
export class RecordsComponent implements OnInit {
  searchQuery = signal('');
  expandedId = signal<string | null>(null);
  isLoading = signal(true);

  constructor(
    public recordsService: RecordsService,
    private toastService: ToastService,
    private dialogService: DialogService,
    private router: Router,
    public translationService: TranslationService,
    private languageService: LanguageService
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);

    try {
      await this.recordsService.loadRecords();
    } finally {
      this.isLoading.set(false);
    }
  }

  // Computed filtered records based on search
  filteredRecords = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.recordsService.records();
    }

    return this.recordsService.records().filter(record =>
      record.farmerName.toLowerCase().includes(query) ||
      record.contactNumber.includes(query) ||
      record.date.includes(query)
    );
  });

  // Computed grouped records by date
  groupedRecords = computed(() => {
    // Read translation service to reactively recompute when language toggles
    this.translationService.t();
    const records = this.filteredRecords();
    const groups = new Map<string, Record[]>();

    // Group records by date
    records.forEach(record => {
      const dateKey = record.date;
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)?.push(record);
    });

    // Convert to array and sort by date (newest first)
    const groupedArray: GroupedRecords[] = Array.from(groups.entries())
      .map(([date, records]) => ({
        dateLabel: this.getDateLabel(date),
        date: date,
        records: records.sort((a, b) => b.id.localeCompare(a.id)) // Sort by ID descending
      }))
      .sort((a, b) => {
        // Sort groups by date (newest first)
        const dateA = this.parseDate(a.date);
        const dateB = this.parseDate(b.date);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      });

    return groupedArray;
  });

  // Computed record count
  recordCount = computed(() => this.filteredRecords().length);

  /** Mark record as paid (soft delete): pending = 0, strikethrough in list. User can edit to revert. */
  async markRecordAsPaid(id: string): Promise<void> {
    const record = this.recordsService.getAllRecords().find(r => r.id === id);
    if (!record) return;

    this.dialogService.confirm(
      this.translationService.get('messages.markAsPaidMessage'),
      this.translationService.get('messages.markAsPaidConfirm'),
      this.translationService.get('common.save'),
      this.translationService.get('common.cancel'),
      'info'
    ).subscribe(async confirmed => {
      if (confirmed) {
        try {
          await this.recordsService.markRecordAsPaid(id);
          this.toastService.success(this.translationService.get('messages.recordMarkedAsPaid'));
        } catch (error) {
          console.error('Error marking record as paid:', error);
          this.toastService.error(this.translationService.get('messages.updateError'));
        }
      }
    });
  }

  toggleExpand(recordId: string): void {
    this.expandedId.set(
      this.expandedId() === recordId ? null : recordId
    );
  }

  isExpanded(recordId: string): boolean {
    return this.expandedId() === recordId;
  }

  onSearch(): void {
    // Trigger computed filteredRecords
  }

  editRecord(record: Record): void {
    // Navigate to add-new component with record ID
    this.router.navigate(['/add-new', record.id]);
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  formatCurrency(amount: number): string {
    const currentLang = this.languageService.getCurrentLanguage();
    const locale = currentLang === 'hi' ? 'hi-IN' : 'en-IN';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  shareRecord(record: Record){
    const text: string = this.buildShareText(record);
    const isHi = this.translationService.getCurrentLanguage() === 'hi';

    if (navigator.share) {
      navigator.share({
        title: isHi ? 'किसान कटाई पर्ची' : 'Farmer Record',
        text: text
      }).catch(() => {
        // Fallback to clipboard on cancel or error
        navigator.clipboard?.writeText(text);
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toastService.success(isHi ? 'पर्ची क्लिपबोर्ड पर कॉपी हो गई है' : 'Record copied to clipboard');
      });
    }
  }

  buildShareText(data: Record): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    if (isHi) {
      return `🌾 *किसान कटाई पर्ची* 🌾\n` +
        `किसान का नाम   : ${data.farmerName}\n` +
        `मोबाइल नंबर   : ${data.contactNumber || '-'}\n` +
        `दिनांक         : ${data.date}\n` +
        `रकबा (एकड़)    : ${data.landInAcres} एकड़\n` +
        `कटाई दर        : ₹${data.ratePerAcre}/एकड़\n` +
        `कुल राशि       : ₹${data.totalPayment}\n` +
        `नकद भुगतान     : ₹${data.paidOnSight || 0}\n` +
        `भुगतान तिथि    : ${data.fullPaymentDate || '-'}\n` +
        `----------------------------------------\n` +
        `बाकी रकम       : ₹${data.pendingAmount}\n` +
        `हार्वेस्टर कटिंग लेजर`;
    }
    return `🌾 *Farmer Cutting Receipt* 🌾\n` +
      `Farmer Name    : ${data.farmerName}\n` +
      `Contact Number : ${data.contactNumber || '-'}\n` +
      `Date           : ${data.date}\n` +
      `Land In Acres  : ${data.landInAcres} Acres\n` +
      `Rate Per Acre  : ₹${data.ratePerAcre}\n` +
      `Total Payment  : ₹${data.totalPayment}\n` +
      `Paid On Sight  : ₹${data.paidOnSight || 0}\n` +
      `Payment Date   : ${data.fullPaymentDate || '-'}\n` +
      `----------------------------------------\n` +
      `Pending Due    : ₹${data.pendingAmount}\n` +
      `Harvester Cutting Tracker`;
  }

  callNumber(contactNumber: string): void {
    window.open(`tel:${contactNumber}`, '_system');
  }

  /**
   * Parse date string (supports both YYYY-MM-DD and DD-MM-YYYY formats)
   */
  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;

    // Check if format is YYYY-MM-DD (ISO format)
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    
    // Otherwise assume DD-MM-YYYY format
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }

  /**
   * Get date label (Today, Yesterday, or formatted date)
   */
  getDateLabel(dateString: string): string {
    const recordDate = this.parseDate(dateString);
    if (!recordDate) return dateString;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const recordDateOnly = new Date(recordDate);
    recordDateOnly.setHours(0, 0, 0, 0);

    // Check if today
    if (recordDateOnly.getTime() === today.getTime()) {
      return this.translationService.get('records.today') || 'Today';
    }

    // Check if yesterday
    if (recordDateOnly.getTime() === yesterday.getTime()) {
      return this.translationService.get('records.yesterday') || 'Yesterday';
    }

    // Format as date based on current language selection
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: recordDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    };

    // Use the current language from service
    const currentLang = this.languageService.getCurrentLanguage();
    const locale = currentLang === 'hi' ? 'hi-IN' : 'en-IN';
    return recordDate.toLocaleDateString(locale, options);
  }

}
