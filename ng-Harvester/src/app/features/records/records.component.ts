import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

interface Record {
  id: string;
  farmerName: string;
  contactNumber: string;
  date: string;
  landInAcres: number;
  ratePerAcre: number;
  totalPayment: number;
  nakadPaid: number;
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
    private dialogService: DialogService
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

    const confirmMessage = `क्या आप वाकई "${record.farmerName}" का रिकॉर्ड डिलीट करना चाहते हैं?\n\nयह क्रिया को वापस नहीं किया जा सकता।`;
    
    this.dialogService.confirm(
      confirmMessage,
      'पुष्टि करें',
      'हाँ, डिलीट करें',
      'रद्द करें',
      'warning'
    ).subscribe(async confirmed => {
      if (confirmed) {
        try {
          await this.recordsService.deleteRecord(id);
          this.toastService.success('रिकॉर्ड सफलतापूर्वक डिलीट हो गया');
        } catch (error) {
          console.error('Error deleting record:', error);
          this.toastService.error('रिकॉर्ड डिलीट करने में समस्या आई');
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
    // TODO: Navigate to edit form with record data
    console.log('Edit record:', record);
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('hi-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }
}
