import { Component, OnInit, OnDestroy, signal, computed, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { RecordsService } from '../../core/services/records.service';
import { RemindersService, Reminder } from '../../core/services/reminders.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { SeasonService } from '../../core/services/season.service';
import { ToastService } from '../../shared/services/toast.service';
import { DialogService } from '../../shared/services/dialog.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { UiPreferencesService, DefaultRecordFilterSetting } from '../../core/services/ui-preferences.service';
import { RecordSkeletonComponent } from '../../shared/components/skeleton/record-skeleton/record-skeleton.component';
import { DateTimePickerDialogComponent, DateTimePickerResult } from '../../shared/components/date-time-picker-dialog/date-time-picker-dialog.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { UserService } from '../../services/user/user-service';
import { AppNavigationService } from '../../core/services/app-navigation.service';

export type RecordDateFilterOption = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all' | 'dueToday';

interface Record {
  id: string;
  farmerName: string;
  contactNumber: string;
  date: string;
  cuttingTime?: string;
  landInAcres: number;
  ratePerAcre: number;
  totalPayment: number;
  paidOnSight: number;
  pendingAmount: number;
  fullPaymentDate?: string;
  harvester?: string;
  markedAsPaid?: boolean;
  seasonId?: string;
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
    MatMenuModule,
    RouterModule,
    RecordSkeletonComponent
  ],
  templateUrl: './records.component.html',
  styleUrl: './records.component.scss'
})
export class RecordsComponent implements OnInit, OnDestroy {
  searchQuery = signal('');
  expandedId = signal<string | null>(null);
  isLoading = signal(true);

  // Kisan Records Page State
  selectedFarmer = signal<{ name: string; phone: string } | null>(null);
  expandedCuttingId = signal<string | null>(null);
  expandedReminderId = signal<string | null>(null);
  selectedHarvesterFilter = signal<string>('all');

  // Date Filtering State
  selectedDateFilter = signal<RecordDateFilterOption>('today');
  customMode = signal<'single' | 'range'>('single');
  customSingleDate = signal<string>(this.formatDateForInput(new Date()));
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');

  // Season Filtering State (default 'all')
  selectedSeasonFilter = signal<string>('all');
  private userManuallySelectedSeason = false;

  // Filter Dropdown Open State
  isDateFilterOpen = signal<boolean>(false);
  isSeasonFilterOpen = signal<boolean>(false);

  // Move reminder to record prompt state
  pendingMoveReminder = signal<Reminder | null>(null);

  // Online Bill & PDF Modal State
  selectedBillRecord = signal<Record | null>(null);
  isGeneratingPdf = signal<boolean>(false);

  constructor(
    public recordsService: RecordsService,
    public remindersService: RemindersService,
    public harvesterService: HarvesterService,
    public seasonService: SeasonService,
    private toastService: ToastService,
    private dialogService: DialogService,
    public router: Router,
    private route: ActivatedRoute,
    public translationService: TranslationService,
    private languageService: LanguageService,
    private uiPreferencesService: UiPreferencesService,
    private dialog: MatDialog,
    public userService: UserService,
    public appNavigationService: AppNavigationService
  ) {
    effect(() => {
      const isFarmerDetailOpen = !!this.selectedFarmer();
      this.recordsService.isKisanDetailPageOpen.set(isFarmerDetailOpen);
    });

    // Default season synchronization from Settings
    effect(() => {
      const defSeason = this.seasonService.defaultSeason();
      if (!this.userManuallySelectedSeason && defSeason && defSeason.id) {
        this.selectedSeasonFilter.set(defSeason.id);
      }
    });
  }

