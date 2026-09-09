import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { RemindersService, Reminder } from '../../core/services/reminders.service';
import { RecordsService } from '../../core/services/records.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../shared/services/toast.service';
import { DialogService } from '../../shared/services/dialog.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { LandMeasurementComponent } from '../land-measurement/land-measurement.component';
import { DateTimePickerDialogComponent, DateTimePickerResult } from '../../shared/components/date-time-picker-dialog/date-time-picker-dialog.component';
import { AppNavigationService } from '../../core/services/app-navigation.service';
import { SeasonService } from '../../core/services/season.service';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { ReminderSkeletonComponent } from '../../shared/components/skeleton/reminder-skeleton/reminder-skeleton.component';

export type ReminderTabFilter = 'today' | 'tomorrow' | 'upcoming' | 'all' | 'custom';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDialogModule,
    ReminderSkeletonComponent
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ],
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class RemindersComponent implements OnInit {
  // Form State
  bookingForm!: FormGroup;
  isFormOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingReminderId = signal<string | null>(null);
  isSubmitting = signal<boolean>(false);

  // Today's date constraint for reminders - disallows past dates
  todayDate: Date = new Date();
  
  // Real-time calculation signals
  landInAcresVal = signal<number>(1);
  ratePerAcreVal = signal<number>(2500);

  // Search & Unified Filters (Date, Season, Harvester)
  searchQuery = signal<string>('');
  activeTab = signal<ReminderTabFilter>('all');
  customFilterDate = signal<string>('');

  selectedDateFilter = signal<string>('all');
  selectedSeasonFilter = signal<string>('all');
  selectedHarvesterFilter = signal<string>('all');

  // Filter Drawer State
  isFilterPanelOpen = signal<boolean>(false);
  isDrawerDateOpen = signal<boolean>(false);
  isDrawerSeasonOpen = signal<boolean>(false);
  isDrawerHarvesterOpen = signal<boolean>(false);
  customMode = signal<'single' | 'range'>('single');
  customSingleDate = signal<string>('');
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');

  // Auto-detect existing farmer
  isCheckingFarmer = false;
  isExistingFarmerLocked = signal<boolean>(false);

  // Move to record prompt modal
  pendingMoveReminder = signal<Reminder | null>(null);
  expandedReminderId = signal<string | null>(null);

  // Temporary selected time for clean datetime picker in reminders
  tempReminderTime = signal<string>('08:00');

  constructor(
    private fb: FormBuilder,
    public remindersService: RemindersService,
    private recordsService: RecordsService,
    public harvesterService: HarvesterService,
    public seasonService: SeasonService,
    private uiPreferencesService: UiPreferencesService,
    public notificationService: NotificationService,
    private toastService: ToastService,
    private dialogService: DialogService,
    private route: ActivatedRoute,
    public router: Router,
    public translationService: TranslationService,
    private languageService: LanguageService,
    private dialog: MatDialog,
    public appNavigationService: AppNavigationService
  ) {
    this.initializeForm();
  }

  goBack(): void {
    this.appNavigationService.back('/dashboard');
  }

  selectedHour = signal<string>('08');
  selectedMinute = signal<string>('00');
  selectedPeriod = signal<string>('AM');
  activeTimeView = signal<'none' | 'hours' | 'minutes'>('none');

  readonly hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  readonly minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  bookingDateTimeDisplay = signal<string>('');

  updateBookingDateTimeDisplay(): void {
    if (!this.bookingForm) return;
    const d = this.bookingForm.get('scheduledDate')?.value;
    const t = this.bookingForm.get('scheduledTime')?.value;
    if (!d) {
      this.bookingDateTimeDisplay.set('');
      return;
    }
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) {
      this.bookingDateTimeDisplay.set('');
      return;
    }
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    
    let timeFormatted = '';
    if (t) {
      const [hStr, mStr] = t.split(':');
      let h = parseInt(hStr, 10) || 0;
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      timeFormatted = `, ${h}:${mStr || '00'} ${period}`;
    }
    this.bookingDateTimeDisplay.set(`${dd}/${mm}/${yyyy}${timeFormatted}`);
  }

  openBookingDateTimePicker(): void {
    const currentDateVal = this.bookingForm.get('scheduledDate')?.value || new Date();
    const currentTimeVal = this.bookingForm.get('scheduledTime')?.value || '08:00';

    const dialogRef = this.dialog.open(DateTimePickerDialogComponent, {
      panelClass: 'kendo-dtp-dialog-panel',
      data: {
        initialDate: currentDateVal,
        initialTime: currentTimeVal,
        minDate: this.todayDate,
        mode: 'datetime',
        title: this.isHindi() ? 'कटाई का दिनांक व समय' : 'Scheduled Date & Time'
      }
    });

    dialogRef.afterClosed().subscribe((result: DateTimePickerResult | null) => {
      if (result) {
        this.bookingForm.patchValue({
          scheduledDate: result.date,
          scheduledTime: result.time
        });
        this.bookingForm.get('scheduledDate')?.markAsDirty();
        this.bookingForm.get('scheduledDate')?.markAsTouched();
        this.bookingForm.get('scheduledTime')?.markAsDirty();
        this.bookingForm.get('scheduledTime')?.markAsTouched();
        this.updateBookingDateTimeDisplay();
      }
    });
  }

  openCalendarFilter(): void {
    const dialogRef = this.dialog.open(DateTimePickerDialogComponent, {
      panelClass: 'kendo-dtp-dialog-panel',
      data: {
        initialDate: new Date(),
        mode: 'date',
        title: this.isHindi() ? 'तारीख अनुसार फ़िल्टर' : 'Filter by Date'
      }
    });

    dialogRef.afterClosed().subscribe((result: DateTimePickerResult | null) => {
      if (result) {
        this.onCustomDateSelected(result.date);
      }
    });
  }

  onReminderPickerOpened(): void {
    this.activeTimeView.set('none');
    const currentTime = this.bookingForm.get('scheduledTime')?.value || '08:00';
    this.parseAndSetReminderTime(currentTime);
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

  parseAndSetReminderTime(timeStr: string): void {
    if (!timeStr) return;
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    this.selectedHour.set(String(h).padStart(2, '0'));
    
    const rawMin = parseInt(mStr, 10) || 0;
    const minPadded = String(rawMin).padStart(2, '0');
    this.selectedMinute.set(this.minutesList.includes(minPadded) ? minPadded : String(Math.round(rawMin / 5) * 5 % 60).padStart(2, '0'));
    this.selectedPeriod.set(period);
  }

  setReminderNow(): void {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    this.parseAndSetReminderTime(`${h}:${m}`);
  }

  setReminderPeriod(period: string): void {
    this.selectedPeriod.set(period);
  }

  onReminderHourChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val) this.selectedHour.set(val);
  }

  onReminderMinuteChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val) this.selectedMinute.set(val);
  }

  getFormattedReminder24hTime(): string {
    let h = parseInt(this.selectedHour(), 10) || 0;
    const m = this.selectedMinute() || '00';
    const isPM = this.selectedPeriod() === 'PM';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  confirmReminderDateTimeSelection(picker: any): void {
    let baseDate: Date;
    if (picker && picker._pendingSelection) {
      baseDate = new Date(picker._pendingSelection);
    } else {
      const formDate = this.bookingForm.get('scheduledDate')?.value;
      baseDate = formDate instanceof Date && !isNaN(formDate.getTime()) ? new Date(formDate) : new Date();
    }

    const time = this.getFormattedReminder24hTime();
    const [hStr, mStr] = time.split(':');
    const hours = parseInt(hStr, 10) || 0;
    const minutes = parseInt(mStr, 10) || 0;

    baseDate.setHours(hours, minutes, 0, 0);
    (baseDate as any).hasTime = true;
    (baseDate as any).timeString = time;

    this.bookingForm.patchValue({
      scheduledDate: baseDate,
      scheduledTime: time
    });
    this.bookingForm.get('scheduledDate')?.markAsDirty();
    this.bookingForm.get('scheduledDate')?.markAsTouched();

    if (picker) {
      picker.close();
    }
  }

  toggleReminderExpand(id: string): void {
    this.expandedReminderId.set(this.expandedReminderId() === id ? null : id);
  }

  isHindi(): boolean {
    return this.translationService.getCurrentLanguage() === 'hi';
  }

  async ngOnInit(): Promise<void> {
    await this.harvesterService.loadHarvesters();
    await this.remindersService.loadReminders();
    await this.recordsService.loadRecords();
    await this.seasonService.loadSeasons();

    // Default filter from UI preferences (if configured)
    const prefFilter = this.uiPreferencesService.defaultRecordFilter();
    if (prefFilter && prefFilter !== 'all') {
      this.selectedDateFilter.set(prefFilter);
    }

    // Default season from SeasonService (if configured)
    const defSeason = this.seasonService.defaultSeason();
    if (defSeason && defSeason.id) {
      this.selectedSeasonFilter.set(defSeason.id);
    }

    // Default harvester is 'all' as requested
    this.selectedHarvesterFilter.set('all');

    // Check query params
    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        const f = params['filter'];
        if (f === 'today' || f === 'tomorrow' || f === 'upcoming' || f === 'all' || f === 'week' || f === 'month') {
          this.activeTab.set(f as ReminderTabFilter);
          this.selectedDateFilter.set(f);
        }
      }

      if (params['new'] === 'true') {
        this.openNewBookingForm();
      }

      if (params['prefillName'] || params['prefillPhone']) {
        this.openNewBookingForm();
        this.bookingForm.patchValue({
          farmerName: params['prefillName'] || '',
          contactNumber: params['prefillPhone'] || ''
        });
      }
    });

    // Run scheduled notification evaluation
    this.notificationService.evaluateTodayCuttings();
  }

  private getDefaultRate(): number {
    try {
      const saved = localStorage.getItem('defaultRatePerAcre');
      if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
        return Number(saved);
      }
    } catch {}
    return 2500;
  }

  private initializeForm(): void {
    const defaultRate = this.getDefaultRate();
    const defaultHarvester = this.harvesterService.getDefaultHarvester();

    this.landInAcresVal.set(1);
    this.ratePerAcreVal.set(defaultRate);

    this.bookingForm = this.fb.group({
      farmerName: ['', [Validators.required, Validators.minLength(2)]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      scheduledDate: [new Date(), Validators.required],
      scheduledTime: ['08:00', Validators.required],
      landInAcres: [1, [Validators.required, Validators.min(0.01)]],
      ratePerAcre: [defaultRate, [Validators.required, Validators.min(1)]],
      harvester: [defaultHarvester],
      notes: ['']
    });

    // Sync form control changes with calculation signals & date time displays
    this.bookingForm.valueChanges.subscribe(() => {
      this.updateBookingDateTimeDisplay();
    });

    this.bookingForm.get('landInAcres')?.valueChanges.subscribe(val => {
      const num = parseFloat(val);
      this.landInAcresVal.set(isNaN(num) ? 0 : num);
    });

    this.bookingForm.get('ratePerAcre')?.valueChanges.subscribe(val => {
      const num = parseFloat(val);
      this.ratePerAcreVal.set(isNaN(num) ? 0 : num);
    });

    // Listen to contactNumber changes for existing farmer prompt
    this.bookingForm.get('contactNumber')?.valueChanges.subscribe(val => {
      if (this.isEditMode() || this.isExistingFarmerLocked() || this.isCheckingFarmer) return;
      const clean = (val || '').toString().replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        this.checkExistingFarmer(clean);
      }
    });

    this.updateBookingDateTimeDisplay();
  }

  onLandChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    this.landInAcresVal.set(isNaN(val) ? 0 : val);
  }

  onRateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    this.ratePerAcreVal.set(isNaN(val) ? 0 : val);
  }

  private cleanPhone(phone?: string): string {
    return (phone || '').toString().replace(/\D/g, '').slice(-10);
  }

  private checkExistingFarmer(phone10: string): void {
    if (this.isCheckingFarmer || this.isExistingFarmerLocked() || this.isEditMode()) return;

    const allRecords = this.recordsService.getAllRecords();
    const matching = allRecords.filter(r => this.cleanPhone(r.contactNumber) === phone10 && r.farmerName);

    if (matching.length === 0) return;

    this.isCheckingFarmer = true;
    const existingName = matching[0].farmerName;
    const isHi = this.translationService.getCurrentLanguage() === 'hi';

    const title = isHi ? 'किसान रिकॉर्ड मौजूद है' : 'Existing Farmer Record';
    const message = isHi
      ? `इस नंबर (${phone10}) पर किसान "${existingName}" का रिकॉर्ड मिला। क्या यह बुकिंग इन्हीं के लिए है?`
      : `Found existing farmer record "${existingName}" for this number (${phone10}). Is this booking for them?`;

    this.dialogService.confirm(message, title, isHi ? 'हाँ, यह किसान' : 'Yes', isHi ? 'नया किसान' : 'New Farmer', 'info').subscribe(confirmed => {
      this.isCheckingFarmer = false;
      if (confirmed) {
        this.isExistingFarmerLocked.set(true);
        this.bookingForm.patchValue({
          farmerName: existingName,
          contactNumber: phone10
        });
      }
    });
  }

  unlockFarmerFields(): void {
    this.isExistingFarmerLocked.set(false);
  }

  // Calculated estimated total signal (updates dynamically)
  estimatedTotal = computed(() => {
    const acres = Number(this.landInAcresVal()) || 0;
    const rate = Number(this.ratePerAcreVal()) || 0;
    return Math.round(acres * rate);
  });

  // Available Harvesters list
  availableHarvesters = computed(() => {
    const list = this.harvesterService.harvesters();
    if (list && list.length > 0) {
      return list;
    }
    const allReminders = this.remindersService.reminders();
    const set = new Set<string>();
    allReminders.forEach(r => {
      const h = (r.harvester || '').trim();
      if (h) set.add(h);
    });
    const found = Array.from(set);
    return found.length > 0 ? found : ['Harvester 1', 'Harvester 2'];
  });

  // Active filter count for badge
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedDateFilter() !== 'all') count++;
    if (this.selectedSeasonFilter() !== 'all') count++;
    if (this.selectedHarvesterFilter() !== 'all') count++;
    return count;
  });

  // Filtered Reminders
  filteredReminders = computed(() => {
    const all = this.remindersService.reminders();
    const query = this.searchQuery().trim().toLowerCase();
    const dateFilter = this.selectedDateFilter();
    const seasonFilter = this.selectedSeasonFilter();
    const harvesterFilter = this.selectedHarvesterFilter();

    let list = all.filter(r => r.status !== 'cancelled');

    // Filter by Harvester
    if (harvesterFilter !== 'all') {
      list = list.filter(r => (r.harvester || '').trim().toLowerCase() === harvesterFilter.trim().toLowerCase());
    }

    // Filter by Season
    if (seasonFilter !== 'all') {
      list = list.filter(r => {
        const s = this.seasonService.getSeasonForDate(r.scheduledDate);
        return s && (s.id === seasonFilter || s.name === seasonFilter);
      });
    }

    // Filter by Date
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        list = list.filter(r => this.remindersService.isToday(r.scheduledDate));
      } else if (dateFilter === 'tomorrow') {
        list = list.filter(r => this.remindersService.isTomorrow(r.scheduledDate));
      } else if (dateFilter === 'yesterday') {
        list = list.filter(r => {
          const d = this.remindersService.parseDate(r.scheduledDate);
          if (!d) return false;
          const yest = new Date(today);
          yest.setDate(yest.getDate() - 1);
          return d.getFullYear() === yest.getFullYear() &&
                 d.getMonth() === yest.getMonth() &&
                 d.getDate() === yest.getDate();
        });
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(today);
        const day = startOfWeek.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        list = list.filter(r => {
          const d = this.remindersService.parseDate(r.scheduledDate);
          return d && d >= startOfWeek && d <= endOfWeek;
        });
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        list = list.filter(r => {
          const d = this.remindersService.parseDate(r.scheduledDate);
          return d && d >= startOfMonth && d <= endOfMonth;
        });
      } else if (dateFilter === 'custom') {
        const mode = this.customMode();
        if (mode === 'single' && this.customSingleDate()) {
          const target = this.customSingleDate();
          list = list.filter(r => {
            const d = this.remindersService.parseDate(r.scheduledDate);
            if (!d) return false;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayStr = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dayStr}` === target;
          });
        } else if (mode === 'range') {
          const start = this.customStartDate() ? new Date(this.customStartDate()) : null;
          const end = this.customEndDate() ? new Date(this.customEndDate()) : null;
          if (start) start.setHours(0, 0, 0, 0);
          if (end) end.setHours(23, 59, 59, 999);

          list = list.filter(r => {
            const d = this.remindersService.parseDate(r.scheduledDate);
            if (!d) return false;
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
          });
        }
      }
    }

    // Filter by search query
    if (query) {
      list = list.filter(r => 
        r.farmerName?.toLowerCase().includes(query) ||
        r.contactNumber?.includes(query) ||
        r.notes?.toLowerCase().includes(query) ||
        r.harvester?.toLowerCase().includes(query)
      );
    }

    // Sort by scheduled date and time ascending (earliest first)
    return [...list].sort((a, b) => {
      const dateA = this.remindersService.parseDate(a.scheduledDate)?.getTime() || 0;
      const dateB = this.remindersService.parseDate(b.scheduledDate)?.getTime() || 0;
      if (dateA !== dateB) return dateA - dateB;
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
    });
  });

  // Reminders by date for drawer count badge
  remindersByDate = computed(() => {
    const all = this.remindersService.reminders().filter(r => r.status !== 'cancelled');
    const dateFilter = this.selectedDateFilter();
    if (dateFilter === 'all') return all;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateFilter === 'today') return all.filter(r => this.remindersService.isToday(r.scheduledDate));
    if (dateFilter === 'tomorrow') return all.filter(r => this.remindersService.isTomorrow(r.scheduledDate));
    if (dateFilter === 'week') {
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return all.filter(r => {
        const d = this.remindersService.parseDate(r.scheduledDate);
        return d && d >= startOfWeek && d <= endOfWeek;
      });
    }
    if (dateFilter === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      return all.filter(r => {
        const d = this.remindersService.parseDate(r.scheduledDate);
        return d && d >= startOfMonth && d <= endOfMonth;
      });
    }
    return all;
  });

  // Summary counts
  allCount = computed(() => this.remindersService.reminders().filter(r => r.status !== 'cancelled').length);
  todayCount = computed(() => this.remindersService.reminders().filter(r => r.status !== 'cancelled' && this.remindersService.isToday(r.scheduledDate)).length);
  tomorrowCount = computed(() => this.remindersService.reminders().filter(r => r.status !== 'cancelled' && this.remindersService.isTomorrow(r.scheduledDate)).length);
  weekCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return this.remindersService.reminders().filter(r => {
      if (r.status === 'cancelled') return false;
      const d = this.remindersService.parseDate(r.scheduledDate);
      return d && d >= startOfWeek && d <= endOfWeek;
    }).length;
  });
  monthCount = computed(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.remindersService.reminders().filter(r => {
      if (r.status === 'cancelled') return false;
      const d = this.remindersService.parseDate(r.scheduledDate);
      return d && d >= startOfMonth && d <= endOfMonth;
    }).length;
  });
  totalPendingCount = computed(() => this.remindersService.pendingReminders().length);

  getSelectedDateFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const filter = this.selectedDateFilter();
    switch (filter) {
      case 'today': return isHi ? 'आज' : 'Today';
      case 'yesterday': return isHi ? 'कल (बीता)' : 'Yesterday';
      case 'tomorrow': return isHi ? 'कल (आगामी)' : 'Tomorrow';
      case 'week': return isHi ? 'इस सप्ताह' : 'This Week';
      case 'month': return isHi ? 'इस माह' : 'This Month';
      case 'custom': {
        if (this.customMode() === 'single' && this.customSingleDate()) {
          return this.formatDateDisplay(this.customSingleDate());
        } else if (this.customMode() === 'range' && (this.customStartDate() || this.customEndDate())) {
          return `${this.formatDateDisplay(this.customStartDate())} - ${this.formatDateDisplay(this.customEndDate())}`;
        }
        return isHi ? 'कस्टम तारीख' : 'Custom Date';
      }
      default: return isHi ? 'सभी तारीख' : 'All Dates';
    }
  }

  getSelectedSeasonFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const filter = this.selectedSeasonFilter();
    if (filter === 'all') {
      return isHi ? 'सभी सीज़न' : 'All Seasons';
    }
    const season = this.seasonService.seasons().find(s => s.id === filter);
    return season ? `${season.name} ${season.year}` : (isHi ? 'सीज़न' : 'Season');
  }

  getSelectedHarvesterFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const filter = this.selectedHarvesterFilter();
    if (filter === 'all') {
      return isHi ? 'सभी हार्वेस्टर' : 'All Harvesters';
    }
    return filter;
  }

  getSeasonReminderCount(seasonId?: string): number {
    if (!seasonId) return 0;
    const all = this.remindersService.reminders().filter(r => r.status !== 'cancelled');
    if (seasonId === 'all') return all.length;
    return all.filter(r => {
      const s = this.seasonService.getSeasonForDate(r.scheduledDate);
      return s && (s.id === seasonId || s.name === seasonId);
    }).length;
  }

  getHarvesterReminderCount(harvester: string): number {
    const all = this.remindersService.reminders().filter(r => r.status !== 'cancelled');
    if (harvester === 'all') return all.length;
    return all.filter(r => (r.harvester || '').trim().toLowerCase() === harvester.trim().toLowerCase()).length;
  }

  formatDateDisplay(dateStr?: string | null): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }

  openFilterPanel(): void {
    this.isFilterPanelOpen.set(true);
  }

  closeFilterPanel(): void {
    this.isFilterPanelOpen.set(false);
    this.isDrawerDateOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
  }

  applyFilterPanel(): void {
    this.closeFilterPanel();
  }

  toggleDrawerDate(): void {
    this.isDrawerDateOpen.update(v => !v);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
  }

  toggleDrawerSeason(): void {
    this.isDrawerSeasonOpen.update(v => !v);
    this.isDrawerDateOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
  }

  toggleDrawerHarvester(): void {
    this.isDrawerHarvesterOpen.update(v => !v);
    this.isDrawerDateOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
  }

  selectDateOption(option: string): void {
    this.selectedDateFilter.set(option);
    this.isDrawerDateOpen.set(false);
  }

  selectSeasonOption(seasonId?: string): void {
    this.selectedSeasonFilter.set(seasonId || 'all');
    this.isDrawerSeasonOpen.set(false);
  }

  selectHarvesterOption(harvester: string): void {
    this.selectedHarvesterFilter.set(harvester);
    this.isDrawerHarvesterOpen.set(false);
  }

  setCustomMode(mode: 'single' | 'range'): void {
    this.customMode.set(mode);
  }

  openCustomDateDialog(type: 'single' | 'start' | 'end'): void {
    let currentVal = '';
    if (type === 'single') currentVal = this.customSingleDate();
    if (type === 'start') currentVal = this.customStartDate();
    if (type === 'end') currentVal = this.customEndDate();

    let initialDate = new Date();
    if (currentVal) {
      const parts = currentVal.split('-');
      if (parts.length === 3) {
        initialDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }

    const dialogRef = this.dialog.open(DateTimePickerDialogComponent, {
      width: '92vw',
      maxWidth: '380px',
      data: {
        title: type === 'single' ? 'तारीख चुनें' : (type === 'start' ? 'प्रारंभिक तारीख' : 'अंतिम तारीख'),
        initialDate: initialDate,
        initialTime: '00:00',
        includeTime: false
      },
      panelClass: 'custom-date-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((res: DateTimePickerResult | null) => {
      if (!res || !res.date) return;
      const d = res.date;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const formatted = `${y}-${m}-${day}`;

      if (type === 'single') {
        this.customSingleDate.set(formatted);
      } else if (type === 'start') {
        this.customStartDate.set(formatted);
      } else if (type === 'end') {
        this.customEndDate.set(formatted);
      }
    });
  }

  resetAllFilters(): void {
    this.selectedDateFilter.set('all');
    this.selectedSeasonFilter.set('all');
    this.selectedHarvesterFilter.set('all');
    this.customSingleDate.set('');
    this.customStartDate.set('');
    this.customEndDate.set('');
    this.closeFilterPanel();
  }
  
  totalScheduledAcres = computed(() => {
    const pending = this.remindersService.pendingReminders();
    const sum = pending.reduce((acc, r) => acc + (Number(r.landInAcres) || 0), 0);
    return Math.round(sum * 100) / 100;
  });

  openNewBookingForm(): void {
    this.isEditMode.set(false);
    this.editingReminderId.set(null);
    this.isExistingFarmerLocked.set(false);

    const defaultRate = this.getDefaultRate();
    const defaultHarvester = this.harvesterService.getDefaultHarvester();
    const now = new Date();

    this.landInAcresVal.set(1);
    this.ratePerAcreVal.set(defaultRate);

    this.bookingForm.reset({
      farmerName: '',
      contactNumber: '',
      scheduledDate: now,
      scheduledTime: '08:00',
      landInAcres: 1,
      ratePerAcre: defaultRate,
      harvester: defaultHarvester,
      notes: ''
    });

    this.updateBookingDateTimeDisplay();

    this.isFormOpen.set(true);
  }

  openEditForm(reminder: Reminder): void {
    this.isEditMode.set(true);
    this.editingReminderId.set(reminder.id);
    this.isExistingFarmerLocked.set(false);

    const dateObj = this.remindersService.parseDate(reminder.scheduledDate) || new Date();
    const time = reminder.scheduledTime || '08:00';
    const acres = Number(reminder.landInAcres) || 1;
    const rate = Number(reminder.ratePerAcre) || 2500;

    this.landInAcresVal.set(acres);
    this.ratePerAcreVal.set(rate);

    this.bookingForm.patchValue({
      farmerName: reminder.farmerName,
      contactNumber: reminder.contactNumber,
      scheduledDate: dateObj,
      scheduledTime: time,
      landInAcres: acres,
      ratePerAcre: rate,
      harvester: reminder.harvester || this.harvesterService.getDefaultHarvester(),
      notes: reminder.notes || ''
    });

    this.updateBookingDateTimeDisplay();

    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.isEditMode.set(false);
    this.editingReminderId.set(null);
  }

  openLandMeasurementDialog(): void {
    const dialogRef = this.dialog.open(LandMeasurementComponent, {
      width: '96vw',
      maxWidth: '780px',
      height: '88vh',
      panelClass: 'land-measure-dialog-modal',
      data: { isDialog: true, initialAcres: this.bookingForm.get('landInAcres')?.value }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.acres > 0) {
        this.bookingForm.patchValue({ landInAcres: result.acres });
        this.landInAcresVal.set(result.acres);
        this.toastService.success(`Applied land area: ${result.acres} Acres`);
      }
    });
  }

  onCustomDateSelected(date: Date | null): void {
    if (date && !isNaN(date.getTime())) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      this.customFilterDate.set(`${y}-${m}-${d}`);
      this.activeTab.set('custom');
    }
  }

  formatDateString(date: Date | string): string {
    if (typeof date === 'string') return date;
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  async saveBooking(): Promise<void> {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      this.toastService.error(this.translationService.get('form.fillAllFields') || 'Please fill required fields');
      return;
    }

    const val = this.bookingForm.value;
    const rawDate = val.scheduledDate;
    let formattedDate = '';
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      formattedDate = this.formatDateString(rawDate);
    } else if (typeof rawDate === 'string' && rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else {
        formattedDate = rawDate;
      }
    } else if (typeof rawDate === 'string') {
      formattedDate = rawDate;
    }

    // Validation: cannot be in past
    if (this.remindersService.isPast(formattedDate) && !this.remindersService.isToday(formattedDate)) {
      this.toastService.error(this.translationService.get('reminders.pastDateNotAllowed') || 'Past dates are not allowed for future bookings');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const acres = Number(val.landInAcres) || this.landInAcresVal() || 0;
      const rate = Number(val.ratePerAcre) || this.ratePerAcreVal() || 0;
      const total = Math.round(acres * rate);

      const reminderData = {
        farmerName: (val.farmerName || '').trim(),
        contactNumber: (val.contactNumber || '').trim(),
        scheduledDate: formattedDate,
        scheduledTime: val.scheduledTime || '08:00',
        landInAcres: acres,
        ratePerAcre: rate,
        estimatedTotal: total,
        harvester: val.harvester || this.harvesterService.getDefaultHarvester(),
        notes: (val.notes || '').trim(),
        status: 'pending' as const
      };

      if (this.isEditMode() && this.editingReminderId()) {
        await this.remindersService.updateReminder(this.editingReminderId()!, reminderData);
        this.toastService.success(this.translationService.get('reminders.bookingUpdated'));
      } else {
        await this.remindersService.addReminder(reminderData);
        this.toastService.success(this.translationService.get('reminders.bookingSaved'));
      }

      this.notificationService.evaluateTodayCuttings();
      this.closeForm();
    } catch (err: any) {
      console.error('Save booking error:', err);
      this.toastService.error(err.message || 'Failed to save booking');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  deleteBooking(reminder: Reminder): void {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const title = isHi ? 'रिमाइंडर हटाएं' : 'Delete Reminder';
    const msg = isHi 
      ? `क्या आप ${reminder.farmerName} का ${reminder.scheduledDate} का रिमाइंडर हटाना चाहते हैं?` 
      : `Delete cutting reminder for ${reminder.farmerName} on ${reminder.scheduledDate}?`;

    this.dialogService.confirm(msg, title, isHi ? 'हटाएं' : 'Delete', isHi ? 'रद्द करें' : 'Cancel', 'error').subscribe(async confirmed => {
      if (confirmed) {
        try {
          await this.remindersService.deleteReminder(reminder.id);
          this.toastService.success(this.translationService.get('reminders.bookingDeleted'));
          this.notificationService.evaluateTodayCuttings();
        } catch (e: any) {
          this.toastService.error(e.message || 'Failed to delete');
        }
      }
    });
  }

  // ====================================================
  // MOVE TO CUTTING RECORD WORKFLOW
  // ====================================================

  promptMoveToRecord(reminder: Reminder): void {
    this.pendingMoveReminder.set(reminder);
  }

  closeMovePrompt(): void {
    this.pendingMoveReminder.set(null);
  }

  /**
   * Option 1: Edit & Add Record (Navigates to /add-new with prefilled data)
   */
  moveToRecordWithEdit(reminder: Reminder): void {
    this.closeMovePrompt();
    
    // Convert reminder date to prefill parameter
    this.router.navigate(['/add-new'], {
      queryParams: {
        prefillName: reminder.farmerName,
        prefillPhone: reminder.contactNumber,
        acres: reminder.landInAcres,
        rate: reminder.ratePerAcre,
        date: reminder.scheduledDate,
        time: reminder.scheduledTime || '08:00',
        harvester: reminder.harvester || '',
        fromReminderId: reminder.id
      }
    });
  }

  /**
   * Option 2: Direct Move (Creates cutting record immediately)
   */
  async directMoveToRecord(reminder: Reminder): Promise<void> {
    this.closeMovePrompt();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';

    try {
      const acres = Number(reminder.landInAcres) || 0;
      const rate = Number(reminder.ratePerAcre) || 0;
      const total = reminder.estimatedTotal || Math.round(acres * rate);

      // Create record
      const recordData = {
        farmerName: reminder.farmerName,
        contactNumber: reminder.contactNumber,
        date: reminder.scheduledDate,
        cuttingTime: reminder.scheduledTime || '08:00',
        landInAcres: acres,
        ratePerAcre: rate,
        totalPayment: total,
        paidOnSight: 0,
        pendingAmount: total,
        harvester: reminder.harvester || this.harvesterService.getDefaultHarvester(),
        markedAsPaid: false
      };

      const recordRes = await this.recordsService.addRecord(recordData as any);
      const recordId = (recordRes as any)?.id || '';

      // Mark reminder as completed
      await this.remindersService.markAsCompleted(reminder.id, recordId);

      this.toastService.success(
        isHi 
          ? `सफलतापूर्वक "${reminder.farmerName}" का कटाई रिकॉर्ड बन गया!` 
          : `Successfully converted to cutting record for ${reminder.farmerName}!`
      );

      this.notificationService.evaluateTodayCuttings();
    } catch (err: any) {
      console.error('Direct move error:', err);
      this.toastService.error(err.message || 'Failed to convert to record');
    }
  }

  // Communication Actions
  callFarmer(phone: string): void {
    const clean = this.cleanPhone(phone);
    if (clean) {
      window.open(`tel:${clean}`, '_system');
    }
  }

  openWhatsApp(phone: string, reminder: Reminder): void {
    const clean = this.cleanPhone(phone);
    if (!clean) return;
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const text = isHi
      ? `नमस्ते ${reminder.farmerName} जी! आपकी खेत कटाई (${reminder.landInAcres} एकड़) दिनांक ${reminder.scheduledDate} को निर्धारित है। - हार्वेस्टर टीम`
      : `Hello ${reminder.farmerName}, your harvest cutting (${reminder.landInAcres} Acres) is scheduled for ${reminder.scheduledDate}. - Harvester Team`;

    window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(text)}`, '_blank');
  }

  getDateMonth(dateStr?: string): string {
    if (!dateStr) return 'DATE';
    try {
      let d: Date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        } else {
          d = new Date(dateStr);
        }
      } else {
        d = new Date(dateStr);
      }
      if (isNaN(d.getTime())) return 'DATE';
      return d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    } catch {
      return 'DATE';
    }
  }

  getDateDay(dateStr?: string): string {
    if (!dateStr) return '01';
    try {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        return parts[0] || '01';
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '01';
      return String(d.getDate()).padStart(2, '0');
    } catch {
      return '01';
    }
  }

  getInitial(name: string): string {
    return (name || 'F').charAt(0).toUpperCase();
  }

  isToday(dateStr: string): boolean {
    return this.remindersService.isToday(dateStr);
  }

  isTomorrow(dateStr: string): boolean {
    return this.remindersService.isTomorrow(dateStr);
  }

  formatCardDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = this.remindersService.parseDate(dateStr);
    if (!d || isNaN(d.getTime())) return dateStr || '';
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = String(d.getDate()).padStart(2, '0');
    return `${month} ${day}`;
  }

  formatCurrency(amount?: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
    return '₹' + Math.round(amount).toLocaleString('en-IN');
  }

  formatRate(rate?: number): string {
    if (rate === undefined || rate === null || isNaN(rate)) return '₹0/Ac';
    return '₹' + Math.round(rate).toLocaleString('en-IN') + '/Ac';
  }

  goToRecord(reminder: Reminder): void {
    if (reminder.movedToRecordId) {
      this.router.navigate(['/records'], { queryParams: { id: reminder.movedToRecordId } });
    } else {
      this.router.navigate(['/records'], { queryParams: { search: reminder.farmerName } });
    }
  }

  formatDisplayTime(timeStr?: string): string {
    if (!timeStr) return '';
    const trimmed = timeStr.trim();
    if (/am|pm/i.test(trimmed)) return trimmed;
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1].slice(0, 2);
      if (isNaN(h)) return trimmed;
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
    }
    return trimmed;
  }
}
