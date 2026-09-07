import { Component, Inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslationService } from '../../services/translation.service';

export interface DateTimePickerData {
  initialDate?: Date | string | null;
  initialTime?: string | null; // e.g. "14:30" or "02:30 PM"
  minDate?: Date | null;
  maxDate?: Date | null;
  mode?: 'datetime' | 'date' | 'time';
  title?: string;
}

export interface DateTimePickerResult {
  date: Date;
  time: string; // 24h format "HH:mm"
  displayTime: string; // 12h format "hh:mm AM/PM"
  formattedDisplay: string; // "DD/MM/YYYY, hh:mm AM/PM"
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'app-date-time-picker-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kendo-dtp-modal" [attr.data-mode]="mode()">
      <!-- Top Segmented Tabs (Date | Time) -->
      @if (mode() === 'datetime') {
        <div class="dtp-tab-bar">
          <button 
            type="button" 
            class="dtp-tab-btn" 
            [class.active]="activeTab() === 'date'"
            (click)="setActiveTab('date')">
            {{ isHindi() ? 'दिनांक (Date)' : 'Date' }}
          </button>
          <button 
            type="button" 
            class="dtp-tab-btn" 
            [class.active]="activeTab() === 'time'"
            (click)="setActiveTab('time')">
            {{ isHindi() ? 'समय (Time)' : 'Time' }}
          </button>
        </div>
      }

