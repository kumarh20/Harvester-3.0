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
      
      setTimeout(() => {
        this.isLoading.set(false);
      }, 800);
    } catch (error) {
      this.isLoading.set(false);
    }

    const intervalId = setInterval(() => {
      this.updatePeriodCounts();
    }, 1000);
  }

  selectPeriod(period: PeriodType): void {
    this.selectedPeriod.set(period);
  }

  private parseDate(dateString: string): Date | null {
    const parts = typeof dateString === 'string' ? dateString?.split('-') : [];
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  }

  private getFilteredRecordsByPeriod(period: PeriodType, records: Record[]): Record[] {
    if (period === 'all') return records;

    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return records.filter(record => {
      const recordDate = this.parseDate(record.date);
      if (!recordDate) return false;

      switch (period) {
        case 'today':
          return recordDate.toDateString() === today;
        case 'week':
          return recordDate >= weekAgo;
        case 'month':
          return recordDate >= monthAgo;
        default:
          return true;
      }
    });
  }

  private updatePeriodCounts(): void {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const records = this.recordsService.records();

    const todayRecords = records
      .filter(record => {
        const recordDate = this.parseDate(record.date);
        return recordDate && recordDate.toDateString() === today;
      })
      .length;

    const weekRecords = records
      .filter(record => {
        const recordDate = this.parseDate(record.date);
        return recordDate && recordDate >= weekAgo;
      })
      .length;

    const monthRecords = records
      .filter(record => {
        const recordDate = this.parseDate(record.date);
        return recordDate && recordDate >= monthAgo;
      })
      .length;

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
    const locale = this.languageService.isHindi() ? 'hi-IN' : 'en-IN';
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
