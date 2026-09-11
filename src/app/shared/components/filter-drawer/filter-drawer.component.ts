import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { TranslationService } from '../../services/translation.service';
import { SeasonService } from '../../../core/services/season.service';
import { HarvesterService } from '../../../core/services/harvester.service';
import { DateTimePickerDialogComponent, DateTimePickerResult } from '../date-time-picker-dialog/date-time-picker-dialog.component';
import { parseDate, formatDateDisplay, formatDateForInput } from '../../../core/utils/date.utils';

export type PaymentFilterOption = 'all' | 'completed' | 'pending';

export interface DateFilterCounts {
  all?: number;
  today?: number;
  yesterday?: number;
  tomorrow?: number;
  week?: number;
  month?: number;
  dueToday?: number;
}

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './filter-drawer.component.html'
})
export class FilterDrawerComponent {
  public translationService = inject(TranslationService);
  public seasonService = inject(SeasonService);
  public harvesterService = inject(HarvesterService);
  private dialog = inject(MatDialog);

  get isHi(): boolean {
    return this.translationService.getCurrentLanguage() === 'hi';
  }

  t(key: string, fallback: string): string {
    return this.translationService.get(key) || fallback;
  }

  // Drawer Panel Open State
  @Input() isOpen = false;
  @Input() drawerTitle = '';
  @Input() drawerId = 'app-filter-drawer';

  // 1. Date Filter Inputs
  @Input() showDateFilter = true;
  @Input() selectedDateFilter = 'all';
  @Input() dateBadgeCount: number | null = null;
  @Input() dateCounts?: DateFilterCounts;
  @Input() allowTomorrow = false;
  @Input() allowYesterday = true;
  @Input() dueTodayCount = 0;
  @Input() customMode: 'single' | 'range' = 'single';
  @Input() customSingleDate = '';
  @Input() customStartDate = '';
  @Input() customEndDate = '';

  // 2. Season Filter Inputs
  @Input() showSeasonFilter = true;
  @Input() selectedSeasonFilter = 'all';
  @Input() seasonBadgeCount: number | null = null;

  // 3. Harvester Filter Inputs
  @Input() showHarvesterFilter = true;
  @Input() harvesterLabel = '';
  @Input() selectedHarvesterFilter = 'all';
  @Input() harvesterBadgeCount: number | null = null;
  @Input() availableHarvesters: string[] = [];

  // 4. Payment Status Filter (ONLY for Records & Kisan Record page)
  @Input() showPaymentFilter = false;
  @Input() selectedPaymentFilter: PaymentFilterOption = 'all';
  @Input() paymentBadgeCount: number | null = null;

  // 5. Payment Date Filter (भुगतान तिथि - ONLY for Records & Kisan Record page)
  @Input() showPaymentDateFilter = false;
  @Input() selectedPaymentDateFilter = 'all';
  @Input() paymentDateBadgeCount: number | null = null;
  @Input() customPaymentDateMode: 'single' | 'range' = 'single';
  @Input() customPaymentSingleDate = '';
  @Input() customPaymentStartDate = '';
  @Input() customPaymentEndDate = '';

  // Outputs
  @Output() close = new EventEmitter<void>();
  @Output() apply = new EventEmitter<void>();
  @Output() resetFilters = new EventEmitter<void>();
  @Output() dateFilterChange = new EventEmitter<string>();
  @Output() seasonFilterChange = new EventEmitter<string>();
  @Output() harvesterFilterChange = new EventEmitter<string>();
  @Output() paymentFilterChange = new EventEmitter<PaymentFilterOption>();
  @Output() paymentDateFilterChange = new EventEmitter<string>();
  @Output() customModeChange = new EventEmitter<'single' | 'range'>();
  @Output() customSingleDateChange = new EventEmitter<string>();
  @Output() customStartDateChange = new EventEmitter<string>();
  @Output() customEndDateChange = new EventEmitter<string>();
  @Output() customPaymentDateModeChange = new EventEmitter<'single' | 'range'>();
  @Output() customPaymentSingleDateChange = new EventEmitter<string>();
  @Output() customPaymentStartDateChange = new EventEmitter<string>();
  @Output() customPaymentEndDateChange = new EventEmitter<string>();

  // Accordion open states inside drawer
  isDrawerDateOpen = signal<boolean>(false);
  isDrawerSeasonOpen = signal<boolean>(false);
  isDrawerHarvesterOpen = signal<boolean>(false);
  isDrawerPaymentOpen = signal<boolean>(false);
  isDrawerPaymentDateOpen = signal<boolean>(false);

