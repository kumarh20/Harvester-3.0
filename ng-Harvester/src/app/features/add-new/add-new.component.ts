import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecordsService } from '../../core/services/records.service';
import { ToastService } from '../../shared/services/toast.service';

interface FormData {
  farmerName: string;
  contactNumber: string;
  date: string;
  landInAcres: number;
  ratePerAcre: number;
  nakadPaid: number;
  fullPaymentDate: string;
}

@Component({
  selector: 'app-add-new',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './add-new.component.html',
  styleUrl: './add-new.component.scss'
})
export class AddNewComponent {

  formData = signal<FormData>({
    farmerName: '',
    contactNumber: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    landInAcres: 0,
    ratePerAcre: 2500,
    nakadPaid: 0,
    fullPaymentDate: ''
  });

  // Calculated values
  totalPayment = signal(0);
  pendingPayment = signal(0);

  // Loading state
  isSubmitting = signal(false);

  constructor(
    private recordsService: RecordsService,
    private toastService: ToastService
  ) {
    this.updateCalculations();
  }

  updateCalculations(): void {
    const total = this.formData().landInAcres * this.formData().ratePerAcre;
    const pending = total - this.formData().nakadPaid;

    this.totalPayment.set(total);
    this.pendingPayment.set(pending);
  }

  onFormChange(): void {
    this.updateCalculations();
  }

  async onFormSubmit(event: Event): Promise<void> {
    event.preventDefault();

    // Validation
    if (!this.formData().farmerName.trim()) {
      this.toastService.error('कृपया किसान का नाम दर्ज करें');
      return;
    }

    if (!this.formData().contactNumber.trim() || this.formData().contactNumber.length !== 10) {
      this.toastService.error('कृपया सही मोबाइल नंबर दर्ज करें');
      return;
    }

    if (this.formData().landInAcres <= 0) {
      this.toastService.error('कृपया ज़मीन की मात्रा दर्ज करें');
      return;
    }

    if (this.formData().ratePerAcre <= 0) {
      this.toastService.error('कृपया वैध दर दर्ज करें');
      return;
    }

    // Check if cash payment exceeds total
    if (this.formData().nakadPaid > this.totalPayment()) {
      this.toastService.error('नकद राशि कुल राशि से अधिक नहीं हो सकती');
      return;
    }

    // Show loading state
    this.isSubmitting.set(true);
    this.toastService.info('रिकॉर्ड सेव हो रहा है...');

    try {
      // Save to service (with cloud sync)
      const recordToSave = {
        ...this.formData(),
        totalPayment: this.totalPayment(),
        pendingAmount: this.pendingPayment()
      };

      await this.recordsService.addRecord(recordToSave as any);
      
      this.toastService.success('रिकॉर्ड सफलतापूर्वक सेव हो गया! 🎉');

      // Reset form
      this.resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
      this.toastService.error('रिकॉर्ड सेव करने में समस्या हुई');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm(): void {
    this.formData.set({
      farmerName: '',
      contactNumber: '',
      date: new Date().toISOString().split('T')[0],
      landInAcres: 0,
      ratePerAcre: 2500,
      nakadPaid: 0,
      fullPaymentDate: ''
    });
    this.updateCalculations();
  }
}
