import { Component, OnInit, signal, computed, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RecordsService, Record } from '../../core/services/records.service';
import { SeasonService } from '../../core/services/season.service';
import { NotificationService } from '../../core/services/notification.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { DashboardSkeletonComponent } from '../../shared/components/skeleton/dashboard-skeleton/dashboard-skeleton.component';
import { DateTimePickerDialogComponent, DateTimePickerResult } from '../../shared/components/date-time-picker-dialog/date-time-picker-dialog.component';
import { AppNavigationService } from '../../core/services/app-navigation.service';

export type DashboardDateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'dueToday';
export type ChartMetricMode = 'revenue' | 'acres';
export type ChartViewMode = 'daily' | 'season';

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
  primaryBarHeightPercent: number;
  secondaryBarHeightPercent: number;
}

export interface SeasonChartDataPoint {
  id: string;
  seasonId: string;
  name: string;
  year: number;
  label: string;
  fullLabel: string;
  acres: number;
  revenue: number;
  collected: number;
  pending: number;
  jobsCount: number;
  barHeightPercent: number;
  primaryBarHeightPercent: number;
  secondaryBarHeightPercent: number;
  isSelected: boolean;
}

export interface HarvesterStat {
  id: string;
  name: string;
  count: number;
  acres: number;
  revenue: number;
  percentOfTotal: number;
  barHeightPercent: number;
  primaryBarHeightPercent: number;
  secondaryBarHeightPercent: number;
}

export interface RecoveryOverview {
  totalBilled: number;
  totalCollected: number;
  totalPending: number;
  dueTodayAmount: number;
  totalAcres: number;
  recoveryPercentage: number;
  pendingPercentage: number;
  dueTodayPercentage: number;
  circumference: number;
  strokeDashoffset: number;
  dashArray1: string;
  dashOffset1: number;
  dashArray2: string;
  dashOffset2: number;
  dashArray3: string;
  dashOffset3: number;
  seg1Pct: number;
  seg2Pct: number;
  seg3Pct: number;
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

  // Dual & Harvester Filter State (Unified with Records screen)
  selectedDateFilter = signal<DashboardDateFilter>('all');
  selectedSeasonFilter = signal<string>('all');
  selectedHarvesterFilter = signal<string>('all');
  private userManuallySelectedSeason = false;
  isDateFilterOpen = signal<boolean>(false);
  isSeasonFilterOpen = signal<boolean>(false);

  // Filter Drawer State
  isFilterPanelOpen = signal<boolean>(false);
  isDrawerDateOpen = signal<boolean>(false);
  isDrawerSeasonOpen = signal<boolean>(false);
  isDrawerHarvesterOpen = signal<boolean>(false);