  toggleDrawerDate(): void {
    this.isDrawerDateOpen.update(v => !v);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerPaymentOpen.set(false);
    this.isDrawerPaymentDateOpen.set(false);
  }

  toggleDrawerSeason(): void {
    this.isDrawerSeasonOpen.update(v => !v);
    this.isDrawerDateOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerPaymentOpen.set(false);
    this.isDrawerPaymentDateOpen.set(false);
  }

  toggleDrawerHarvester(): void {
    this.isDrawerHarvesterOpen.update(v => !v);
    this.isDrawerDateOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerPaymentOpen.set(false);
    this.isDrawerPaymentDateOpen.set(false);
  }

  toggleDrawerPayment(): void {
    this.isDrawerPaymentOpen.update(v => !v);
    this.isDrawerDateOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerPaymentDateOpen.set(false);
  }

  toggleDrawerPaymentDate(): void {
    this.isDrawerPaymentDateOpen.update(v => !v);
    this.isDrawerDateOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerPaymentOpen.set(false);
  }

  closeAllDropdowns(): void {
    this.isDrawerDateOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerPaymentOpen.set(false);
    this.isDrawerPaymentDateOpen.set(false);
  }

  onClose(): void {
    this.closeAllDropdowns();
    this.close.emit();
  }

  onApply(): void {
    this.closeAllDropdowns();
    this.apply.emit();
  }

  onReset(): void {
    this.closeAllDropdowns();
    this.resetFilters.emit();
  }

  selectDate(option: string): void {
    this.selectedDateFilter = option;
    this.isDrawerDateOpen.set(false);
    this.dateFilterChange.emit(option);
  }

  selectSeason(seasonId: string): void {
    this.selectedSeasonFilter = seasonId;
    this.isDrawerSeasonOpen.set(false);
    this.seasonFilterChange.emit(seasonId);
  }

  selectHarvester(harvester: string): void {
    this.selectedHarvesterFilter = harvester;
    this.isDrawerHarvesterOpen.set(false);
    this.harvesterFilterChange.emit(harvester);
  }

  selectPayment(payment: PaymentFilterOption): void {
    this.selectedPaymentFilter = payment;
    this.isDrawerPaymentOpen.set(false);
    this.paymentFilterChange.emit(payment);
  }

  selectPaymentDate(option: string): void {
    this.selectedPaymentDateFilter = option;
    this.isDrawerPaymentDateOpen.set(false);
    this.paymentDateFilterChange.emit(option);
  }

  setCustomMode(mode: 'single' | 'range'): void {
    this.customMode = mode;
    this.customModeChange.emit(mode);
  }

  setCustomPaymentDateMode(mode: 'single' | 'range'): void {
    this.customPaymentDateMode = mode;
    this.customPaymentDateModeChange.emit(mode);
  }

