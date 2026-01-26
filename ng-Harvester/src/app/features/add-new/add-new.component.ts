import { Component, signal, computed, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import { LoaderService } from '../../shared/services/loader.service';
import { TranslationService } from '../../shared/services/translation.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-add-new',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './add-new.component.html',
  styleUrl: './add-new.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class AddNewComponent implements OnInit {
  // Reactive Form with FormControls
  recordForm!: FormGroup;

  // Calculated values
  totalPayment = signal(0);
  pendingPayment = signal(0);

  // Loading state
  isSubmitting = signal(false);

  // Edit mode state
  isEditMode = signal(false);
  editingRecordId = signal<string | null>(null);
  currentDate = new Date();

  // Computed signals for form titles
  formTitle = computed(() => 
    this.isEditMode() 
      ? this.translationService.get('form.editRecord')
      : this.translationService.get('form.addNewRecord')
  );
  
  formSubtitle = computed(() => 
    this.isEditMode()
      ? this.translationService.get('form.editRecord')
      : this.translationService.get('form.farmerInfo')
  );
  
  submitButtonText = computed(() =>
    this.isEditMode()
      ? this.translationService.get('common.update')
      : this.translationService.get('common.save')
  );

  constructor(
    private fb: FormBuilder,
    private recordsService: RecordsService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService,
    private loaderService: LoaderService,
    private auth: Auth
  ) {
    this.initializeForm();
  }

  /**
   * Initialize Reactive Form with FormControls and Validators
   */
  private initializeForm(): void {
    this.recordForm = this.fb.group({
      farmerName: ['', [Validators.required, Validators.minLength(2)]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      date: [new Date(), Validators.required],
      landInAcres: [0, [Validators.required, Validators.min(0.01)]],
      ratePerAcre: [2500, [Validators.required, Validators.min(1)]],
      paidOnSight: [0, [Validators.min(0)]],
      fullPaymentDate: ['']
    });

    // Subscribe to value changes for automatic calculations
    this.recordForm.valueChanges.subscribe(() => {
      this.updateCalculations();
    });

    // Initial calculation
    this.updateCalculations();
  }

  ngOnInit(): void {
    // Check if we're in edit mode (URL has :id parameter)
    this.route.params.subscribe(params => {
      const recordId = params['id'];
      if (recordId) {
        this.loadRecordForEdit(recordId);
      }
    });
  }

  /**
   * Load record for editing - Uses patchValue() for clean data patching
   */
  private loadRecordForEdit(recordId: string): void {
    const record = this.recordsService.getRecordById(recordId);

    if (record) {
      console.log('📝 Loading record for edit:', record);

      // Set edit mode
      this.isEditMode.set(true);
      this.editingRecordId.set(recordId);

      // Convert dates to Date objects for Material Datepicker
      const dateObj = this.convertToDateObject(record.date);
      const paymentDateObj = record.fullPaymentDate ? this.convertToDateObject(record.fullPaymentDate) : null;

      console.log('🔄 Date conversions:', {
        originalDate: record.date,
        convertedDate: dateObj,
        originalPaymentDate: record.fullPaymentDate,
        convertedPaymentDate: paymentDateObj
      });

      console.log('📊 Numeric values:', {
        landInAcres: record.landInAcres,
        ratePerAcre: record.ratePerAcre,
        paidOnSight: record.paidOnSight,
        totalPayment: record.totalPayment
      });

      // ✨ Use patchValue() to elegantly populate the form
      this.recordForm.patchValue({
        farmerName: record.farmerName,
        contactNumber: record.contactNumber,
        date: dateObj,
        landInAcres: Number(record.landInAcres) || 0,
        ratePerAcre: Number(record.ratePerAcre) || 0,
        paidOnSight: Number(record.paidOnSight) || 0,
        fullPaymentDate: paymentDateObj || ''
      });

      console.log('✅ Form patched with values:', this.recordForm.value);

      this.toastService.info(this.translationService.get('form.editRecord'));
    } else {
      this.toastService.error(this.translationService.get('messages.recordNotFound'));
      this.router.navigate(['/records']);
    }
  }

  /**
   * Convert string date to Date object for Material Datepicker
   * Handles multiple formats: DD/MM/YYYY, YYYY-MM-DD, ISO strings
   */
  private convertToDateObject(dateString: string): Date | string {
    if (!dateString || dateString.trim() === '') {
      console.log('⚠️ Empty date string');
      return '';
    }

    console.log('🔍 Converting to Date object:', dateString);

    // DD/MM/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        // Month is 0-indexed in JavaScript Date
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        console.log('✅ Converted DD/MM/YYYY to Date:', date);
        return date;
      }
    }

    // YYYY-MM-DD format or ISO string
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        console.log('✅ Parsed as Date object:', date);
        return date;
      }
    } catch (e) {
      console.error('❌ Error parsing date:', e);
    }

    console.warn('⚠️ Could not convert date, returning empty string');
    return '';
  }

  /**
   * Convert date to ISO format (YYYY-MM-DD) for storage
   * Handles multiple input types: Date objects, strings in various formats
   */
  private convertDateToISO(dateInput: Date | string): string {
    if (!dateInput) {
      console.log('⚠️ Empty date input');
      return '';
    }

    console.log('🔍 Converting date to ISO:', dateInput);

    // Handle Date object
    if (dateInput instanceof Date) {
      if (!isNaN(dateInput.getTime())) {
        const year = dateInput.getFullYear();
        const month = String(dateInput.getMonth() + 1).padStart(2, '0');
        const day = String(dateInput.getDate()).padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;
        console.log('✅ Converted Date object to ISO:', isoDate);
        return isoDate;
      }
      console.error('❌ Invalid Date object');
      return '';
    }

    // Handle string
    const dateString = String(dateInput).trim();
    if (dateString === '') {
      return '';
    }

    // Already in ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.log('✅ Already ISO format:', dateString);
      return dateString;
    }

    // DD/MM/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log('✅ Converted DD/MM/YYYY to ISO:', isoDate);
        return isoDate;
      }
    }

    // Try to parse as Date object (handles ISO 8601 strings)
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;
        console.log('✅ Parsed string as Date to ISO:', isoDate);
        return isoDate;
      }
    } catch (e) {
      console.error('❌ Error parsing date string:', e);
    }

    console.warn('⚠️ Could not convert date, returning empty string');
    return '';
  }


  /**
   * Update calculations based on form values
   * Automatically triggered by form valueChanges subscription
   */
  updateCalculations(): void {
    const landInAcres = this.recordForm.get('landInAcres')?.value || 0;
    const ratePerAcre = this.recordForm.get('ratePerAcre')?.value || 0;
    const paidOnSight = this.recordForm.get('paidOnSight')?.value || 0;

    const total = landInAcres * ratePerAcre;
    const pending = total - paidOnSight;

    this.totalPayment.set(total);
    this.pendingPayment.set(pending);
  }

  /**
   * Handle form submission - Validation is handled by Reactive Forms
   */
  async onFormSubmit(event: Event): Promise<void> {
    event.preventDefault();

    // ✨ Check form validity (Reactive Forms built-in validation)
    if (this.recordForm.invalid) {
      this.toastService.error(this.translationService.get('errors.fillAllFields'));
      this.recordForm.markAllAsTouched(); // Show validation errors
      return;
    }

    // Get form values
    const formValue = this.recordForm.value;

    // Check if cash payment exceeds total
    if (formValue.paidOnSight > this.totalPayment()) {
      this.toastService.error(this.translationService.get('errors.cashExceedsTotal'));
      return;
    }

    // Show loading state
    this.isSubmitting.set(true);
    this.loaderService.show();
    
    const loadingMessage = this.isEditMode() 
      ? this.translationService.get('common.updating')
      : this.translationService.get('common.saving');
    this.toastService.info(loadingMessage);

    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    try {
      // Prepare data for API
      const recordData = {
        uid: uid,
        farmerName: formValue.farmerName,
        contactNumber: formValue.contactNumber,
        date: this.convertDateToISO(formValue.date),
        landInAcres: Number(formValue.landInAcres),
        ratePerAcre: Number(formValue.ratePerAcre),
        paidOnSight: Number(formValue.paidOnSight),
        fullPaymentDate: formValue.fullPaymentDate ? this.convertDateToISO(formValue.fullPaymentDate) : '',
        totalPayment: this.totalPayment(),
        pendingAmount: this.pendingPayment()
      };

      if (this.isEditMode() && this.editingRecordId()) {
        // Update existing record
        console.log('📤 Updating record with data:', recordData);

        await this.recordsService.updateRecord(this.editingRecordId()!, recordData);
        this.toastService.success(this.translationService.get('messages.recordUpdated'));

        // Navigate back to records page
        this.router.navigate(['/records']);
      } else {
        // Create new record
        console.log('📤 Saving new record with data:', recordData);

        await this.recordsService.addRecord(recordData as any);
        this.toastService.success(this.translationService.get('messages.recordSaved'));

        // Reset form
        this.resetForm();
      }
    } catch (error) {
      console.error('Error saving/updating record:', error);
      const errorMessage = this.isEditMode() 
        ? this.translationService.get('messages.updateError')
        : this.translationService.get('messages.saveError');
      this.toastService.error(errorMessage);
    } finally {
      this.isSubmitting.set(false);
      this.loaderService.hide();
    }
  }

  /**
   * Reset form to initial state - Uses FormGroup.reset()
   */
  resetForm(): void {
    this.recordForm.reset({
      farmerName: '',
      contactNumber: '',
      date: new Date(),
      landInAcres: 0,
      ratePerAcre: 2500,
      paidOnSight: 0,
      fullPaymentDate: ''
    });
    this.isEditMode.set(false);
    this.editingRecordId.set(null);
  }

  /**
   * Cancel edit mode and navigate back
   */
  cancelEdit(): void {
    this.toastService.info(this.translationService.get('common.cancel'));
    this.router.navigate(['/records']);
  }
}