  // Available Harvesters list
  availableHarvesters = computed(() => {
    const list = this.harvesterService.harvesters();
    if (list && list.length > 0) {
      return list;
    }
    const allRecords = this.recordsService.records();
    const set = new Set<string>();
    allRecords.forEach(r => {
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

  // Custom date drawer state
  customMode = signal<'single' | 'range'>('single');
  customSingleDate = signal<string>(this.formatDateForInput(new Date()));
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');

  // Graph Controls State
  chartViewMode = signal<ChartViewMode>('daily');
  chartMetric = signal<ChartMetricMode>('revenue');
  machineChartMetric = signal<ChartMetricMode>('acres');
  activeBar = signal<ChartDataPoint | null>(null);
  activeSeasonBar = signal<SeasonChartDataPoint | null>(null);
  activeMachineBar = signal<HarvesterStat | null>(null);

  todayCount = signal(0);
  weekCount = signal(0);
  monthCount = signal(0);
  allCount = signal(0);
  isLoading = signal(true);

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

  // Records filtered by the chosen date filter option
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

  // Filtered records matching Date filter, Season filter, and Harvester filter
  filteredRecords = computed(() => {
    const records = this.recordsByDate();
    const seasonFilter = this.selectedSeasonFilter();
    const harvesterFilter = this.selectedHarvesterFilter();

    let result = records;

    if (seasonFilter !== 'all' && seasonFilter) {
      result = result.filter(record => {
        const s = this.seasonService.getSeasonForRecord(record);
        return s?.id === seasonFilter || record.seasonId === seasonFilter;
      });
    }

    if (harvesterFilter !== 'all' && harvesterFilter) {
      result = result.filter(record => {
        const h = (record.harvester || 'Harvester 1').trim().toLowerCase();
        return h === harvesterFilter.trim().toLowerCase();
      });
    }

    return result;
  });

  stats = computed(() => {
    return this.calculateStats(this.filteredRecords());
  });

  recentRecords = computed(() => {
    return [...this.filteredRecords()].reverse().slice(0, 5);
  });

  // ----------------------------------------------------
  // Interactive Timeline Chart Computation (Daily view)
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
    const isHindi = this.languageService.getCurrentLanguage() === 'hi';

    // Calculate maximums for dual-bar proportional scaling
    let maxPrimary = 1;
    let maxSecondary = 1;

    if (metric === 'revenue') {
      maxPrimary = Math.max(...displayEntries.map(e => Math.max(e[1].revenue, e[1].collected)), 1000);
      maxSecondary = maxPrimary; // Shared axis scale so Revenue vs Collected can be directly compared!
    } else {
      maxPrimary = Math.max(...displayEntries.map(e => e[1].acres), 1);
      maxSecondary = Math.max(...displayEntries.map(e => e[1].count), 1);
    }

    return displayEntries.map(([key, data]) => {
      let pPct = 0;
      let sPct = 0;

      if (metric === 'revenue') {
        pPct = data.revenue > 0 ? Math.min(100, Math.max(4, Math.round((data.revenue / maxPrimary) * 100))) : 0;
        sPct = data.collected > 0 ? Math.min(100, Math.max(4, Math.round((data.collected / maxSecondary) * 100))) : 0;
      } else {
        pPct = data.acres > 0 ? Math.min(100, Math.max(4, Math.round((data.acres / maxPrimary) * 100))) : 0;
        sPct = data.count > 0 ? Math.min(100, Math.max(4, Math.round((data.count / maxSecondary) * 100))) : 0;
      }

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
        barHeightPercent: pPct,
        primaryBarHeightPercent: pPct,
        secondaryBarHeightPercent: sPct
      };
    });
  });

  // ----------------------------------------------------
  // Interactive Season Breakdown Computation (Season-wise view)
  // ----------------------------------------------------
  chartSeasonBreakdown = computed<SeasonChartDataPoint[]>(() => {
    const records = this.recordsByDate();
    const seasons = this.seasonService.seasons();
    if (!seasons || seasons.length === 0) return [];

    const activeSeason = this.selectedSeasonFilter();
    const metric = this.chartMetric();
    const isHi = this.languageService.getCurrentLanguage() === 'hi';

    const list: SeasonChartDataPoint[] = [];

    for (const s of seasons) {
      const seasonId = s.id || '';
      const matchingRecords = records.filter(r => {
        const recSeason = this.seasonService.getSeasonForRecord(r);
        return recSeason?.id === seasonId || r.seasonId === seasonId;
      });

      let acres = 0;
      let revenue = 0;
      let pending = 0;
      const count = matchingRecords.length;

      for (const r of matchingRecords) {
        const a = Number(r.landInAcres) || 0;
        const rev = Number(r.totalPayment) || 0;
        const p = r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0);
        acres += a;
        revenue += rev;
        pending += p;
      }

      const collected = Math.max(0, revenue - pending);
      const shortName = s.name.split(' ')[0] || s.name;
      const label = `${shortName} '${String(s.year).slice(-2)}`;
      const fullLabel = `${s.name} ${s.year}`;

      list.push({
        id: seasonId,
        seasonId,
        name: s.name,
        year: s.year,
        label,
        fullLabel,
        acres: Math.round(acres * 100) / 100,
        revenue: Math.round(revenue),
        collected: Math.round(collected),
        pending: Math.round(pending),
        jobsCount: count,
        barHeightPercent: 8,
        primaryBarHeightPercent: 8,
        secondaryBarHeightPercent: 8,
        isSelected: activeSeason === seasonId
      });
    }

    // Check if there are records not mapped to any defined season
    const unassignedRecords = records.filter(r => !this.seasonService.getSeasonForRecord(r));
    if (unassignedRecords.length > 0) {
      let uAcres = 0;
      let uRev = 0;
      let uPending = 0;
      for (const r of unassignedRecords) {
        uAcres += Number(r.landInAcres) || 0;
        uRev += Number(r.totalPayment) || 0;
        uPending += r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0);
      }
      list.push({
        id: 'unassigned',
        seasonId: 'unassigned',
        name: isHi ? 'अन्य / पुराना' : 'Other / Legacy',
        year: new Date().getFullYear(),
        label: isHi ? 'अन्य' : 'Other',
        fullLabel: isHi ? 'बिना सीज़न / पुराना रिकॉर्ड्स' : 'Unassigned Records',
        acres: Math.round(uAcres * 100) / 100,
        revenue: Math.round(uRev),
        collected: Math.max(0, Math.round(uRev - uPending)),
        pending: Math.round(uPending),
        jobsCount: unassignedRecords.length,
        barHeightPercent: 8,
        primaryBarHeightPercent: 8,
        secondaryBarHeightPercent: 8,
        isSelected: activeSeason === 'unassigned'
      });
    }

    let maxPrimary = 1;
    let maxSecondary = 1;

    if (metric === 'revenue') {
      maxPrimary = Math.max(...list.map(e => Math.max(e.revenue, e.collected)), 1000);
      maxSecondary = maxPrimary;
    } else {
      maxPrimary = Math.max(...list.map(e => e.acres), 1);
      maxSecondary = Math.max(...list.map(e => e.jobsCount), 1);
    }

    return list.map(item => {
      let pPct = 0;
      let sPct = 0;

      if (metric === 'revenue') {
        pPct = item.revenue > 0 ? Math.min(100, Math.max(4, Math.round((item.revenue / maxPrimary) * 100))) : 0;
        sPct = item.collected > 0 ? Math.min(100, Math.max(4, Math.round((item.collected / maxSecondary) * 100))) : 0;
      } else {
        pPct = item.acres > 0 ? Math.min(100, Math.max(4, Math.round((item.acres / maxPrimary) * 100))) : 0;
        sPct = item.jobsCount > 0 ? Math.min(100, Math.max(4, Math.round((item.jobsCount / maxSecondary) * 100))) : 0;
      }

      return {
        ...item,
        barHeightPercent: pPct,
        primaryBarHeightPercent: pPct,
        secondaryBarHeightPercent: sPct
      };
    });
  });

  // ----------------------------------------------------
  // Financial Recovery Ring & Metrics Computation
  // ----------------------------------------------------
  recoveryOverview = computed<RecoveryOverview>(() => {
    const s = this.stats();
    const records = this.filteredRecords();
    const totalBilled = s.totalPayment;
    const totalPending = s.totalPending;
    const totalCollected = Math.max(0, totalBilled - totalPending);
    const totalAcres = s.totalLand;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    let dueTodayAmount = 0;
    for (const r of records) {
      if (!r.markedAsPaid && (Number(r.pendingAmount) || 0) > 0 && r.fullPaymentDate) {
        if (this.normalizeDateToKey(r.fullPaymentDate) === todayKey) {
          dueTodayAmount += Number(r.pendingAmount) || 0;
        }
      }
    }

    const recoveryPercentage = totalBilled > 0
      ? Math.min(100, Math.round((totalCollected / totalBilled) * 100))
      : (totalCollected > 0 ? 100 : 0);

    const pendingPercentage = totalBilled > 0
      ? Math.min(100, Math.round((totalPending / totalBilled) * 100))
      : (totalPending > 0 ? 100 : 0);

    const dueTodayPercentage = totalBilled > 0
      ? Math.min(100, Math.round((dueTodayAmount / totalBilled) * 100))
      : 0;

    const radius = 52;
    const circumference = 2 * Math.PI * radius; // ~326.726

    // Slices for the 3-color donut:
    // Seg 1 (Blue): Collected (वसूल राशि)
    // Seg 2 (Pink/Magenta): Pending Due (बकाया राशि)
    // Seg 3 (Emerald Green): Due Today / Upcoming / Target (आज देय या सक्रिय कटाई)
    let seg1Pct = 0;
    let seg2Pct = 0;
    let seg3Pct = 0;

    if (totalBilled > 0) {
      seg1Pct = (totalCollected / totalBilled) * 100;
      if (dueTodayAmount > 0) {
        const dPct = (dueTodayAmount / totalBilled) * 100;
        const otherPendPct = Math.max(0, ((totalPending - dueTodayAmount) / totalBilled) * 100);
        seg2Pct = otherPendPct;
        seg3Pct = dPct;
      } else {
        seg2Pct = (totalPending / totalBilled) * 100;
        seg3Pct = 0;
      }
    } else {
      seg1Pct = 0;
      seg2Pct = 0;
      seg3Pct = 0;
    }

    const l1 = (circumference * seg1Pct) / 100;
    const l2 = (circumference * seg2Pct) / 100;
    const l3 = (circumference * seg3Pct) / 100;

    const dashArray1 = `${l1} ${circumference}`;
    const dashOffset1 = 0;

    const dashArray2 = `${l2} ${circumference}`;
    const dashOffset2 = -l1;

    const dashArray3 = `${l3} ${circumference}`;
    const dashOffset3 = -(l1 + l2);

    const strokeDashoffset = circumference - (circumference * recoveryPercentage) / 100;

    return {
      totalBilled,
      totalCollected,
      totalPending,
      dueTodayAmount,
      totalAcres,
      recoveryPercentage,
      pendingPercentage,
      dueTodayPercentage,
      circumference,
      strokeDashoffset,
      dashArray1,
      dashOffset1,
      dashArray2,
      dashOffset2,
      dashArray3,
      dashOffset3,
      seg1Pct: Math.round(seg1Pct),
      seg2Pct: Math.round(seg2Pct),
      seg3Pct: Math.round(seg3Pct)
    };
  });

  // ----------------------------------------------------
  // Harvester Fleet Utilization & Vertical Bar Chart
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

    const rawList = Array.from(map.entries())
      .map(([name, data], idx) => ({
        id: 'mach-' + idx + '-' + name.replace(/\s+/g, '_'),
        name,
        count: data.count,
        acres: Math.round(data.acres * 10) / 10,
        revenue: Math.round(data.revenue),
        percentOfTotal: totalAcresAll > 0 ? Math.round((data.acres / totalAcresAll) * 100) : 0
      }))
      .sort((a, b) => b.acres - a.acres);

    const metric = this.machineChartMetric();
    const maxPrimary = metric === 'revenue'
      ? Math.max(...rawList.map(x => x.revenue), 1)
      : Math.max(...rawList.map(x => x.acres), 1);
    const maxSecondary = metric === 'revenue'
      ? Math.max(...rawList.map(x => x.acres), 1)
      : Math.max(...rawList.map(x => x.count), 1);

    return rawList.map(item => {
      let pPct = 0;
      let sPct = 0;

      if (metric === 'revenue') {
        pPct = item.revenue > 0 ? Math.min(100, Math.max(6, Math.round((item.revenue / maxPrimary) * 100))) : 0;
        sPct = item.acres > 0 ? Math.min(100, Math.max(6, Math.round((item.acres / maxSecondary) * 100))) : 0;
      } else {
        pPct = item.acres > 0 ? Math.min(100, Math.max(6, Math.round((item.acres / maxPrimary) * 100))) : 0;
        sPct = item.count > 0 ? Math.min(100, Math.max(6, Math.round((item.count / maxSecondary) * 100))) : 0;
      }

      return {
        ...item,
        barHeightPercent: pPct,
        primaryBarHeightPercent: pPct,
        secondaryBarHeightPercent: sPct
      };
    });
  });

  constructor(
    public recordsService: RecordsService,
    public seasonService: SeasonService,
    public notificationService: NotificationService,
    public translationService: TranslationService,
    private languageService: LanguageService,
    private router: Router,
    private dialog: MatDialog,
    public appNavigationService: AppNavigationService,
    public harvesterService: HarvesterService,
    private uiPreferencesService: UiPreferencesService
  ) {
    this.updatePeriodCounts();

    // Default season synchronization from Settings
    effect(() => {
      const defSeason = this.seasonService.defaultSeason();
      if (!this.userManuallySelectedSeason && defSeason && defSeason.id) {
        this.selectedSeasonFilter.set(defSeason.id);
      }
    });
  }

  goBack(): void {
    this.appNavigationService.back('/records');
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

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);

    try {
      await Promise.all([
        this.seasonService.loadSeasons(),
        this.recordsService.loadRecords()
      ]);
      this.updatePeriodCounts();
      // Check promised settlement dates due today and trigger system notification
      this.notificationService.evaluateTodaySettlements();
      await this.notificationService.triggerSettlementNotification();
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

  goToFarmerRecord(record: Record): void {
    this.router.navigate(['/records'], {
      queryParams: {
        farmer: record.contactNumber || record.farmerName,
        recordId: record.id
      }
    });
  }

  async refreshData(): Promise<void> {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.seasonService.loadSeasons(),
        this.recordsService.loadRecords()
      ]);
      this.updatePeriodCounts();
      this.notificationService.evaluateTodaySettlements();
      await this.notificationService.triggerSettlementNotification(false);
    } finally {
      setTimeout(() => this.isLoading.set(false), 300);
    }
  }

  async notifyDueSettlementsNow(): Promise<void> {
    await this.notificationService.triggerSettlementNotification(true);
  }

  // ----------------------------------------------------
  // Dropdown Filter Interactions (Identical to Records)
  // ----------------------------------------------------
  toggleDateDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.isDateFilterOpen.update(v => !v);
    this.isSeasonFilterOpen.set(false);
  }

  toggleSeasonDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.isSeasonFilterOpen.update(v => !v);
    this.isDateFilterOpen.set(false);
  }

  closeAllFilterDropdowns(): void {
    this.isDateFilterOpen.set(false);
    this.isSeasonFilterOpen.set(false);
  }

  selectDateOption(filter: DashboardDateFilter): void {
    this.selectedDateFilter.set(filter);
    this.isDateFilterOpen.set(false);
    this.activeBar.set(null);
  }

  selectSeasonOption(seasonId: string): void {
    this.userManuallySelectedSeason = true;
    this.selectedSeasonFilter.set(seasonId);
    this.isSeasonFilterOpen.set(false);
    this.activeBar.set(null);
    this.activeSeasonBar.set(null);
  }

  openFilterPanel(): void {
    this.closeAllFilterDropdowns();
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerDateOpen.set(false);
    this.isFilterPanelOpen.set(true);
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

  closeFilterPanel(): void {
    this.isFilterPanelOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerDateOpen.set(false);
  }

  applyFilterPanel(): void {
    this.isFilterPanelOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerDateOpen.set(false);
  }

  selectHarvesterOption(harvester: string): void {
    this.selectedHarvesterFilter.set(harvester);
    this.isDrawerHarvesterOpen.set(false);
    this.activeBar.set(null);
  }

  getSelectedHarvesterFilterLabel(): string {
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    const filter = this.selectedHarvesterFilter();
    if (filter === 'all' || !filter) {
      return isHi ? 'सभी हार्वेस्टर' : 'All Harvesters';
    }
    return filter;
  }

  getHarvesterRecordCount(harvester: string): number {
    const recs = this.recordsService.records();
    if (harvester === 'all') return recs.length;
    return recs.filter(r => (r.harvester || 'Harvester 1').trim().toLowerCase() === harvester.trim().toLowerCase()).length;
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

  resetAllFilters(): void {
    this.userManuallySelectedSeason = false;
    const prefDefault = this.uiPreferencesService.defaultRecordFilter();
    this.selectedDateFilter.set(prefDefault || 'all');
    const defSeason = this.seasonService.defaultSeason();
    this.selectedSeasonFilter.set(defSeason?.id || 'all');
    this.selectedHarvesterFilter.set('all');
    this.customStartDate.set('');
    this.customEndDate.set('');
    this.isDateFilterOpen.set(false);
    this.isSeasonFilterOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
    this.isDrawerDateOpen.set(false);
    this.activeBar.set(null);
    this.activeSeasonBar.set(null);
  }

  getSelectedDateFilterLabel(): string {
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
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
        return isHi ? 'कस्टम तारीख' : 'Custom Date';
      case 'dueToday':
        return isHi ? `आज देय (${this.dueTodaySettlementCount()})` : `Due Today (${this.dueTodaySettlementCount()})`;
      case 'all':
      default:
        return isHi ? 'सभी तारीख' : 'All Dates';
    }
  }

  getSelectedSeasonFilterLabel(): string {
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
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

  private updatePeriodCounts(): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const weekStart = todayStart - (7 * oneDayMs);
    const monthStart = todayStart - (30 * oneDayMs);
    const todayEnd = todayStart + oneDayMs - 1;

    const records = this.recordsService.records();

    let today = 0;
    let week = 0;
    let month = 0;

    for (const record of records) {
      const parsed = this.parseDate(record.date);
      if (!parsed) continue;
      const time = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
      if (time === todayStart) today++;
      if (time >= weekStart && time <= todayEnd) week++;
      if (time >= monthStart && time <= todayEnd) month++;
    }

    this.todayCount.set(today);
    this.weekCount.set(week);
    this.monthCount.set(month);
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

  // ----------------------------------------------------
  // Chart Controls
  // ----------------------------------------------------
  setChartViewMode(mode: ChartViewMode): void {
    this.chartViewMode.set(mode);
    this.activeBar.set(null);
    this.activeSeasonBar.set(null);
  }

  setChartMetric(metric: ChartMetricMode): void {
    this.chartMetric.set(metric);
    this.activeBar.set(null);
    this.activeSeasonBar.set(null);
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

  selectSeasonBar(bar: SeasonChartDataPoint | null): void {
    this.activeSeasonBar.set(bar);
  }

  toggleSeasonBar(bar: SeasonChartDataPoint): void {
    if (this.activeSeasonBar()?.id === bar.id) {
      this.activeSeasonBar.set(null);
    } else {
      this.activeSeasonBar.set(bar);
    }
  }

  setMachineChartMetric(metric: ChartMetricMode): void {
    this.machineChartMetric.set(metric);
    this.activeMachineBar.set(null);
  }

  selectMachineBar(machine: HarvesterStat | null): void {
    this.activeMachineBar.set(machine);
  }

  toggleMachineBar(machine: HarvesterStat): void {
    if (this.activeMachineBar()?.id === machine.id) {
      this.activeMachineBar.set(null);
    } else {
      this.activeMachineBar.set(machine);
    }
  }
}
