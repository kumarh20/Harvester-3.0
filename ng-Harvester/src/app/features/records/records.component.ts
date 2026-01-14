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
    MatExpansionModule
  ],
  templateUrl: './records.component.html',
  styleUrl: './records.component.scss'
})
export class RecordsComponent implements OnInit {
  searchQuery = signal('');
  expandedId = signal<string | null>(null);

  constructor(
    public recordsService: RecordsService,
    private toastService: ToastService,
    private dialogService: DialogService,
    private router: Router,
    public translationService: TranslationService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    // Records are automatically loaded from service
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

  // Computed record count
  recordCount = computed(() => this.filteredRecords().length);

  async deleteRecord(id: string): Promise<void> {
    const record = this.recordsService.getAllRecords().find(r => r.id === id);
    if (!record) return;

    const confirmMessage = this.translationService.getWithParams('messages.deleteConfirm', { farmerName: record.farmerName });
    
    this.dialogService.confirm(
      confirmMessage,
      this.translationService.get('messages.deleteConfirmMessage'),
      this.translationService.get('common.delete'),
      this.translationService.get('common.cancel'),
      'warning'
    ).subscribe(async confirmed => {
      if (confirmed) {
        try {
          await this.recordsService.deleteRecord(id);
          this.toastService.success(this.translationService.get('messages.recordDeleted'));
        } catch (error) {
          console.error('Error deleting record:', error);
          this.toastService.error(this.translationService.get('messages.deleteError'));
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
    const locale = this.languageService.isHindi() ? 'hi-IN' : 'en-IN';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  shareRecord(record: Record){
    const text: string = this.buildShareText(record);
  
    if (navigator.share) {
      navigator.share({
        title: 'Farmer Record',
        text: text
      });
    } else {
      alert('Share option is not supported on this browser');
    }
  }

  buildShareText(data: Record): string {
    return `
  📋 Farmer Record
  
Name           : ${data.farmerName}
Contact Number : ${data.contactNumber}
Date           : ${data.date}
Land In Acres  : ${data.landInAcres} 
Rate Per Acre  : ${data.ratePerAcre}
Total Payment  : ${data.totalPayment}
Paid On Sight  : ${data.paidOnSight}
Full Payment Date : ${data.fullPaymentDate}
----------------------------------------
Pending Amount : ${data.pendingAmount}
  `;
  }

  callNumber(contactNumber: string): void {
    window.open(`tel:${contactNumber}`, '_system');
  }
  
}
