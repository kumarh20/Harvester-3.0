import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
export type ChartMetricMode = 'revenue' | 'acres';

export interface ChartDataPoint {
  id: string;
  dateStr: string;
  label: string;
  fullDate: string;
  acres: number;
  revenue: number;
  collected: number;
  pending: number;
  jobsCount: number;
  barHeightPercent: number;
}

export interface HarvesterStat {
  name: string;
  count: number;
  acres: number;
  revenue: number;
  percentOfTotal: number;
}

export interface RecoveryOverview {
  totalBilled: number;
  totalCollected: number;
  totalPending: number;
  recoveryPercentage: number;
  circumference: number;
  strokeDashoffset: number;
}

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
  chartMetric = signal<ChartMetricMode>('revenue');
  activeBar = signal<ChartDataPoint | null>(null);

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

  recentRecords = computed(() => {
    return [...this.filteredRecords()].reverse().slice(0, 5);
  });

  // ----------------------------------------------------
  // Interactive Timeline Chart Computation
  // ----------------------------------------------------
  chartTimeline = computed<ChartDataPoint[]>(() => {
    const records = this.filteredRecords();
    if (!records || records.length === 0) return [];

    const dateMap = new Map<string, { date: Date; acres: number; revenue: number; collected: number; pending: number; count: number }>();

    for (const r of records) {
      const parsed = this.parseDate(r.date);
      const key = parsed
        ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
        : (r.date || 'Unknown');

      const dateObj = parsed || new Date();
      const existing = dateMap.get(key) || { date: dateObj, acres: 0, revenue: 0, collected: 0, pending: 0, count: 0 };
      
      const acres = Number(r.landInAcres) || 0;
      const total = Number(r.totalPayment) || 0;
      const pending = r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0);
      const collected = total - pending;

      existing.acres += acres;
      existing.revenue += total;
      existing.collected += collected;
      existing.pending += pending;
      existing.count += 1;

      dateMap.set(key, existing);
    }

    // Sort by chronological date
    const sortedEntries = Array.from(dateMap.entries()).sort((a, b) => a[1].date.getTime() - b[1].date.getTime());
    
    // Pick the most relevant slice (last 7 to 10 entries for sleek mobile display)
    const displayEntries = sortedEntries.length > 8 ? sortedEntries.slice(-8) : sortedEntries;

    const metric = this.chartMetric();
    const maxValue = Math.max(
      ...displayEntries.map(e => metric === 'revenue' ? e[1].revenue : e[1].acres),
      metric === 'revenue' ? 1000 : 1
    );

    const isHindi = this.languageService.getCurrentLanguage() === 'hi';

    return displayEntries.map(([key, data]) => {
      const val = metric === 'revenue' ? data.revenue : data.acres;
      const pct = Math.max(8, Math.round((val / maxValue) * 100));

      const dayMonth = data.date.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short'
      });

      return {
        id: key,
        dateStr: key,
        label: dayMonth,
        fullDate: data.date.toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        acres: Math.round(data.acres * 100) / 100,
        revenue: Math.round(data.revenue),
        collected: Math.round(data.collected),
        pending: Math.round(data.pending),
        jobsCount: data.count,
        barHeightPercent: pct
      };
    });
  });

  // ----------------------------------------------------
  // Financial Recovery Ring & Metrics Computation
  // ----------------------------------------------------
  recoveryOverview = computed<RecoveryOverview>(() => {
    const s = this.stats();
    const totalBilled = s.totalPayment;
    const totalPending = s.totalPending;
    const totalCollected = Math.max(0, totalBilled - totalPending);

    const recoveryPercentage = totalBilled > 0
      ? Math.min(100, Math.round((totalCollected / totalBilled) * 100))
      : 100;

    const radius = 54;
    const circumference = 2 * Math.PI * radius; // ~339.29
    const strokeDashoffset = circumference - (circumference * recoveryPercentage) / 100;

    return {
      totalBilled,
      totalCollected,
      totalPending,
      recoveryPercentage,
      circumference,
      strokeDashoffset
    };
  });

  // ----------------------------------------------------
  // Harvester Fleet Utilization
  // ----------------------------------------------------
  harvesterStats = computed<HarvesterStat[]>(() => {
    const records = this.filteredRecords();
    if (!records || records.length === 0) return [];

    const map = new Map<string, { count: number; acres: number; revenue: number }>();
    let totalAcresAll = 0;

    const defaultMachineName = this.translationService.get('settings.defaultMachine') || 'Harvester 1';

    for (const r of records) {
      const name = (r.harvester && r.harvester.trim()) ? r.harvester.trim() : defaultMachineName;
      const existing = map.get(name) || { count: 0, acres: 0, revenue: 0 };
      const acres = Number(r.landInAcres) || 0;
      const rev = Number(r.totalPayment) || 0;

      existing.count += 1;
      existing.acres += acres;
      existing.revenue += rev;
      totalAcresAll += acres;

      map.set(name, existing);
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        acres: Math.round(data.acres * 10) / 10,
        revenue: Math.round(data.revenue),
        percentOfTotal: totalAcresAll > 0 ? Math.round((data.acres / totalAcresAll) * 100) : 0
      }))
      .sort((a, b) => b.acres - a.acres);
  });

  constructor(
    public recordsService: RecordsService,
    public translationService: TranslationService,
    private languageService: LanguageService,
    private router: Router
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

  goToAddNew(): void {
    this.router.navigate(['/add-new']);
  }

  goToRecords(): void {
    this.router.navigate(['/records']);
  }

  async refreshData(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.recordsService.loadRecords();
      this.updatePeriodCounts();
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

  goToLandMeasure(): void {
    this.router.navigate(['/measure']);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  setChartMetric(metric: ChartMetricMode): void {
    this.chartMetric.set(metric);
    this.activeBar.set(null);
  }

  selectBar(bar: ChartDataPoint | null): void {
    this.activeBar.set(bar);
  }

  toggleBar(bar: ChartDataPoint): void {
    if (this.activeBar()?.id === bar.id) {
      this.activeBar.set(null);
    } else {
      this.activeBar.set(bar);
    }
  }
}
