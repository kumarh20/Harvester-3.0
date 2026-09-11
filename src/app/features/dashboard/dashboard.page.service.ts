import { Injectable, inject, signal, computed } from '@angular/core';
import { DashboardApiService } from './dashboard.api.service';
import { RecordsService } from '../../core/services/records.service';
import { SeasonService } from '../../core/services/season.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslationService } from '../../shared/services/translation.service';
import { Record } from '../../core/models/record.model';
import { 
  DashboardDateFilter, 
  ChartMetricMode, 
  ChartViewMode, 
  ChartDataPoint, 
  RecoveryOverview, 
  DashboardStats 
} from './dashboard.interface';
import { 
  calculateDashboardStats, 
  calculateRecoveryOverview, 
  buildDailyTimelineChart 
} from './dashboard.helper';
import { parseDate, normalizeDateToKey } from '../../core/utils/date.utils';

/**
 * Dashboard Page Service
 * Encapsulates presentation state, filter logic, computed metrics & chart preparation.
 * Ensures component contains 0 business/raw query logic.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardPageService {
  private dashboardApi = inject(DashboardApiService);
  private recordsService = inject(RecordsService);
  private seasonService = inject(SeasonService);
  private harvesterService = inject(HarvesterService);
  private notificationService = inject(NotificationService);
  private translationService = inject(TranslationService);

  // Filter Signals
  public selectedDateFilter = signal<DashboardDateFilter>('all');
  public selectedSeasonFilter = signal<string>('all');
  public selectedHarvesterFilter = signal<string>('all');

  // Custom Date Range
  public customStartDate = signal<string>('');
  public customEndDate = signal<string>('');
  public customSingleDate = signal<string>('');

  // Chart Controls
  public chartViewMode = signal<ChartViewMode>('daily');
  public chartMetric = signal<ChartMetricMode>('revenue');
  public machineChartMetric = signal<ChartMetricMode>('acres');

  // Active hover/tap items
  public activeBar = signal<ChartDataPoint | null>(null);

  // Raw records from store
  public allRecords = computed(() => this.recordsService.records());
  public isLoading = computed(() => this.recordsService.isLoading());

  /**
   * Filtered records by date
   */
  public recordsByDate = computed(() => {
    const filter = this.selectedDateFilter();
    const records = this.allRecords();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const oneDayMs = 24 * 60 * 60 * 1000;

    return records.filter(record => {
      if (filter === 'dueToday') {
        if (record.markedAsPaid || (Number(record.pendingAmount) || 0) <= 0 || !record.fullPaymentDate) return false;
        return normalizeDateToKey(record.fullPaymentDate) === todayKey;
      }

      const recDate = parseDate(record.date);
      if (!recDate) return filter === 'all';

      const recordDay = new Date(recDate.getFullYear(), recDate.getMonth(), recDate.getDate()).getTime();

      switch (filter) {
        case 'today':
          return recordDay === today.getTime();
        case 'yesterday':
          return recordDay === today.getTime() - oneDayMs;
        case 'week': {
          const dayOfWeek = today.getDay();
          const startOfWeek = new Date(today.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * oneDayMs).getTime();
          return recordDay >= startOfWeek && recordDay <= today.getTime() + oneDayMs - 1;
        }
        case 'month': {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
          return recordDay >= startOfMonth && recordDay <= endOfMonth;
        }
        case 'custom': {
          const startStr = this.customStartDate();
          const endStr = this.customEndDate();
          if (!startStr && !endStr) return true;
          const startParsed = startStr ? parseDate(startStr) : null;
          const endParsed = endStr ? parseDate(endStr) : null;
          const startDay = startParsed ? new Date(startParsed.getFullYear(), startParsed.getMonth(), startParsed.getDate()).getTime() : -Infinity;
          const endDay = endParsed ? new Date(endParsed.getFullYear(), endParsed.getMonth(), endParsed.getDate()).getTime() + oneDayMs - 1 : Infinity;
          return recordDay >= startDay && recordDay <= endDay;
        }
        default:
          return true;
      }
    });
  });

  /**
   * Final filtered records matching date, season, harvester
   */
  public filteredRecords = computed(() => {
    let result = this.recordsByDate();
    const seasonFilter = this.selectedSeasonFilter();
    const harvesterFilter = this.selectedHarvesterFilter();

    if (seasonFilter !== 'all' && seasonFilter) {
      result = result.filter(r => {
        const s = this.seasonService.getSeasonForRecord(r);
        return s?.id === seasonFilter || r.seasonId === seasonFilter;
      });
    }

    if (harvesterFilter !== 'all' && harvesterFilter) {
      result = result.filter(r => {
        const h = (r.harvester || 'Harvester 1').trim().toLowerCase();
        return h === harvesterFilter.trim().toLowerCase();
      });
    }

    return result;
  });

  // Computed summary metrics
  public stats = computed<DashboardStats>(() => calculateDashboardStats(this.filteredRecords()));

  public dueTodayCount = computed(() => this.notificationService.dueTodayCount());
  public dueTodayAmount = computed(() => this.notificationService.dueTodaySummary()?.totalDueAmount || 0);

  public recoveryOverview = computed<RecoveryOverview>(() => 
    calculateRecoveryOverview(this.filteredRecords(), this.dueTodayAmount())
  );

  public chartTimeline = computed<ChartDataPoint[]>(() => 
    buildDailyTimelineChart(
      this.filteredRecords(),
      this.chartMetric(),
      this.translationService.getCurrentLanguage() === 'hi'
    )
  );

  public recentRecords = computed(() => [...this.filteredRecords()].reverse().slice(0, 5));

  /**
   * Refresh dashboard data from server
   */
  public async loadDashboard(): Promise<void> {
    await this.recordsService.loadRecords();
    this.notificationService.evaluateTodaySettlements();
    this.notificationService.evaluateTodayCuttings();
  }
}
