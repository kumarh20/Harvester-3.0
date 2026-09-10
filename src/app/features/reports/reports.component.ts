import { Component, signal, computed, ViewEncapsulation, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { RecordsService, HarvestRecord } from '../../core/services/records.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { SeasonService } from '../../core/services/season.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { AppNavigationService } from '../../core/services/app-navigation.service';
import { DateTimePickerDialogComponent, DateTimePickerResult } from '../../shared/components/date-time-picker-dialog/date-time-picker-dialog.component';

export type ChartViewMode = 'daily' | 'season';
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
  isSelected?: boolean;
}

export interface RecoveryOverview {
  totalBilled: number;
  totalCollected: number;
  totalPending: number;
  dueTodayAmount: number;
  recoveryPercentage: number;
  pendingPercentage: number;
  dueTodayPercentage: number;
  radius: number;
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

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsComponent {
  // Services
  public recordsService = inject(RecordsService);
  public harvesterService = inject(HarvesterService);
  public seasonService = inject(SeasonService);
  public translationService = inject(TranslationService);
  public languageService = inject(LanguageService);
  public appNavigationService = inject(AppNavigationService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  // Filter Drawer State (Unified Sidebar Filter matching app)
  isFilterPanelOpen = signal<boolean>(false);
  isDrawerDateOpen = signal<boolean>(false);
  isDrawerSeasonOpen = signal<boolean>(false);
  isDrawerHarvesterOpen = signal<boolean>(false);

  // Filters State
  selectedDateFilter = signal<string>('all');
  selectedSeasonFilter = signal<string>('all');
  selectedHarvesterFilter = signal<string>('all');

  customMode = signal<'range' | 'single'>('range');
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');
  customSingleDate = signal<string>('');

  // Chart Interactive Signals
  chartViewMode = signal<ChartViewMode>('daily');
  chartMetric = signal<ChartMetricMode>('revenue');
  machineChartMetric = signal<ChartMetricMode>('acres');
  activeBar = signal<ChartDataPoint | null>(null);
  activeSeasonBar = signal<SeasonChartDataPoint | null>(null);
  activeMachineBar = signal<HarvesterStat | null>(null);

  goBack(): void {
    this.appNavigationService.back('/dashboard');
  }

  // Drawer Open/Close
  openFilterPanel(): void {
    this.isFilterPanelOpen.set(true);
  }

  closeFilterPanel(): void {
    this.isFilterPanelOpen.set(false);
    this.isDrawerDateOpen.set(false);
    this.isDrawerSeasonOpen.set(false);
    this.isDrawerHarvesterOpen.set(false);
  }

  toggleDrawerDate(): void {
    this.isDrawerDateOpen.update(v => !v);
  }

  toggleDrawerSeason(): void {
    this.isDrawerSeasonOpen.update(v => !v);
  }

  toggleDrawerHarvester(): void {
    this.isDrawerHarvesterOpen.update(v => !v);
  }

  // Filter selection methods
  selectDateOption(filter: string): void {
    this.selectedDateFilter.set(filter);
    this.isDrawerDateOpen.set(false);
    this.activeBar.set(null);
    this.activeSeasonBar.set(null);
    this.activeMachineBar.set(null);
  }

  selectSeasonOption(seasonId: string | undefined): void {
    if (!seasonId) return;
    this.selectedSeasonFilter.set(seasonId);
    this.isDrawerSeasonOpen.set(false);
    this.activeBar.set(null);
    this.activeSeasonBar.set(null);
  }

  selectHarvesterOption(harvester: string): void {
    this.selectedHarvesterFilter.set(harvester);
    this.isDrawerHarvesterOpen.set(false);
    this.activeMachineBar.set(null);
  }

  resetFilters(): void {
    this.selectedDateFilter.set('all');
    this.selectedSeasonFilter.set('all');
    this.selectedHarvesterFilter.set('all');
    this.customStartDate.set('');
    this.customEndDate.set('');
    this.customSingleDate.set('');
    this.activeBar.set(null);
    this.activeSeasonBar.set(null);
    this.activeMachineBar.set(null);
  }

  setCustomMode(mode: 'range' | 'single'): void {
    this.customMode.set(mode);
  }

  // Active filter count
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedDateFilter() !== 'all') count++;
    if (this.selectedSeasonFilter() !== 'all') count++;
    if (this.selectedHarvesterFilter() !== 'all') count++;
    return count;
  });

  // Label Helpers
  getSelectedDateFilterLabel(): string {
    const filter = this.selectedDateFilter();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    switch (filter) {
      case 'all': return isHi ? 'सभी' : 'All';
      case 'today': return isHi ? 'आज' : 'Today';
      case 'yesterday': return isHi ? 'कल' : 'Yesterday';
      case 'week': return isHi ? 'इस सप्ताह' : 'This Week';
      case 'month': return isHi ? 'इस माह' : 'This Month';
      case 'dueToday': return isHi ? 'आज देय' : 'Due Today';
      case 'custom': {
        if (this.customMode() === 'single') {
          return this.customSingleDate() ? this.formatDateDisplay(this.customSingleDate()) : (isHi ? 'कस्टम तारीख' : 'Custom Date');
        } else {
          return (this.customStartDate() && this.customEndDate())
            ? `${this.formatDateDisplay(this.customStartDate())} - ${this.formatDateDisplay(this.customEndDate())}`
            : (isHi ? 'कस्टम रेंज' : 'Custom Range');
        }
      }
      default: return isHi ? 'सभी' : 'All';
    }
  }

  getSelectedSeasonFilterLabel(): string {
    const filter = this.selectedSeasonFilter();
    if (filter === 'all') {
      return this.translationService.getCurrentLanguage() === 'hi' ? 'सभी सीज़न' : 'All Seasons';
    }
    const s = this.seasonService.seasons().find(item => item.id === filter);
    return s ? `${s.name} (${s.year})` : (this.translationService.getCurrentLanguage() === 'hi' ? 'सीज़न' : 'Season');
  }

  getSelectedHarvesterFilterLabel(): string {
    const filter = this.selectedHarvesterFilter();
    if (filter === 'all') {
      return this.translationService.getCurrentLanguage() === 'hi' ? 'सभी मशीनें' : 'All Machines';
    }
    return filter;
  }

  // Counts for drawer badges
  allCount = computed(() => this.recordsService.records().length);

  todayCount = computed(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return this.recordsService.records().filter(r => {
      const p = this.parseDate(r.date);
      if (!p) return false;
      const t = new Date(p.getFullYear(), p.getMonth(), p.getDate()).getTime();
      return t === todayStart;
    }).length;
  });

  yesterdayCount = computed(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yStart = todayStart - oneDayMs;
    return this.recordsService.records().filter(r => {
      const p = this.parseDate(r.date);
      if (!p) return false;
      const t = new Date(p.getFullYear(), p.getMonth(), p.getDate()).getTime();
      return t === yStart;
    }).length;
  });

  weekCount = computed(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const wStart = todayStart - (7 * oneDayMs);
    const todayEnd = todayStart + oneDayMs - 1;
    return this.recordsService.records().filter(r => {
      const p = this.parseDate(r.date);
      if (!p) return false;
      const t = new Date(p.getFullYear(), p.getMonth(), p.getDate()).getTime();
      return t >= wStart && t <= todayEnd;
    }).length;
  });

  monthCount = computed(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const mStart = todayStart - (30 * oneDayMs);
    const todayEnd = todayStart + oneDayMs - 1;
    return this.recordsService.records().filter(r => {
      const p = this.parseDate(r.date);
      if (!p) return false;
      const t = new Date(p.getFullYear(), p.getMonth(), p.getDate()).getTime();
      return t >= mStart && t <= todayEnd;
    }).length;
  });

  dueTodaySettlementCount = computed(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return this.recordsService.records().filter(r => {
      if (r.markedAsPaid || (Number(r.pendingAmount) || 0) <= 0 || !r.fullPaymentDate) return false;
      return this.normalizeDateToKey(r.fullPaymentDate) === todayKey;
    }).length;
  });

  getSeasonRecordCount(seasonId: string): number {
    if (seasonId === 'all') return this.recordsService.records().length;
    return this.recordsService.records().filter(r => {
      const s = this.seasonService.getSeasonForRecord(r);
      return s?.id === seasonId || r.seasonId === seasonId;
    }).length;
  }

  getHarvesterRecordCount(harvester: string): number {
    if (harvester === 'all') return this.recordsService.records().length;
    return this.recordsService.records().filter(r => {
      const h = (r.harvester || 'Harvester 1').trim().toLowerCase();
      return h === harvester.trim().toLowerCase();
    }).length;
  }

  // Active season stats for Middle Card
  totalSeasonsCount = computed(() => this.seasonService.seasons().length);

  activeSeason = computed(() => {
    const selected = this.selectedSeasonFilter();
    if (selected && selected !== 'all') {
      return this.seasonService.seasons().find(s => s.id === selected) || this.seasonService.defaultSeason();
    }
    return this.seasonService.defaultSeason() || this.seasonService.seasons()[0] || null;
  });

  activeSeasonStats = computed(() => {
    const season = this.activeSeason();
    const allRecords = this.recordsService.records();

    if (!season) {
      let acres = 0;
      let revenue = 0;
      let pending = 0;
      for (const r of allRecords) {
        acres += Number(r.landInAcres) || 0;
        revenue += Number(r.totalPayment) || 0;
        pending += r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0);
      }
      return {
        name: 'All Seasons',
        year: new Date().getFullYear(),
        totalAcres: Math.round(acres * 100) / 100,
        totalRevenue: Math.round(revenue),
        totalPending: Math.round(pending),
        jobsCount: allRecords.length
      };
    }

    const seasonRecords = allRecords.filter(r => {
      const s = this.seasonService.getSeasonForRecord(r);
      return s?.id === season.id || r.seasonId === season.id;
    });

    let acres = 0;
    let revenue = 0;
    let pending = 0;
    for (const r of seasonRecords) {
      acres += Number(r.landInAcres) || 0;
      revenue += Number(r.totalPayment) || 0;
      pending += r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0);
    }

    return {
      name: season.name,
      year: season.year,
      totalAcres: Math.round(acres * 100) / 100,
      totalRevenue: Math.round(revenue),
      totalPending: Math.round(pending),
      jobsCount: seasonRecords.length
    };
  });

  goToSeasonReports(): void {
    this.router.navigate(['/season-reports']);
  }

  // Chart Interactive Toggles
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

  setMachineChartMetric(metric: ChartMetricMode): void {
    this.machineChartMetric.set(metric);
    this.activeMachineBar.set(null);
  }

  selectBar(point: ChartDataPoint | null): void {
    this.activeBar.set(point);
  }

  toggleBar(point: ChartDataPoint): void {
    if (this.activeBar()?.id === point.id) {
      this.activeBar.set(null);
    } else {
      this.activeBar.set(point);
    }
  }

  selectSeasonBar(point: SeasonChartDataPoint | null): void {
    this.activeSeasonBar.set(point);
  }

  toggleSeasonBar(point: SeasonChartDataPoint): void {
    if (this.activeSeasonBar()?.id === point.id) {
      this.activeSeasonBar.set(null);
    } else {
      this.activeSeasonBar.set(point);
    }
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

  // Date Parsing Helpers
  normalizeDateToKey(dateStr?: string | null): string {
    if (!dateStr) return '';
    const parsed = this.parseDate(dateStr);
    if (!parsed) return '';
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }

  parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.trim().replace(/\//g, '-').split('-');
    if (parts.length !== 3) return null;

    let day = 1;
    let month = 0;
    let year = 2026;

    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
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

  formatDateForInput(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

  // Filtered dataset
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
    const list = this.filteredRecords();
    let totalLand = 0;
    let totalPayment = 0;
    let totalPending = 0;

    for (const r of list) {
      totalLand += Number(r.landInAcres) || 0;
      totalPayment += Number(r.totalPayment) || 0;
      if (!r.markedAsPaid) {
        totalPending += Number(r.pendingAmount) || 0;
      }
    }

    const totalRecords = list.length;
    const averageRate = totalLand > 0 ? Math.round(totalPayment / totalLand) : 0;
    const avgLandPerRecord = totalRecords > 0 ? Math.round((totalLand / totalRecords) * 100) / 100 : 0;

    return {
      totalRecords,
      totalLand: Math.round(totalLand * 100) / 100,
      totalPayment: Math.round(totalPayment),
      totalPending: Math.round(totalPending),
      averageRate,
      avgLandPerRecord
    };
  });

  machineSummary = computed(() => {
    const records = this.filteredRecords();
    let totalAcres = 0;
    let totalRevenue = 0;
    for (const r of records) {
      totalAcres += Number(r.landInAcres) || 0;
      totalRevenue += Number(r.totalPayment) || 0;
    }
    return {
      totalAcres: Math.round(totalAcres * 100) / 100,
      totalJobs: records.length,
      totalRevenue: Math.round(totalRevenue)
    };
  });

  // Timeline dual-bars
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

    const sortedEntries = Array.from(dateMap.entries()).sort((a, b) => a[1].date.getTime() - b[1].date.getTime());
    const displayEntries = sortedEntries.length > 8 ? sortedEntries.slice(-8) : sortedEntries;

    const metric = this.chartMetric();
    const isHindi = this.languageService.getCurrentLanguage() === 'hi';

    let maxPrimary = 1;
    let maxSecondary = 1;

    if (metric === 'revenue') {
      maxPrimary = Math.max(...displayEntries.map(e => Math.max(e[1].revenue, e[1].collected)), 1000);
      maxSecondary = maxPrimary;
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

  // Season dual-bars
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

  // Donut Recovery Ring & Metrics
  recoveryOverview = computed<RecoveryOverview>(() => {
    const s = this.stats();
    const records = this.filteredRecords();
    const totalBilled = s.totalPayment;
    const totalPending = s.totalPending;
    const totalCollected = Math.max(0, totalBilled - totalPending);

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
    const circumference = 2 * Math.PI * radius;

    let seg1Pct = 0;
    let seg2Pct = 0;
    let seg3Pct = 0;

    if (totalBilled > 0) {
      seg1Pct = (totalCollected / totalBilled) * 100;
      seg2Pct = (totalPending / totalBilled) * 100;
      seg3Pct = Math.min(seg2Pct, (dueTodayAmount / totalBilled) * 100);
    } else {
      seg1Pct = 0;
      seg2Pct = 0;
      seg3Pct = 0;
    }

    const len1 = (circumference * seg1Pct) / 100;
    const dashArray1 = `${len1} ${circumference}`;
    const dashOffset1 = 0;

    const len2 = (circumference * seg2Pct) / 100;
    const dashArray2 = `${len2} ${circumference}`;
    const dashOffset2 = -len1;

    const len3 = (circumference * seg3Pct) / 100;
    const dashArray3 = `${len3} ${circumference}`;
    const dashOffset3 = -(len1 + (len2 - len3));

    const strokeDashoffset = circumference - (circumference * recoveryPercentage) / 100;

    return {
      totalBilled,
      totalCollected,
      totalPending,
      dueTodayAmount,
      recoveryPercentage,
      pendingPercentage,
      dueTodayPercentage,
      radius,
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

  // Harvester Fleet Comparison
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

  // Formatting helpers
  formatCurrency(value: number): string {
    return '₹' + (value || 0).toLocaleString('en-IN');
  }

  formatNumber(value: number): string {
    return (value || 0).toLocaleString('en-IN');
  }
}