  openCustomDateDialog(type: 'single' | 'start' | 'end'): void {
    const currentVal = type === 'single' ? this.customSingleDate() : type === 'start' ? this.customStartDate() : this.customEndDate();
    let initialDateVal = new Date();
    if (currentVal) {
      const parsed = this.parseDate(currentVal);
      if (parsed) initialDateVal = parsed;
    }

    const dialogRef = this.dialog.open(DateTimePickerDialogComponent, {
      panelClass: 'kendo-dtp-dialog-panel',
      data: {
        initialDate: initialDateVal,
        mode: 'date',
        title: this.translationService.get('records.filterByDate') || 'तारीख अनुसार फ़िल्टर'
      }
    });

    dialogRef.afterClosed().subscribe((result: DateTimePickerResult | null) => {
      if (result && result.date) {
        const formatted = this.formatDateForInput(result.date);
        if (type === 'single') {
          this.customSingleDate.set(formatted);
        } else if (type === 'start') {
          this.customStartDate.set(formatted);
        } else if (type === 'end') {
          this.customEndDate.set(formatted);
        }
      }
    });
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const parsed = this.parseDate(dateStr);
    if (!parsed) return dateStr;
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  ngOnDestroy(): void {
    this.recordsService.isKisanDetailPageOpen.set(false);
  }

  async ngOnInit(): Promise<void> {
    // Initialize default filter from user preference setting (defaults to 'today')
    const preferredDefault = this.uiPreferencesService.defaultRecordFilter();
    this.selectedDateFilter.set(preferredDefault);

    this.isLoading.set(true);

    try {
      await Promise.all([
        this.harvesterService.loadHarvesters(),
        this.seasonService.loadSeasons(),
        this.recordsService.loadRecords(),
        this.remindersService.loadReminders()
      ]);
      
      // Check query params for notification deep links and farmer detail view
      this.route.queryParams.subscribe(params => {
        if (params['filter'] === 'dueToday' || params['filter'] === 'promisedDateToday' || params['filter'] === 'settlementDue') {
          this.selectedDateFilter.set('dueToday');
        }
        if (params['farmer']) {
          const fParam = params['farmer'];
          const all = this.recordsService.getAllRecords();
          const cleanFParam = this.cleanPhone(fParam);
          const match = all.find(r => 
            (cleanFParam && this.cleanPhone(r.contactNumber) === cleanFParam) ||
            r.farmerName.trim().toLowerCase() === fParam.trim().toLowerCase()
          );
          if (match) {
            this.selectedFarmer.set({
              name: match.farmerName,
              phone: match.contactNumber || ''
            });
          } else {
            this.selectedFarmer.set({
              name: fParam,
              phone: cleanFParam || ''
            });
          }
          if (params['recordId']) {
            const targetId = params['recordId'];
            setTimeout(() => {
              const el = document.getElementById('kisan-cutting-' + targetId);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
          }
        } else {
          this.selectedFarmer.set(null);
        }
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  normalizeDateToKey(dateVal: any): string | null {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (!trimmed) return null;
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) {
        const parts = trimmed.split(/[\/\-]/);
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
      const dateObj = new Date(trimmed);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, '0');
      const day = String(dateVal.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  isSettlementDueToday(record: Record): boolean {
    if (record.markedAsPaid || (Number(record.pendingAmount) || 0) <= 0 || !record.fullPaymentDate) {
      return false;
    }
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return this.normalizeDateToKey(record.fullPaymentDate) === todayKey;
  }

  setDateFilter(filter: RecordDateFilterOption): void {
    this.selectedDateFilter.set(filter);
  }

  setSeasonFilter(seasonId: string): void {
    this.userManuallySelectedSeason = true;
    this.selectedSeasonFilter.set(seasonId);
  }

  toggleDateDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isDateFilterOpen.update(v => !v);
    this.isSeasonFilterOpen.set(false);
  }

  toggleSeasonDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isSeasonFilterOpen.update(v => !v);
    this.isDateFilterOpen.set(false);
  }

  closeAllFilterDropdowns(): void {
    this.isDateFilterOpen.set(false);
    this.isSeasonFilterOpen.set(false);
  }

  selectDateOption(filter: RecordDateFilterOption): void {
    this.setDateFilter(filter);
    this.isDateFilterOpen.set(false);
  }

  selectSeasonOption(seasonId: string): void {
    this.setSeasonFilter(seasonId);
    this.isSeasonFilterOpen.set(false);
  }

  getSelectedDateFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    switch (this.selectedDateFilter()) {
      case 'today':
        return isHi ? 'आज' : 'Today';
      case 'yesterday':
        return isHi ? 'कल' : 'Yesterday';
      case 'week':
        return isHi ? 'इस सप्ताह' : 'This Week';
      case 'month':
        return isHi ? 'इस माह' : 'This Month';
      case 'custom':
        return isHi ? 'कस्टम' : 'Custom';
      case 'dueToday':
        return isHi ? `आज देय (${this.dueTodaySettlementCount()})` : `Due Today (${this.dueTodaySettlementCount()})`;
      case 'all':
      default:
        return isHi ? 'सभी तारीख' : 'All Dates';
    }
  }

  getSelectedSeasonFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const filter = this.selectedSeasonFilter();
    if (filter === 'all' || !filter) {
      return isHi ? 'सभी सीज़न' : 'All Seasons';
    }
    const season = this.seasonService.getSeasonById(filter);
    if (!season) {
      return isHi ? 'सभी सीज़न' : 'All Seasons';
    }
    return `${season.name} ${season.year}`;
  }

  clearSeasonFilter(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedSeasonFilter.set('all');
  }

  getActiveSeasonDisplay(): { name: string; subtitle: string; isDefault: boolean } {
    const filter = this.selectedSeasonFilter();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    if (filter === 'all') {
      return {
        name: isHi ? 'सभी सीज़न' : 'All Seasons',
        subtitle: isHi ? 'सभी रिकॉर्ड्स' : 'All records',
        isDefault: false
      };
    }
    const season = this.seasonService.getSeasonById(filter);
    if (!season) {
      return {
        name: isHi ? 'सभी सीज़न' : 'All Seasons',
        subtitle: isHi ? 'सभी रिकॉर्ड्स' : 'All records',
        isDefault: false
      };
    }
    return {
      name: `${season.name} ${season.year}`,
      subtitle: this.getSeasonMonthsLabel(season),
      isDefault: Boolean(season.isDefault)
    };
  }

  getSeasonMonthsLabel(season: any): string {
    if (!season) return '';
    const monthNamesHi = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const months = isHi ? monthNamesHi : monthNamesEn;
    const sMonth = months[(Number(season.startMonth) || 1) - 1] || '';
    const eMonth = months[(Number(season.endMonth) || 12) - 1] || '';
    return sMonth === eMonth ? sMonth : `${sMonth} - ${eMonth}`;
  }

  getSeasonRecordCount(seasonId?: string): number {
    const all = this.recordsService.records();
    if (!seasonId || seasonId === 'all') {
      return all.length;
    }
    return all.filter(r => {
      const s = this.seasonService.getSeasonForRecord(r);
      return s?.id === seasonId || r.seasonId === seasonId;
    }).length;
  }

  navigateToManageSeasons(): void {
    this.router.navigate(['/settings'], { queryParams: { open: 'seasons' } });
  }

  onSeasonSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.selectedSeasonFilter.set(target.value);
    }
  }

  /**
   * Get resolved season display name for any record card
   */
  getRecordSeasonName(record: Record): string {
    const season = this.seasonService.getSeasonForRecord(record);
    return season ? this.seasonService.getSeasonBadgeLabel(season) : '';
  }

  /**
   * Get cutting rate per acre for record card (with fallback if 0)
   */
  getRecordRate(record: Record | any): number {
    if (!record) return 2500;
    const rate = Number(record.ratePerAcre);
    if (!isNaN(rate) && rate > 0) {
      return Math.round(rate);
    }
    const land = Number(record.landInAcres);
    const total = Number(record.totalPayment);
    if (!isNaN(land) && land > 0 && !isNaN(total) && total > 0) {
      return Math.round(total / land);
    }
    return 2500;
  }

  getSeasonLabel(seasonId?: string): string {
    if (!seasonId) return '';
    const season = this.seasonService.getSeasonById(seasonId);
    return season ? this.seasonService.getSeasonBadgeLabel(season) : '';
  }

  setCustomMode(mode: 'single' | 'range'): void {
    this.customMode.set(mode);
  }

  shiftCustomSingleDate(days: number): void {
    const current = this.parseDate(this.customSingleDate()) || new Date();
    const shifted = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);
    this.customSingleDate.set(this.formatDateForInput(shifted));
  }

  setCustomSingleDateToday(): void {
    this.customSingleDate.set(this.formatDateForInput(new Date()));
  }

  navigateToAddRecord(): void {
    this.router.navigate(['/add-new']);
  }

  // Count of records for today (for chip badge)
  todayRecordsCount = computed(() => {
    const allRecords = this.recordsService.records();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return allRecords.filter(r => {
      const p = this.parseDate(r.date);
      return p && new Date(p.getFullYear(), p.getMonth(), p.getDate()).getTime() === todayStart;
    }).length;
  });

  // Count of promised settlement records due today
  dueTodaySettlementCount = computed(() => {
    const allRecords = this.recordsService.records();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return allRecords.filter(r => {
      if (r.markedAsPaid || (Number(r.pendingAmount) || 0) <= 0 || !r.fullPaymentDate) return false;
      return this.normalizeDateToKey(r.fullPaymentDate) === todayKey;
    }).length;
  });

  // Total count of all records ever
  totalAllRecordsCount = computed(() => this.recordsService.records().length);

  // Computed records filtered by date selection
  recordsByDate = computed(() => {
    const filter = this.selectedDateFilter();
    const allRecords = this.recordsService.records();

    if (filter === 'all') {
      return allRecords;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterdayStart = todayStart - oneDayMs;
    const weekStart = todayStart - (7 * oneDayMs);
    const monthStart = todayStart - (30 * oneDayMs);
    const todayEnd = todayStart + oneDayMs - 1;
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (filter === 'dueToday') {
      return allRecords.filter(r => {
        if (r.markedAsPaid || (Number(r.pendingAmount) || 0) <= 0 || !r.fullPaymentDate) return false;
        return this.normalizeDateToKey(r.fullPaymentDate) === todayKey;
      });
    }

    return allRecords.filter(record => {
      const parsed = this.parseDate(record.date);
      if (!parsed) return false;
      const recordDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();

      switch (filter) {
        case 'today':
          return recordDay === todayStart;
        case 'yesterday':
          return recordDay === yesterdayStart;
        case 'week':
          return recordDay >= weekStart && recordDay <= todayEnd;
        case 'month':
          return recordDay >= monthStart && recordDay <= todayEnd;
        case 'custom': {
          const mode = this.customMode();
          if (mode === 'single') {
            const single = this.customSingleDate();
            if (!single) return true;
            const target = this.parseDate(single);
            if (!target) return true;
            const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
            return recordDay === targetDay;
          } else {
            const startStr = this.customStartDate();
            const endStr = this.customEndDate();
            if (!startStr && !endStr) return true;
            const startParsed = startStr ? this.parseDate(startStr) : null;
            const endParsed = endStr ? this.parseDate(endStr) : null;

            const startDay = startParsed ? new Date(startParsed.getFullYear(), startParsed.getMonth(), startParsed.getDate()).getTime() : -Infinity;
            const endDay = endParsed ? new Date(endParsed.getFullYear(), endParsed.getMonth(), endParsed.getDate()).getTime() + oneDayMs - 1 : Infinity;

            return recordDay >= startDay && recordDay <= endDay;
          }
        }
        default:
          return true;
      }
    });
  });

  // Computed filtered records based on date, season, and search query
  filteredRecords = computed(() => {
    const records = this.recordsByDate();
    const seasonFilter = this.selectedSeasonFilter();

    let result = records;
    if (seasonFilter !== 'all') {
      result = result.filter(record => {
        const s = this.seasonService.getSeasonForRecord(record);
        return s?.id === seasonFilter || record.seasonId === seasonFilter;
      });
    }

    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return result;
    }

    return result.filter(record =>
      record.farmerName.toLowerCase().includes(query) ||
      record.contactNumber.includes(query) ||
      record.date.includes(query) ||
      (record.harvester && record.harvester.toLowerCase().includes(query)) ||
      (this.getRecordSeasonName(record).toLowerCase().includes(query))
    );
  });

  // Summary of filtered dataset (count, acres, total volume, pending)
  filterSummary = computed(() => {
    const recs = this.filteredRecords();
    const acres = recs.reduce((sum, r) => sum + (Number(r.landInAcres) || 0), 0);
    const total = recs.reduce((sum, r) => sum + (Number(r.totalPayment) || 0), 0);
    const pending = recs.reduce((sum, r) => sum + (r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0)), 0);
    return {
      count: recs.length,
      acres: Math.round(acres * 100) / 100,
      total: Math.round(total),
      pending: Math.round(pending)
    };
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

  openBillModal(record: Record): void {
    this.selectedBillRecord.set(record);
  }

  closeBillModal(): void {
    this.selectedBillRecord.set(null);
  }

  shareRecord(record: Record){
    this.openBillModal(record);
  }

  getAmountInWords(amount: number): string {
    if (!amount || isNaN(amount) || amount <= 0) {
      return this.translationService.getCurrentLanguage() === 'hi' 
        ? 'शून्य रुपये मात्र' 
        : 'Zero Rupees Only';
    }

    const num = Math.round(amount);
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWordsEn = (n: number): string => {
      if (n === 0) return '';
      let str = '';
      if (Math.floor(n / 10000000) > 0) {
        str += inWordsEn(Math.floor(n / 10000000)) + 'Crore ';
        n %= 10000000;
      }
      if (Math.floor(n / 100000) > 0) {
        str += inWordsEn(Math.floor(n / 100000)) + 'Lakh ';
        n %= 100000;
      }
      if (Math.floor(n / 1000) > 0) {
        str += inWordsEn(Math.floor(n / 1000)) + 'Thousand ';
        n %= 1000;
      }
      if (Math.floor(n / 100) > 0) {
        str += inWordsEn(Math.floor(n / 100)) + 'Hundred ';
        n %= 100;
      }
      if (n > 0) {
        if (n < 20) {
          str += a[n];
        } else {
          str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
        }
      }
      return str;
    };

    const words = inWordsEn(num).trim();
    return `${words} Rupees Only`;
  }

  getBillCompanyLine(bill: Record): string {
    const parts: string[] = [];
    const busName = this.userService.userProfile()?.businessName?.trim() || 'Harvester Cutting Services';
    parts.push(`[${busName}]`);

    const harvester = bill.harvester?.trim() || 'Harvester Fleet';
    parts.push(`[${harvester}]`);

    const phone = this.userService.userProfile()?.phone?.trim() || bill.contactNumber;
    if (phone) {
      parts.push(`[+91 ${phone}]`);
    }

    const season = this.getRecordSeasonName(bill);
    if (season) {
      parts.push(`[Season: ${season}]`);
    }

    return parts.join(' | ');
  }

  async generateAndShareBillPdf(record: Record, mode: 'share' | 'download' = 'share'): Promise<void> {
    const billElement = document.getElementById('online-bill-preview');
    if (!billElement) {
      this.toastService.error(this.translationService.getCurrentLanguage() === 'hi' ? 'बिल लोड नहीं हो सका' : 'Could not load bill');
      return;
    }

    try {
      this.isGeneratingPdf.set(true);

      // html2canvas capture with cloned document modifications to guarantee zero clipping
      const canvas = await html2canvas(billElement, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 750,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('online-bill-preview');
          if (clonedElement) {
            clonedElement.style.width = '620px';
            clonedElement.style.maxWidth = '620px';
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.margin = '0 auto';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.border = 'none';
          }
          const clonedContainer = clonedDoc.querySelector('.bill-scrollable-container') as HTMLElement;
          if (clonedContainer) {
            clonedContainer.style.overflow = 'visible';
            clonedContainer.style.height = 'auto';
            clonedContainer.style.maxHeight = 'none';
            clonedContainer.style.padding = '0';
          }
          const clonedDialog = clonedDoc.querySelector('.online-bill-dialog') as HTMLElement;
          if (clonedDialog) {
            clonedDialog.style.overflow = 'visible';
            clonedDialog.style.height = 'auto';
            clonedDialog.style.maxHeight = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 10; // 10mm margin
      const contentWidth = pageWidth - (margin * 2); // 190mm
      const contentHeight = pageHeight - (margin * 2); // 277mm

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= contentHeight) {
        // Fits comfortably on a single A4 page
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        // Scale down proportionally to fit complete bill on single page without any cutoff
        const scaleFactor = contentHeight / imgHeight;
        const fittedWidth = imgWidth * scaleFactor;
        const xOffset = margin + (contentWidth - fittedWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, margin, fittedWidth, contentHeight);
      }

      const cleanFarmer = (record.farmerName || 'Kisan').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
      const fileName = `Bill_${cleanFarmer}_${record.date || 'date'}.pdf`;

      if (mode === 'share' && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `किसान कटाई बिल - ${record.farmerName}`,
            text: `किसान ${record.farmerName} का फसल कटाई ऑनलाइन बिल (कुल राशि: ₹${record.totalPayment}, बकाया: ₹${record.pendingAmount})`
          });
          this.toastService.success(this.translationService.getCurrentLanguage() === 'hi' ? 'बिल PDF सफलतापूर्वक साझा किया गया' : 'Bill PDF shared successfully');
          return;
        }
      }

      // Download fallback
      pdf.save(fileName);
      this.toastService.success(this.translationService.getCurrentLanguage() === 'hi' ? 'बिल PDF डाउनलोड हो गया है' : 'Bill PDF downloaded');
    } catch (err) {
      console.error('Error generating PDF:', err);
      this.toastService.error(this.translationService.getCurrentLanguage() === 'hi' ? 'PDF बनाने में समस्या आई' : 'Error generating PDF');
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }

  shareBillWhatsApp(record: Record): void {
    const harvesterName = record.harvester?.trim() || 'Harvester 1';
    const formattedDate = this.formatDisplayDate(record.date);
    const timeText = record.cuttingTime ? ` (${this.formatDisplayTime(record.cuttingTime)})` : '';
    const statusText = (record.markedAsPaid || record.pendingAmount <= 0)
      ? '✅ *भुगतान स्थिति:* पूर्ण चुकता (PAID)'
      : `⚠️ *भुगतान स्थिति:* कुल बकाया ₹${record.pendingAmount}`;

    const text = `🌾 *डिजिटल कटाई रसीद एवं बिल* 🌾\n` +
      `--------------------------------\n` +
      `👤 *किसान का नाम:* ${record.farmerName}\n` +
      `📞 *मोबाइल:* ${record.contactNumber || '-'}\n` +
      `🚜 *मशीन:* ${harvesterName}\n` +
      `📅 *दिनांक:* ${formattedDate}${timeText}\n` +
      `🌾 *रकबा:* ${record.landInAcres} एकड़\n` +
      `💰 *दर:* ₹${record.ratePerAcre}/एकड़\n` +
      `--------------------------------\n` +
      `💵 *कुल बिल राशि:* ₹${record.totalPayment}\n` +
      `🟢 *नकद प्राप्त:* ₹${record.paidOnSight || 0}\n` +
      `🔴 *शेष बकाया:* ₹${record.pendingAmount}\n` +
      (record.fullPaymentDate ? `⏳ *भुगतान वादा तारीख:* ${this.formatDisplayDate(record.fullPaymentDate)}\n` : '') +
      `--------------------------------\n` +
      `${statusText}\n\n` +
      `हार्वेस्टर कटिंग लेजर • अधिकृत डिजिटल बिल`;

    let cleanPhone = (record.contactNumber || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const encoded = encodeURIComponent(text);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  }

  printBill(): void {
    const billElement = document.getElementById('online-bill-preview');
    if (!billElement) {
      window.print();
      return;
    }

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => el.outerHTML)
          .join('\n');

        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Bill - ${this.selectedBillRecord()?.farmerName || 'Print'}</title>
              ${styles}
              <style>
                @page { size: A4; margin: 10mm; }
                body {
                  margin: 0;
                  padding: 10px;
                  background: #ffffff !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .online-bill-sheet {
                  box-shadow: none !important;
                  border: none !important;
                  width: 100% !important;
                  max-width: 650px !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  overflow: visible !important;
                  height: auto !important;
                }
              </style>
            </head>
            <body>
              ${billElement.outerHTML}
            </body>
          </html>
        `);
        iframeDoc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }, 350);
        return;
      }
    } catch {
      window.print();
    }
  }

  buildShareText(data: Record): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const harvesterName = data.harvester?.trim() || 'Harvester 1';
    const formattedDate = this.formatDisplayDate(data.date);
    const timeText = data.cuttingTime ? ` (${this.formatDisplayTime(data.cuttingTime)})` : '';
    const paymentDateText = data.fullPaymentDate ? this.formatDisplayDate(data.fullPaymentDate) : '-';
    const seasonName = this.getRecordSeasonName(data);

    if (isHi) {
      return `🌾 *किसान कटाई पर्ची* 🌾\n` +
        `किसान का नाम   : ${data.farmerName}\n` +
        `मोबाइल नंबर   : ${data.contactNumber || '-'}\n` +
        (seasonName ? `सीज़न          : ${seasonName}\n` : '') +
        `हार्वेस्टर      : ${harvesterName}\n` +
        `कटाई दिनांक    : ${formattedDate}${timeText}\n` +
        `रकबा (एकड़)    : ${data.landInAcres} एकड़\n` +
        `कटाई दर        : ₹${data.ratePerAcre}/एकड़\n` +
        `कुल राशि       : ₹${data.totalPayment}\n` +
        `नकद भुगतान     : ₹${data.paidOnSight || 0}\n` +
        `भुगतान तिथि    : ${paymentDateText}\n` +
        `----------------------------------------\n` +
        `बाकी रकम       : ₹${data.pendingAmount}\n` +
        `हार्वेस्टर कटिंग लेजर`;
    }
    return `🌾 *Farmer Cutting Receipt* 🌾\n` +
      `Farmer Name    : ${data.farmerName}\n` +
      `Contact Number : ${data.contactNumber || '-'}\n` +
      (seasonName ? `Season         : ${seasonName}\n` : '') +
      `Harvester      : ${harvesterName}\n` +
      `Cutting Date   : ${formattedDate}${timeText}\n` +
      `Land In Acres  : ${data.landInAcres} Acres\n` +
      `Rate Per Acre  : ₹${data.ratePerAcre}\n` +
      `Total Payment  : ₹${data.totalPayment}\n` +
      `Paid On Sight  : ₹${data.paidOnSight || 0}\n` +
      `Payment Date   : ${paymentDateText}\n` +
      `----------------------------------------\n` +
      `Pending Due    : ₹${data.pendingAmount}\n` +
      `Harvester Cutting Tracker`;
  }

  formatDisplayDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    const d = this.parseDate(dateStr);
    if (!d || isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDisplayTime(timeStr?: string | null): string {
    if (!timeStr) return '';
    const trimmed = timeStr.trim();
    if (!trimmed) return '';
    if (/am|pm/i.test(trimmed)) return trimmed;
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1].slice(0, 2);
      if (isNaN(h)) return trimmed;
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      const formattedH = String(h).padStart(2, '0');
      return `${formattedH}:${m} ${ampm}`;
    }
    return trimmed;
  }

  callNumber(contactNumber: string): void {
    window.open(`tel:${contactNumber}`, '_system');
  }

  openWhatsApp(contactNumber: string): void {
    const clean = this.cleanPhone(contactNumber);
    if (clean) {
      window.open(`https://wa.me/91${clean}`, '_blank');
    }
  }