      <!-- TAB 1: DATE PICKER VIEW -->
      @if (activeTab() === 'date') {
        <div class="dtp-date-view">
          <!-- Month Header & Navigation -->
          <div class="dtp-month-nav-row">
            <div class="month-title-group">
              <button type="button" class="nav-arrow-btn" (click)="prevMonth()" title="Previous Month">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <span class="month-name-label">{{ currentMonthYearLabel() }}</span>
              <button type="button" class="nav-arrow-btn" (click)="nextMonth()" title="Next Month">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>

            <button type="button" class="quick-action-link-btn" (click)="selectToday()">
              {{ isHindi() ? 'आज' : 'Today' }}
            </button>
          </div>

          <!-- Day of Week Labels -->
          <div class="dtp-weekdays-row">
            @for (wd of weekDays(); track wd) {
              <span class="weekday-cell">{{ wd }}</span>
            }
          </div>

          <!-- Calendar Days Grid -->
          <div class="dtp-days-grid">
            @for (day of calendarDays(); track day.date.toISOString()) {
              <button 
                type="button" 
                class="day-grid-cell"
                [class.other-month]="!day.isCurrentMonth"
                [class.is-today]="day.isToday"
                [class.is-selected]="day.isSelected"
                [disabled]="day.isDisabled"
                (click)="onSelectDay(day.date)">
                <span>{{ day.dayNumber }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- TAB 2: TIME PICKER VIEW -->
      @if (activeTab() === 'time') {
        <div class="dtp-time-view">
          <!-- Time Header Row -->
          <div class="dtp-time-header-row">
            <div class="time-readout-badge">
              <span class="time-main-digits">{{ selectedHour() }}:{{ selectedMinute() }}</span>
              <span class="time-period-tag">{{ selectedPeriod() }}</span>
            </div>

            <button type="button" class="quick-action-link-btn" (click)="setNow()">
              {{ isHindi() ? 'अभी' : 'NOW' }}
            </button>
          </div>

          <!-- Time Column Selectors -->
          <div class="dtp-time-columns-container">
            <!-- Hour Column -->
            <div class="time-col-wrapper">
              <div class="time-col-header">{{ isHindi() ? 'घंटा (Hour)' : 'Hour' }}</div>
              <div class="time-scroll-track">
                @for (h of hoursList; track h) {
                  <button 
                    type="button" 
                    class="time-val-item"
                    [class.selected]="selectedHour() === h"
                    (click)="setHour(h)">
                    {{ h }}
                  </button>
                }
              </div>
            </div>

            <!-- Colon Separator -->
            <div class="time-col-divider">:</div>

            <!-- Minute Column -->
            <div class="time-col-wrapper">
              <div class="time-col-header">{{ isHindi() ? 'मिनट (Minute)' : 'Minute' }}</div>
              <div class="time-scroll-track">
                @for (m of minutesList; track m) {
                  <button 
                    type="button" 
                    class="time-val-item"
                    [class.selected]="selectedMinute() === m"
                    (click)="setMinute(m)">
                    {{ m }}
                  </button>
                }
              </div>
            </div>

            <!-- AM / PM Column -->
            <div class="time-col-wrapper period-col">
              <div class="time-col-header">{{ isHindi() ? 'प्रहर' : 'Period' }}</div>
              <div class="period-toggle-stack">
                <button 
                  type="button" 
                  class="period-pill-btn"
                  [class.selected]="selectedPeriod() === 'AM'"
                  (click)="setPeriod('AM')">
                  AM
                </button>
                <button 
                  type="button" 
                  class="period-pill-btn"
                  [class.selected]="selectedPeriod() === 'PM'"
                  (click)="setPeriod('PM')">
                  PM
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Bottom Action Footer (Set & Cancel) -->
      <div class="dtp-actions-row">
        <button 
          type="button" 
          class="dtp-action-btn btn-cancel" 
          (click)="onCancel()">
          {{ isHindi() ? 'रद्द करें' : 'Cancel' }}
        </button>
        <button 
          type="button" 
          class="dtp-action-btn btn-set" 
          (click)="onSet()">
          {{ isHindi() ? 'लागू करें' : 'Set' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./date-time-picker-dialog.component.scss']
})
export class DateTimePickerDialogComponent implements OnInit {
  mode = signal<'datetime' | 'date' | 'time'>('datetime');
  activeTab = signal<'date' | 'time'>('date');

  // Selected date state
  selectedDate = signal<Date>(new Date());
  viewMonthDate = signal<Date>(new Date());

  // Selected time state
  selectedHour = signal<string>('08');
  selectedMinute = signal<string>('00');
  selectedPeriod = signal<'AM' | 'PM'>('AM');

  readonly hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  readonly minutesList = [
    '00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'
  ];

  constructor(
    public dialogRef: MatDialogRef<DateTimePickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DateTimePickerData,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    if (this.data?.mode) {
      this.mode.set(this.data.mode);
      if (this.data.mode === 'time') {
        this.activeTab.set('time');
      } else {
        this.activeTab.set('date');
      }
    }

    // Initialize Date
    let baseDate: Date = new Date();
    if (this.data?.initialDate) {
      if (this.data.initialDate instanceof Date && !isNaN(this.data.initialDate.getTime())) {
        baseDate = new Date(this.data.initialDate);
      } else if (typeof this.data.initialDate === 'string') {
        const parsed = new Date(this.data.initialDate);
        if (!isNaN(parsed.getTime())) {
          baseDate = parsed;
        }
      }
    }
    this.selectedDate.set(baseDate);
    this.viewMonthDate.set(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));

    // Initialize Time
    if (this.data?.initialTime) {
      this.parseTime(this.data.initialTime);
    } else {
      // If initialDate has time
      const h = baseDate.getHours();
      const m = baseDate.getMinutes();
      this.setTimeFrom24h(h, m);
    }
  }

  isHindi(): boolean {
    return this.translationService.getCurrentLanguage() === 'hi';
  }

  setActiveTab(tab: 'date' | 'time'): void {
    this.activeTab.set(tab);
  }

  weekDays = computed(() => {
    if (this.isHindi()) {
      return ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
    }
    return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  });

  currentMonthYearLabel = computed(() => {
    const d = this.viewMonthDate();
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthsHi = [
      'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
      'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
    ];
    const month = this.isHindi() ? monthsHi[d.getMonth()] : monthsEn[d.getMonth()];
    return `${month} ${d.getFullYear()}`;
  });

  calendarDays = computed(() => {
    const viewDate = this.viewMonthDate();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const selected = this.selectedDate();
    const today = new Date();
    const minD = this.data?.minDate ? new Date(this.data.minDate) : null;
    const maxD = this.data?.maxDate ? new Date(this.data.maxDate) : null;

    if (minD) minD.setHours(0, 0, 0, 0);
    if (maxD) maxD.setHours(23, 59, 59, 999);

    const days: CalendarDay[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: this.isSameDay(d, today),
        isSelected: this.isSameDay(d, selected),
        isDisabled: this.isDateDisabled(d, minD, maxD)
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: this.isSameDay(d, today),
        isSelected: this.isSameDay(d, selected),
        isDisabled: this.isDateDisabled(d, minD, maxD)
      });
    }

    // Next month padding to fill complete grid (multiples of 7 up to 42)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: this.isSameDay(d, today),
        isSelected: this.isSameDay(d, selected),
        isDisabled: this.isDateDisabled(d, minD, maxD)
      });
    }

    return days;
  });

  private isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  private isDateDisabled(d: Date, minD: Date | null, maxD: Date | null): boolean {
    const check = new Date(d);
    check.setHours(12, 0, 0, 0);
    if (minD && check < minD) return true;
    if (maxD && check > maxD) return true;
    return false;
  }

  prevMonth(): void {
    const curr = this.viewMonthDate();
    this.viewMonthDate.set(new Date(curr.getFullYear(), curr.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const curr = this.viewMonthDate();
    this.viewMonthDate.set(new Date(curr.getFullYear(), curr.getMonth() + 1, 1));
  }

  selectToday(): void {
    const now = new Date();
    this.selectedDate.set(now);
    this.viewMonthDate.set(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  onSelectDay(date: Date): void {
    const current = this.selectedDate();
    const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), current.getHours(), current.getMinutes());
    this.selectedDate.set(newDate);
    // If user clicked day from other month, sync view
    if (date.getMonth() !== this.viewMonthDate().getMonth()) {
      this.viewMonthDate.set(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  // Time manipulation
  setHour(h: string): void {
    this.selectedHour.set(h);
  }

  setMinute(m: string): void {
    this.selectedMinute.set(m);
  }

  setPeriod(p: 'AM' | 'PM'): void {
    this.selectedPeriod.set(p);
  }

  setNow(): void {
    const now = new Date();
    this.setTimeFrom24h(now.getHours(), now.getMinutes());
  }

  private setTimeFrom24h(hours: number, minutes: number): void {
    const period = hours >= 12 ? 'PM' : 'AM';
    let h12 = hours % 12;
    h12 = h12 ? h12 : 12;
    this.selectedHour.set(String(h12).padStart(2, '0'));
    
    // Snap to nearest 5-min or keep exact padded
    const minPadded = String(minutes).padStart(2, '0');
    this.selectedMinute.set(this.minutesList.includes(minPadded) ? minPadded : String(Math.round(minutes / 5) * 5 % 60).padStart(2, '0'));
    this.selectedPeriod.set(period);
  }

  private parseTime(timeStr: string): void {
    if (!timeStr) return;
    const clean = timeStr.trim();
    if (clean.includes('AM') || clean.includes('PM')) {
      const parts = clean.split(' ');
      const timeParts = parts[0].split(':');
      this.selectedHour.set(timeParts[0].padStart(2, '0'));
      this.selectedMinute.set((timeParts[1] || '00').padStart(2, '0'));
      this.selectedPeriod.set(parts[1].toUpperCase() === 'PM' ? 'PM' : 'AM');
    } else {
      const parts = clean.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      this.setTimeFrom24h(h, m);
    }
  }

  private get24hTimeString(): string {
    let h = parseInt(this.selectedHour(), 10) || 0;
    const m = this.selectedMinute();
    const isPM = this.selectedPeriod() === 'PM';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  private get12hTimeString(): string {
    return `${this.selectedHour()}:${this.selectedMinute()} ${this.selectedPeriod()}`;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSet(): void {
    const date = new Date(this.selectedDate());
    const time24 = this.get24hTimeString();
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;

    date.setHours(h, m, 0, 0);

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    const displayTime = this.get12hTimeString();
    const formattedDisplay = this.mode() === 'time' 
      ? displayTime 
      : this.mode() === 'date' 
        ? `${dd}/${mm}/${yyyy}` 
        : `${dd}/${mm}/${yyyy}, ${displayTime}`;

    const result: DateTimePickerResult = {
      date,
      time: time24,
      displayTime,
      formattedDisplay
    };

    this.dialogRef.close(result);
  }
}