  // Label Helpers
  getSelectedDateFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    switch (this.selectedDateFilter) {
      case 'all':
        return this.translationService.get('records.filterAll') || (isHi ? 'सभी' : 'All');
      case 'today':
        return this.translationService.get('records.filterToday') || (isHi ? 'आज' : 'Today');
      case 'yesterday':
        return this.translationService.get('records.filterYesterday') || (isHi ? 'कल' : 'Yesterday');
      case 'tomorrow':
        return isHi ? 'कल' : 'Tomorrow';
      case 'week':
        return this.translationService.get('records.filterWeek') || (isHi ? 'इस सप्ताह' : 'This Week');
      case 'month':
        return this.translationService.get('records.filterMonth') || (isHi ? 'इस माह' : 'This Month');
      case 'dueToday':
        return this.translationService.get('records.filterDueToday') || (isHi ? 'आज देय' : 'Due Today');
      case 'custom': {
        if (this.customMode === 'single' && this.customSingleDate) {
          return this.formatDateDisplay(this.customSingleDate);
        }
        if (this.customMode === 'range' && (this.customStartDate || this.customEndDate)) {
          const s = this.formatDateDisplay(this.customStartDate);
          const e = this.formatDateDisplay(this.customEndDate);
          if (s && e) return `${s} - ${e}`;
          if (s) return `${s} - ...`;
          return `... - ${e}`;
        }
        return this.translationService.get('records.filterCustom') || (isHi ? 'कस्टम तारीख' : 'Custom Date');
      }
      default:
        return this.selectedDateFilter || (isHi ? 'तारीख' : 'Date');
    }
  }

  getSelectedSeasonFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    if (this.selectedSeasonFilter === 'all' || !this.selectedSeasonFilter) {
      return isHi ? 'सभी सीज़न' : 'All Seasons';
    }
    const season = this.seasonService.seasons().find(s => s.id === this.selectedSeasonFilter);
    if (season) {
      return `${season.name} ${season.year}`;
    }
    return this.selectedSeasonFilter;
  }

  getSelectedHarvesterFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    if (this.selectedHarvesterFilter === 'all' || !this.selectedHarvesterFilter) {
      return isHi ? 'सभी हार्वेस्टर' : 'All Harvesters';
    }
    return this.selectedHarvesterFilter;
  }

  getSelectedPaymentFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    switch (this.selectedPaymentFilter) {
      case 'completed':
        return isHi ? 'पूर्ण भुगतान' : 'Completed Payment';
      case 'pending':
        return isHi ? 'बकाया राशि वाला' : 'Pending Payment';
      case 'all':
      default:
        return isHi ? 'सभी' : 'All';
    }
  }

  getSelectedPaymentDateFilterLabel(): string {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    switch (this.selectedPaymentDateFilter) {
      case 'all':
        return isHi ? 'सभी भुगतान तिथियां' : 'All Payment Dates';
      case 'today':
        return isHi ? 'आज देय' : 'Due Today';
      case 'tomorrow':
        return isHi ? 'कल देय' : 'Due Tomorrow';
      case 'overdue':
        return isHi ? 'बीती तारीख / बकाया देय' : 'Past Due / Overdue';
      case 'week':
        return isHi ? 'इस सप्ताह' : 'This Week';
      case 'month':
        return isHi ? 'इस माह' : 'This Month';
      case 'noDate':
        return isHi ? 'बिना भुगतान तिथि' : 'No Payment Date Set';
      case 'custom': {
        if (this.customPaymentDateMode === 'single') {
          return this.customPaymentSingleDate ? this.formatDateDisplay(this.customPaymentSingleDate) : (isHi ? 'कस्टम तारीख' : 'Custom Date');
        } else {
          const s = this.formatDateDisplay(this.customPaymentStartDate);
          const e = this.formatDateDisplay(this.customPaymentEndDate);
          if (s && e) return `${s} - ${e}`;
          if (s) return `${s} - ...`;
          return `... - ${e}`;
        }
      }
      default:
        return isHi ? 'भुगतान तिथि' : 'Payment Date';
    }
  }

  getHarvestersList(): string[] {
    if (this.availableHarvesters && this.availableHarvesters.length > 0) {
      return this.availableHarvesters;
    }
    return this.harvesterService.harvesters();
  }

  // Custom Payment Date Picker Handler
  openCustomPaymentDateDialog(type: 'single' | 'start' | 'end'): void {
    const currentVal = type === 'single' ? this.customPaymentSingleDate : type === 'start' ? this.customPaymentStartDate : this.customPaymentEndDate;
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
        title: this.translationService.get('form.paymentDate') || (this.translationService.getCurrentLanguage() === 'hi' ? 'भुगतान तिथि' : 'Payment Date')
      }
    });

    dialogRef.afterClosed().subscribe((result: DateTimePickerResult | null) => {
      if (result && result.date) {
        const formatted = this.formatDateForInput(result.date);
        if (type === 'single') {
          this.customPaymentSingleDate = formatted;
          this.customPaymentSingleDateChange.emit(formatted);
        } else if (type === 'start') {
          this.customPaymentStartDate = formatted;
          this.customPaymentStartDateChange.emit(formatted);
        } else if (type === 'end') {
          this.customPaymentEndDate = formatted;
          this.customPaymentEndDateChange.emit(formatted);
        }
      }
    });
  }

  // Custom Date Picker Handler
  openCustomDateDialog(type: 'single' | 'start' | 'end'): void {
    const currentVal = type === 'single' ? this.customSingleDate : type === 'start' ? this.customStartDate : this.customEndDate;
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
          this.customSingleDate = formatted;
          this.customSingleDateChange.emit(formatted);
        } else if (type === 'start') {
          this.customStartDate = formatted;
          this.customStartDateChange.emit(formatted);
        } else if (type === 'end') {
          this.customEndDate = formatted;
          this.customEndDateChange.emit(formatted);
        }
      }
    });
  }

  formatDateDisplay(dateStr: string): string {
    return formatDateDisplay(dateStr);
  }

  private parseDate(dateStr: string): Date | null {
    return parseDate(dateStr);
  }

  private formatDateForInput(date: Date): string {
    return formatDateForInput(date);
  }
}
