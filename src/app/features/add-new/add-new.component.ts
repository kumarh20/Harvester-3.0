import { Component, signal, computed, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from '../../core/adapters/custom-date-adapter';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LandMeasurementComponent } from '../land-measurement/land-measurement.component';
import { RecordsService } from '../../core/services/records.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { RemindersService } from '../../core/services/reminders.service';
import { SeasonService } from '../../core/services/season.service';
import { ToastService } from '../../shared/services/toast.service';
import { LoaderService } from '../../shared/services/loader.service';
import { TranslationService } from '../../shared/services/translation.service';
import { DialogService } from '../../shared/services/dialog.service';
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
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDialogModule
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ],
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

  // Temporary selected time in date & time picker
  tempSelectedTime = signal<string>(this.getCurrentTimeString());

  // Converted from reminder ID (if coming from booking conversion)
  fromReminderId = signal<string | null>(null);

  // Existing Farmer Detection & Locking state
  isExistingFarmerLocked = signal(false);
  private isCheckingFarmer = false;

  // Computed signals for form titles
  formTitle = computed(() => {
    this.translationService.t();
    return this.isEditMode() 
      ? this.translationService.get('form.editRecord')
      : this.translationService.get('form.addNewRecord');
  });
  
  formSubtitle = computed(() => {
    this.translationService.t();
    return this.isEditMode()
      ? this.translationService.get('form.editRecord')
      : this.translationService.get('form.farmerInfo');
  });
  
  submitButtonText = computed(() => {
    this.translationService.t();
    return this.isEditMode()
      ? this.translationService.get('common.update')
      : this.translationService.get('common.save');
  });

  // Computed signal for minimum payment date
  // Returns today's date when creating new record, null when editing (allows past dates)
  minPaymentDate = computed(() => 
    this.isEditMode() ? null : new Date()
  );

  constructor(
    private fb: FormBuilder,
    private recordsService: RecordsService,
    private remindersService: RemindersService,
    public harvesterService: HarvesterService,
    public seasonService: SeasonService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService,
    private loaderService: LoaderService,
    private auth: Auth,
    private dialog: MatDialog,
    private dialogService: DialogService
  ) {
    this.initializeForm();
  }

  selectedHour = signal<string>('08');
  selectedMinute = signal<string>('00');
  selectedPeriod = signal<string>('AM');
  activeTimeView = signal<'none' | 'hours' | 'minutes'>('none');

  readonly hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  readonly minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  onPickerOpened(): void {
    this.activeTimeView.set('none');
    const currentTime = this.recordForm.get('cuttingTime')?.value || this.getCurrentTimeString();
    this.parseAndSetTime(currentTime);
  }

  toggleTimeView(view: 'hours' | 'minutes'): void {
    if (this.activeTimeView() === view) {
      this.activeTimeView.set('none');
    } else {
      this.activeTimeView.set(view);
    }
  }

  selectHour(hour: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.selectedHour.set(hour);
    this.activeTimeView.set('minutes');
  }

  selectMinute(minute: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.selectedMinute.set(minute);
    this.activeTimeView.set('none');
  }

  closeTimeView(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.activeTimeView.set('none');
  }

  parseAndSetTime(timeStr: string): void {
    if (!timeStr) return;
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    this.selectedHour.set(String(h).padStart(2, '0'));
    
    // Nearest or exact minute
    const rawMin = parseInt(mStr, 10) || 0;
    const minPadded = String(rawMin).padStart(2, '0');
    this.selectedMinute.set(this.minutesList.includes(minPadded) ? minPadded : String(Math.round(rawMin / 5) * 5 % 60).padStart(2, '0'));
    this.selectedPeriod.set(period);
  }

  setNow(): void {
    this.parseAndSetTime(this.getCurrentTimeString());
  }

  setPeriod(period: string): void {
    this.selectedPeriod.set(period);
  }

  onHourChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val) this.selectedHour.set(val);
  }

  onMinuteChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val) this.selectedMinute.set(val);
  }

  getFormatted24hTime(): string {
    let h = parseInt(this.selectedHour(), 10) || 0;
    const m = this.selectedMinute() || '00';
    const isPM = this.selectedPeriod() === 'PM';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  confirmDateTimeSelection(picker: any): void {
    let baseDate: Date;
    if (picker && picker._pendingSelection) {
      baseDate = new Date(picker._pendingSelection);
    } else {
      const formDate = this.recordForm.get('date')?.value;
      baseDate = formDate instanceof Date && !isNaN(formDate.getTime()) ? new Date(formDate) : new Date();
    }

    const time = this.getFormatted24hTime();
    const [hStr, mStr] = time.split(':');
    const hours = parseInt(hStr, 10) || 0;
    const minutes = parseInt(mStr, 10) || 0;

    baseDate.setHours(hours, minutes, 0, 0);
    (baseDate as any).hasTime = true;
    (baseDate as any).timeString = time;

    this.recordForm.patchValue({
      date: baseDate,
      cuttingTime: time
    });
    this.recordForm.get('date')?.markAsDirty();
    this.recordForm.get('date')?.markAsTouched();

    if (picker) {
      picker.close();
    }
  }

  openLandMeasurementDialog(): void {
    const dialogRef = this.dialog.open(LandMeasurementComponent, {
      width: '96vw',
      maxWidth: '780px',
      height: '88vh',
      panelClass: 'land-measure-dialog-modal',
      data: { isDialog: true, initialAcres: this.recordForm.get('landInAcres')?.value }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.acres > 0) {
        this.recordForm.patchValue({ landInAcres: result.acres });
        this.toastService.success(`Applied land measurement: ${result.acres} Acres (${result.bigha || ''} Bigha)`);
      }
    });
  }

  private getDefaultRate(): number {
    try {
      const saved = localStorage.getItem('defaultRatePerAcre');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
        return Number(saved);
      }
    } catch {
      // Ignored
    }
    return 2500;
  }

  getCurrentTimeString(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getInitialDateTime(): Date {
    const now = new Date();
    (now as any).hasTime = true;
    (now as any).timeString = this.getCurrentTimeString();
    return now;
  }

  isHindi(): boolean {
    return this.translationService.getCurrentLanguage() === 'hi';
  }

  /**
   * Initialize Reactive Form with FormControls and Validators
   */
  private initializeForm(): void {
    const defaultRate = this.getDefaultRate();
    this.recordForm = this.fb.group({
      farmerName: ['', [Validators.required, Validators.minLength(2)]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      date: [this.getInitialDateTime(), Validators.required],
      cuttingTime: [this.getCurrentTimeString(), Validators.required],
      landInAcres: [0, [Validators.required, Validators.min(0.01)]],
      ratePerAcre: [defaultRate, [Validators.required, Validators.min(1)]],
      paidOnSight: [0, [Validators.min(0)]],
      fullPaymentDate: [''],
      harvester: [''],
      seasonId: ['']
    });

    // Subscribe to value changes for automatic calculations
    this.recordForm.valueChanges.subscribe(() => {
      this.updateCalculations();
    });

    // Listen to contactNumber changes to detect if farmer record already exists
    this.recordForm.get('contactNumber')?.valueChanges.subscribe(val => {
      if (this.isEditMode() || this.isExistingFarmerLocked() || this.isCheckingFarmer) return;
      const clean = (val || '').toString().replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        this.checkExistingFarmer(clean);
      }
    });

    // Initial calculation
    this.updateCalculations();
  }

  private cleanPhone(phone: string): string {
    return (phone || '').toString().replace(/\D/g, '').slice(-10);
  }

  /**
   * Check if farmer record exists for the entered phone number and prompt with popup
   */
  private checkExistingFarmer(phone10: string): void {
    if (this.isCheckingFarmer || this.isExistingFarmerLocked() || this.isEditMode()) return;

    const allRecords = this.recordsService.getAllRecords();
    const matchingRecords = allRecords.filter(r => 
      this.cleanPhone(r.contactNumber) === phone10 && r.farmerName
    );

    if (matchingRecords.length === 0) return;

    this.isCheckingFarmer = true;
    const existingName = matchingRecords[0].farmerName;
    const count = matchingRecords.length;
    const isHi = this.translationService.getCurrentLanguage() === 'hi';

    const title = isHi ? 'किसान रिकॉर्ड मौजूद है' : 'Existing Farmer Record';
    const message = isHi
      ? `इस नंबर (${phone10}) पर किसान "${existingName}" का रिकॉर्ड पहले से मौजूद है (${count} कटाई रिकॉर्ड)। क्या आप इसी किसान के लिए नई कटाई जोड़ना चाहते हैं?`
      : `A record for farmer "${existingName}" already exists for this number (${count} cutting record${count > 1 ? 's' : ''}). Do you want to add a new cutting record for this farmer?`;
    const confirmText = isHi ? 'हाँ, नई कटाई जोड़ें' : 'Yes, Add Cutting';
    const cancelText = isHi ? 'रद्द करें' : 'Cancel';

    this.dialogService.confirm(message, title, confirmText, cancelText, 'info').subscribe(confirmed => {
      this.isCheckingFarmer = false;
      if (confirmed) {
        this.isExistingFarmerLocked.set(true);
        this.recordForm.patchValue({
          farmerName: existingName,
          contactNumber: phone10
        });
        this.recordForm.get('farmerName')?.enable();
        this.recordForm.get('contactNumber')?.enable();
        this.toastService.success(
          isHi 
            ? `मौजूदा किसान "${existingName}" चुना गया। नई कटाई का विवरण भरें।`
            : `Existing farmer "${existingName}" selected. Fill in new cutting details.`
        );
      } else {
        this.recordForm.patchValue({ contactNumber: '' });
      }
    });
  }

  /**
   * Unlock farmer fields if user wants to change or enter fresh details
   */
  unlockFarmerFields(): void {
    this.recordForm.get('farmerName')?.enable();
    this.recordForm.get('contactNumber')?.enable();
    this.isExistingFarmerLocked.set(false);
  }

  ngOnInit(): void {
    // 1. Synchronously process route parameters and query params without delay
    this.route.params.subscribe(params => {
      const recordId = params['id'];
      if (recordId) {
        this.loadRecordForEdit(recordId);
      }
    });

    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['fromReminderId']) {
        this.fromReminderId.set(queryParams['fromReminderId']);
      }

      if (queryParams['acres']) {
        const acresVal = parseFloat(queryParams['acres']);
        if (!isNaN(acresVal) && acresVal > 0) {
          this.recordForm.patchValue({ landInAcres: acresVal });
          this.toastService.success(`Applied measured area: ${acresVal} Acres`);
        }
      }

      if (queryParams['rate']) {
        const rateVal = parseFloat(queryParams['rate']);
        if (!isNaN(rateVal) && rateVal > 0) {
          this.recordForm.patchValue({ ratePerAcre: rateVal });
        }
      }

      if (queryParams['time']) {
        this.recordForm.patchValue({ cuttingTime: queryParams['time'] });
        this.tempSelectedTime.set(queryParams['time']);
      }

      if (queryParams['harvester']) {
        this.recordForm.patchValue({ harvester: queryParams['harvester'] });
      }

      // Pre-fill farmer name & phone from Kisan Record page or query parameters
      const servicePrefill = this.recordsService.prefillFarmerData();
      const phoneParam = queryParams['prefillPhone'] || servicePrefill?.phone;
      const nameParam = queryParams['prefillName'] || servicePrefill?.name;

      if (phoneParam || nameParam) {
        const phone = (phoneParam || '').toString().replace(/\D/g, '').slice(-10);
        const name = (nameParam || '').toString().trim();

        // Lock existing farmer state immediately BEFORE patching form to prevent any popup
        this.isExistingFarmerLocked.set(true);
        this.isCheckingFarmer = false;

        this.recordForm.patchValue({
          farmerName: name,
          contactNumber: phone
        });

        // Ensure controls remain enabled for full text visibility while readonly attribute locks editing
        this.recordForm.get('farmerName')?.enable();
        this.recordForm.get('contactNumber')?.enable();

        // Clear service prefill data so future direct visits are clean
        this.recordsService.prefillFarmerData.set(null);
      }
    });

    // 2. Load default rate, harvesters, and seasons
    if (!this.isEditMode()) {
      this.recordForm.patchValue({ ratePerAcre: this.getDefaultRate() });
    }

    this.harvesterService.loadHarvesters().then(() => {
      const defaultHarvester = this.harvesterService.getDefaultHarvester();
      if (!this.recordForm.get('harvester')?.value) {
        this.recordForm.patchValue({ harvester: defaultHarvester });
      }
    });

    this.seasonService.loadSeasons().then(() => {
      if (!this.isEditMode() && !this.recordForm.get('seasonId')?.value) {
        const defaultSeason = this.seasonService.getDefaultSeason();
        if (defaultSeason?.id) {
          this.recordForm.patchValue({ seasonId: defaultSeason.id });
        }
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
      const cuttingTime = record.cuttingTime || this.getCurrentTimeString();
      if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
        const [hStr, mStr] = cuttingTime.split(':');
        const h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        dateObj.setHours(h, m, 0, 0);
        (dateObj as any).hasTime = true;
        (dateObj as any).timeString = cuttingTime;
      }
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
        cuttingTime: cuttingTime,
        landInAcres: Number(record.landInAcres) || 0,
        ratePerAcre: Number(record.ratePerAcre) || 0,
        paidOnSight: Number(record.paidOnSight) || 0,
        fullPaymentDate: paymentDateObj || '',
        harvester: record.harvester || this.harvesterService.getDefaultHarvester(),
        seasonId: record.seasonId || ''
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
   * Handles multiple formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ISO strings
   */
  private convertToDateObject(dateString: string): Date | string {
    if (!dateString || dateString.trim() === '') {
      return '';
    }

    const clean = dateString.trim().replace(/\-/g, '/');
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
      } else {
        // DD/MM/YYYY
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }

    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      console.error('❌ Error parsing date:', e);
    }

    return '';
  }

  /**
   * Format date as DD/MM/YYYY string across the entire application
   */
  formatDateToDDMMYYYY(dateInput: Date | string | null | undefined): string {
    if (!dateInput) return '';
    let d: Date | null = null;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      const obj = this.convertToDateObject(String(dateInput));
      d = obj instanceof Date ? obj : null;
    }
    if (!d || isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Convert date to ISO format (YYYY-MM-DD) fallback
   */
  private convertDateToISO(dateInput: Date | string): string {
    return this.formatDateToDDMMYYYY(dateInput);
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

    // Get form values using getRawValue to include disabled controls (farmerName, contactNumber)
    const formValue = this.recordForm.getRawValue();

    // Check if cash payment exceeds total
    if (formValue.paidOnSight > this.totalPayment()) {
      this.toastService.error(this.translationService.get('errors.cashExceedsTotal'));
      return;
    }

    // Show loading state
    this.isSubmitting.set(true);
    this.loaderService.show();

    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    try {
      // Prepare data for API and Firestore (harvester is optional)
      const harvesterValue = formValue.harvester ? String(formValue.harvester).trim() : '';
      const formattedRecordDate = this.formatDateToDDMMYYYY(formValue.date);
      const resolvedSeasonId = formValue.seasonId || this.seasonService.getSeasonForDate(formattedRecordDate)?.id || this.seasonService.getDefaultSeason()?.id || '';

      const recordData: Record<string, unknown> = {
        uid: uid,
        farmerName: formValue.farmerName,
        contactNumber: formValue.contactNumber,
        date: formattedRecordDate,
        cuttingTime: formValue.cuttingTime || this.getCurrentTimeString(),
        landInAcres: Number(formValue.landInAcres),
        ratePerAcre: Number(formValue.ratePerAcre),
        paidOnSight: Number(formValue.paidOnSight),
        fullPaymentDate: formValue.fullPaymentDate ? this.formatDateToDDMMYYYY(formValue.fullPaymentDate) : '',
        totalPayment: this.totalPayment(),
        pendingAmount: this.pendingPayment(),
        ...(harvesterValue ? { harvester: harvesterValue } : {}),
        ...(resolvedSeasonId ? { seasonId: resolvedSeasonId } : {})
      };
      if (this.isEditMode()) {
        recordData['markedAsPaid'] = false;
      }

      if (this.isEditMode() && this.editingRecordId()) {
        // Update existing record
        console.log('📤 Updating record with data:', recordData);

        await this.recordsService.updateRecord(this.editingRecordId()!, recordData as any);
        this.toastService.success(this.translationService.get('messages.recordUpdated'));

        // Navigate back to records page
        this.router.navigate(['/records'], { queryParams: { farmer: formValue.contactNumber || formValue.farmerName } });
      } else {
        // Create new record
        console.log('📤 Saving new record with data:', recordData);

        const createdRes = await this.recordsService.addRecord(recordData as any);
        const newRecordId = (createdRes as any)?.id || '';

        // If converted from reminder booking, mark reminder completed
        const remId = this.fromReminderId();
        if (remId) {
          try {
            await this.remindersService.markAsCompleted(remId, newRecordId);
          } catch (remErr) {
            console.warn('Could not mark reminder as completed:', remErr);
          }
          this.fromReminderId.set(null);
        }

        this.toastService.success(this.translationService.get('messages.recordSaved'));

        const wasExisting = this.isExistingFarmerLocked();
        const farmerTarget = formValue.contactNumber || formValue.farmerName;
        // Reset form
        this.resetForm();

        // If this cutting was added for an existing farmer, redirect straight to their kisan detail view
        if (wasExisting) {
          this.router.navigate(['/records'], { queryParams: { farmer: farmerTarget } });
        }
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
    this.recordForm.get('farmerName')?.enable();
    this.recordForm.get('contactNumber')?.enable();
    this.isExistingFarmerLocked.set(false);
    this.recordForm.reset({
      farmerName: '',
      contactNumber: '',
      date: this.getInitialDateTime(),
      cuttingTime: this.getCurrentTimeString(),
      landInAcres: 0,
      ratePerAcre: this.getDefaultRate(),
      paidOnSight: 0,
      fullPaymentDate: '',
      harvester: this.harvesterService.getDefaultHarvester(),
      seasonId: this.seasonService.getDefaultSeason()?.id || ''
    });
    this.isEditMode.set(false);
    this.editingRecordId.set(null);
    this.updateCalculations();
  }

  /**
   * Cancel edit mode and navigate back
   */
  cancelEdit(): void {
    this.router.navigate(['/records']);
  }
}
