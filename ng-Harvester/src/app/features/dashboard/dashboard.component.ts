import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { RecordsService, Record } from '../../core/services/records.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { DashboardSkeletonComponent } from '../../shared/components/skeleton/dashboard-skeleton/dashboard-skeleton.component';

type PeriodType = 'today' | 'week' | 'month' | 'all';

interface Stats {
  totalRecords: number;
  totalLand: number;
  totalPayment: number;
  totalPending: number;
  avgLandPerRecord: number;
  avgPaymentPerRecord: number;
  averageRate: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    DashboardSkeletonComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit {

  selectedPeriod = signal<PeriodType>('all');
  todayCount = signal(0);
  weekCount = signal(0);
  monthCount = signal(0);
  allCount = signal(0);
  isLoading = signal(true);

  filteredRecords = computed(() => {
    const period = this.selectedPeriod();
    const records = this.recordsService.records();
    return this.getFilteredRecordsByPeriod(period, records);
  });

  stats = computed(() => {
    return this.calculateStats(this.filteredRecords());
  });

  constructor(
    public recordsService: RecordsService,
    public translationService: TranslationService,
    private languageService: LanguageService
  ) {
    this.updatePeriodCounts();
  }

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);

    try {
      await this.recordsService.loadRecords();
      this.updatePeriodCounts();
    } catch (error) {
      // ignore
    } finally {
      setTimeout(() => this.isLoading.set(false), 300);
    }
  }

  selectPeriod(period: PeriodType): void {
    this.selectedPeriod.set(period);
  }

  /**
   * Parse record date string to Date (start of day local time).
   * Supports: YYYY-MM-DD (ISO, from Firestore), DD-MM-YYYY, DD/MM/YYYY.
   */
  private parseDate(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') return null;
    const s = dateString.trim();

    // YYYY-MM-DD (ISO) – e.g. "2025-02-12"
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // DD-MM-YYYY
    const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const day = parseInt(dashMatch[1], 10);
      const month = parseInt(dashMatch[2], 10) - 1;
      const year = parseInt(dashMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YYYY
    const slashParts = s.split('/');
    if (slashParts.length === 3) {
      const day = parseInt(slashParts[0], 10);
      const month = parseInt(slashParts[1], 10) - 1;
      const year = parseInt(slashParts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // Fallback: native parse (e.g. ISO with time)
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Start of today (local) for comparison */
  private getTodayStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /** Start of N days ago (local) for inclusive range */
  private getDaysAgoStart(days: number): Date {
    const today = this.getTodayStart();
    return new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private getFilteredRecordsByPeriod(period: PeriodType, records: Record[]): Record[] {
    if (period === 'all') return records;

    const todayStart = this.getTodayStart();
    const weekStart = this.getDaysAgoStart(7);   // 7 days ago 00:00
    const monthStart = this.getDaysAgoStart(30); // 30 days ago 00:00

    return records.filter(record => {
      const recordDate = this.parseDate(record.date);
      if (!recordDate) return false;
      const recordDayStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());

      switch (period) {
        case 'today':
          return recordDayStart.getTime() === todayStart.getTime();
        case 'week':
          return recordDayStart.getTime() >= weekStart.getTime() && recordDayStart.getTime() <= todayStart.getTime();
        case 'month':
          return recordDayStart.getTime() >= monthStart.getTime() && recordDayStart.getTime() <= todayStart.getTime();
        default:
          return true;
      }
    });
  }

  private updatePeriodCounts(): void {
    const todayStart = this.getTodayStart();
    const weekStart = this.getDaysAgoStart(7);
    const monthStart = this.getDaysAgoStart(30);

    const records = this.recordsService.records();

    const todayRecords = records.filter(record => {
      const recordDate = this.parseDate(record.date);
      if (!recordDate) return false;
      const recordDayStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      return recordDayStart.getTime() === todayStart.getTime();
    }).length;

    const weekRecords = records.filter(record => {
      const recordDate = this.parseDate(record.date);
      if (!recordDate) return false;
      const recordDayStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      return recordDayStart.getTime() >= weekStart.getTime() && recordDayStart.getTime() <= todayStart.getTime();
    }).length;

    const monthRecords = records.filter(record => {
      const recordDate = this.parseDate(record.date);
      if (!recordDate) return false;
      const recordDayStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      return recordDayStart.getTime() >= monthStart.getTime() && recordDayStart.getTime() <= todayStart.getTime();
    }).length;

    this.todayCount.set(todayRecords);
    this.weekCount.set(weekRecords);
    this.monthCount.set(monthRecords);
    this.allCount.set(records.length);
  }

  private calculateStats(filteredRecords: Record[]): Stats {
    const totalRecords = filteredRecords.length;

    const totalLand = filteredRecords.reduce((sum, record) => {
      return sum + (record.landInAcres || 0);
    }, 0);

    const totalPayment = filteredRecords.reduce((sum, record) => {
      return sum + (record.totalPayment || 0);
    }, 0);

    const totalPending = filteredRecords.reduce((sum, record) => {
      return sum + (record.pendingAmount || 0);
    }, 0);

    const avgLandPerRecord = totalRecords > 0 ? totalLand / totalRecords : 0;
    const avgPaymentPerRecord = totalRecords > 0 ? totalPayment / totalRecords : 0;
    const averageRate = totalRecords > 0
      ? filteredRecords.reduce((sum, record) => sum + (record.ratePerAcre || 0), 0) / totalRecords
      : 0;

    return {
      totalRecords,
      totalLand,
      totalPayment,
      totalPending,
      avgLandPerRecord,
      avgPaymentPerRecord,
      averageRate
    };
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

  formatNumber(num: number, decimals: number = 2): string {
    return num.toFixed(decimals);
  }
}