  /**
   * Parse date string (supports YYYY-MM-DD, DD-MM-YYYY, and slash formats)
   */
  parseDate(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') return null;
    
    const clean = dateString.trim().replace(/\//g, '-');
    const parts = clean.split('-');
    if (parts.length !== 3) {
      const fallback = new Date(dateString);
      return isNaN(fallback.getTime()) ? null : fallback;
    }

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
   * Get date label matching Figma design (e.g., "4 सित°", "3 सित°", "2 सित°" or "4 Sep")
   */
  getFigmaDateLabel(dateString: string): string {
    const recordDate = this.parseDate(dateString);
    if (!recordDate) return dateString;

    const day = recordDate.getDate();
    const month = recordDate.getMonth(); // 0 - 11
    const isHi = this.translationService.getCurrentLanguage() === 'hi';

    if (isHi) {
      const hindiMonths = [
        'जन°', 'फ़र°', 'मार्च', 'अप्रैल', 'मई', 'जून',
        'जुला°', 'अग°', 'सित°', 'अक्तू°', 'नव°', 'दिस°'
      ];
      return `${day} ${hindiMonths[month] || ''}`;
    } else {
      const engMonths = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return `${day} ${engMonths[month] || ''}`;
    }
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

  // --- Farmer Multiple Cuttings Detail & Management Methods ---

  cleanPhone(phone: string | undefined): string {
    return (phone || '').toString().replace(/\D/g, '').slice(-10);
  }

  /**
   * Count total cuttings for a given farmer (by phone match, fallback to exact name)
   */
  getFarmerCuttingCount(record: Record): number {
    const phone = this.cleanPhone(record.contactNumber);
    const all = this.recordsService.records();
    if (phone) {
      return all.filter(r => this.cleanPhone(r.contactNumber) === phone).length;
    }
    return all.filter(r => r.farmerName.trim().toLowerCase() === record.farmerName.trim().toLowerCase()).length;
  }

  /**
   * Computed list of all cuttings for the currently selected farmer
   */
  selectedFarmerRecords = computed(() => {
    const farmer = this.selectedFarmer();
    if (!farmer) return [];
    const all = this.recordsService.records();
    const farmerPhone = this.cleanPhone(farmer.phone);
    const seasonFilter = this.selectedSeasonFilter();

    const matches = all.filter(r => {
      const phoneMatch = farmerPhone && r.contactNumber ? 
        this.cleanPhone(r.contactNumber) === farmerPhone : 
        r.farmerName.trim().toLowerCase() === farmer.name.trim().toLowerCase();
      if (!phoneMatch) return false;
      if (seasonFilter !== 'all' && r.seasonId && r.seasonId !== seasonFilter) {
        return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      const dateA = this.parseDate(a.date)?.getTime() || 0;
      const dateB = this.parseDate(b.date)?.getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;
      return (b.cuttingTime || '').localeCompare(a.cuttingTime || '');
    });
  });

  /**
   * Computed list of pending reminders/bookings for the currently selected farmer
   */
  selectedFarmerReminders = computed(() => {
    const farmer = this.selectedFarmer();
    if (!farmer) return [];
    const allReminders = this.remindersService.reminders();
    const farmerPhone = this.cleanPhone(farmer.phone);

    return allReminders.filter(r => {
      if (r.status !== 'pending') return false;
      if (farmerPhone && r.contactNumber) {
        return this.cleanPhone(r.contactNumber) === farmerPhone;
      }
      return r.farmerName.trim().toLowerCase() === farmer.name.trim().toLowerCase();
    });
  });

  /**
   * Distinct list of harvesters that have worked for this farmer
   */
  farmerHarvestersList = computed(() => {
    const records = this.selectedFarmerRecords();
    const set = new Set<string>();
    records.forEach(r => {
      const h = r.harvester?.trim();
      if (h) set.add(h);
    });
    return Array.from(set);
  });

  /**
   * Cuttings filtered by harvester selector tab on farmer detail view
   */
  farmerFilteredCuttings = computed(() => {
    const records = this.selectedFarmerRecords();
    const filter = this.selectedHarvesterFilter();
    if (filter === 'all') return records;
    return records.filter(r => (r.harvester || 'Harvester 1').trim().toLowerCase() === filter.trim().toLowerCase());
  });

  /**
   * Aggregate financial & land summary for the selected farmer
   */
  selectedFarmerSummary = computed(() => {
    const records = this.selectedFarmerRecords();
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let totalAcres = 0;

    for (const r of records) {
      const total = Number(r.totalPayment) || 0;
      const paid = Number(r.paidOnSight) || 0;
      const pending = Number(r.pendingAmount) || 0;
      const acres = Number(r.landInAcres) || 0;

      totalAmount += total;
      totalAcres += acres;

      if (r.markedAsPaid) {
        paidAmount += total;
      } else {
        paidAmount += paid;
        pendingAmount += pending;
      }
    }

    return {
      count: records.length,
      totalAcres: Math.round(totalAcres * 100) / 100,
      totalAmount: Math.round(totalAmount),
      paidAmount: Math.round(paidAmount),
      pendingAmount: Math.round(pendingAmount)
    };
  });

  /**
   * Open the detailed Kisan Records view for a clicked record
   */
  openKisanRecords(record: Record): void {
    this.selectedFarmer.set({
      name: record.farmerName,
      phone: record.contactNumber || ''
    });
    this.selectedHarvesterFilter.set('all');
    this.expandedCuttingId.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { 
        farmer: record.contactNumber || record.farmerName,
        recordId: record.id
      },
      queryParamsHandling: 'merge'
    });
    setTimeout(() => {
      const el = document.getElementById('kisan-cutting-' + record.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  }

  /**
   * Universal back button handler: closes farmer detail or navigates back in route history
   */
  goBack(): void {
    if (this.selectedFarmer()) {
      this.closeKisanRecords();
    } else {
      this.appNavigationService.back('/dashboard');
    }
  }

  /**
   * Close the Kisan Records view and return to main Records feed
   */
  closeKisanRecords(): void {
    this.selectedFarmer.set(null);
    this.expandedCuttingId.set(null);
    this.expandedReminderId.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { farmer: null, recordId: null },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Set harvester filter tab inside farmer detail page
   */
  setHarvesterFilter(harvester: string): void {
    this.selectedHarvesterFilter.set(harvester);
  }

  /**
   * Toggle cutting item expansion inside farmer detail page
   */
  toggleCuttingExpand(id: string): void {
    this.expandedCuttingId.set(this.expandedCuttingId() === id ? null : id);
  }

  /**
   * Toggle reminder item expansion inside farmer detail page
   */
  toggleReminderExpand(id: string): void {
    this.expandedReminderId.set(this.expandedReminderId() === id ? null : id);
  }

  /**
   * Add a new cutting record for this farmer
   * Pre-fills farmerName and contactNumber and locks them in add-new form
   */
  addRecordForSelectedFarmer(): void {
    const farmer = this.selectedFarmer();
    if (farmer) {
      this.recordsService.prefillFarmerData.set({
        name: farmer.name,
        phone: farmer.phone
      });
      this.router.navigate(['/add-new'], {
        queryParams: {
          prefillPhone: farmer.phone,
          prefillName: farmer.name
        }
      });
    }
  }

  /**
   * Add a new future reminder / booking for this farmer
   */
  addReminderForSelectedFarmer(): void {
    const farmer = this.selectedFarmer();
    if (farmer) {
      this.router.navigate(['/reminders'], {
        queryParams: {
          prefillPhone: farmer.phone,
          prefillName: farmer.name,
          new: 'true'
        }
      });
    }
  }

  /**
   * Move reminder to record prompt
   */
  promptMoveReminderToRecord(reminder: Reminder): void {
    this.pendingMoveReminder.set(reminder);
  }

  closeMovePrompt(): void {
    this.pendingMoveReminder.set(null);
  }

  moveToRecordWithEdit(reminder: Reminder): void {
    this.closeMovePrompt();
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

  async directMoveToRecord(reminder: Reminder): Promise<void> {
    this.closeMovePrompt();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';

    try {
      const acres = Number(reminder.landInAcres) || 0;
      const rate = Number(reminder.ratePerAcre) || 0;
      const total = reminder.estimatedTotal || Math.round(acres * rate);

      const resolvedSeason = this.seasonService.getSeasonForDate(reminder.scheduledDate);
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
        markedAsPaid: false,
        ...(resolvedSeason?.id ? { seasonId: resolvedSeason.id } : {})
      };

      const res = await this.recordsService.addRecord(recordData as any);
      const recordId = (res as any)?.id || '';

      await this.remindersService.markAsCompleted(reminder.id, recordId);
      this.toastService.success(
        isHi 
          ? `सफलतापूर्वक "${reminder.farmerName}" का कटाई रिकॉर्ड बन गया!` 
          : `Successfully converted to cutting record!`
      );
    } catch (err: any) {
      console.error('Error converting reminder to record:', err);
      this.toastService.error(err.message || 'Failed to convert');
    }
  }

  /**
   * Add a new cutting record from individual card action
   */
  addCuttingForRecord(record: Record): void {
    this.recordsService.prefillFarmerData.set({
      name: record.farmerName,
      phone: record.contactNumber || ''
    });
    this.router.navigate(['/add-new'], {
      queryParams: {
        prefillPhone: record.contactNumber,
        prefillName: record.farmerName
      }
    });
  }

  /**
   * Share full ledger/statement for the selected farmer
   */
  shareFarmerStatement(): void {
    const farmer = this.selectedFarmer();
    const records = this.selectedFarmerRecords();
    const summary = this.selectedFarmerSummary();
    if (!farmer || records.length === 0) return;

    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    let text = `🌾 *${isHi ? 'किसान कटाई खाता विवरण' : 'Farmer Cutting Statement'}* 🌾\n` +
      `किसान का नाम : ${farmer.name}\n` +
      `मोबाइल नंबर  : ${farmer.phone || '-'}\n` +
      `कुल कटाई    : ${summary.count} बार (${summary.totalAcres} एकड़)\n` +
      `कुल रकम     : ₹${summary.totalAmount}\n` +
      `जमा रकम     : ₹${summary.paidAmount}\n` +
      `बाकी रकम    : ₹${summary.pendingAmount}\n` +
      `----------------------------------------\n`;

    records.forEach((r, idx) => {
      const timeStr = r.cuttingTime ? ` (${this.formatDisplayTime(r.cuttingTime)})` : '';
      const seasonName = this.getRecordSeasonName(r);
      const seasonPart = seasonName ? ` | ${seasonName}` : '';
      text += `${idx + 1}. ${this.formatDisplayDate(r.date)}${timeStr}${seasonPart} | ${r.landInAcres} एकड़ | दर: ₹${r.ratePerAcre} | कुल: ₹${r.totalPayment} | बाकी: ₹${r.pendingAmount} (${r.harvester || 'Harvester 1'})\n`;
    });
    text += `----------------------------------------\nहार्वेस्टर कटिंग लेजर`;

    if (navigator.share) {
      navigator.share({
        title: isHi ? 'किसान कटाई खाता' : 'Farmer Cutting Statement',
        text: text
      }).catch(() => {
        navigator.clipboard?.writeText(text);
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toastService.success(isHi ? 'खाता विवरण क्लिपबोर्ड पर कॉपी हो गया' : 'Statement copied to clipboard');
      });
    }
  }

  getDateMonth(dateStr: string): string {
    const d = this.parseDate(dateStr);
    if (!d) return this.translationService.getCurrentLanguage() === 'hi' ? 'तारीख' : 'DATE';
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const hindiMonths = ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सितं', 'अक्टू', 'नव', 'दिसं'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];
    return isHi ? hindiMonths[d.getMonth()] : months[d.getMonth()];
  }

  getDateDay(dateStr: string): string {
    const d = this.parseDate(dateStr);
    if (!d) return '-';
    return d.getDate().toString();
  }

  getDateYear(dateStr: string): string {
    const d = this.parseDate(dateStr);
    if (!d) return '';
    return d.getFullYear().toString();
  }

  getFormattedFullDate(dateStr: string): string {
    return this.formatDisplayDate(dateStr);
  }
}
