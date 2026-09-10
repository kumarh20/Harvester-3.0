import { Component, signal, computed, ViewEncapsulation, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { RecordsService, HarvestRecord } from '../../core/services/records.service';
import { SeasonService } from '../../core/services/season.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { Season, getHindiMonthName } from '../../core/models/season.model';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { AppNavigationService } from '../../core/services/app-navigation.service';
import { DateTimePickerDialogComponent, DateTimePickerResult } from '../../shared/components/date-time-picker-dialog/date-time-picker-dialog.component';

export interface SeasonMachineStat {
  machineName: string;
  acres: number;
  revenue: number;
  jobsCount: number;
  sharePercent: number;
}

export interface SeasonSummaryData {
  id: string;
  name: string;
  year: number;
  startMonth: number;
  endMonth: number;
  durationLabel: string;
  isDefault: boolean;
  totalRecords: number;
  totalLand: number;
  totalRevenue: number;
  totalCollected: number;
  totalPending: number;
  averageRate: number;
  recoveryPercentage: number;
  machines: SeasonMachineStat[];
  recentRecords: HarvestRecord[];
}

@Component({
  selector: 'app-season-reports',
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
  templateUrl: './season-reports.component.html',
  styleUrl: './season-reports.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeasonReportsComponent {
  // Injected Services
  public recordsService = inject(RecordsService);
  public seasonService = inject(SeasonService);
  public harvesterService = inject(HarvesterService);
  public translationService = inject(TranslationService);
  public languageService = inject(LanguageService);
  public appNavigationService = inject(AppNavigationService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  // Filter Drawer State (Same as other pages in the app)
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

  searchQuery = signal<string>('');
  
  // Track expanded state for each season card (all collapsed by default)
  expandedSeasonIds = signal<Set<string>>(new Set());

  constructor() {
    // By default, cards start collapsed so user can manually expand when needed
  }

  goBack(): void {
    this.appNavigationService.back('/dashboard');
  }

  // Drawer Control Methods
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

  selectDateOption(filter: string): void {
    this.selectedDateFilter.set(filter);
    this.isDrawerDateOpen.set(false);
  }

  selectSeasonOption(seasonId: string | undefined): void {
    if (!seasonId) return;
    this.selectedSeasonFilter.set(seasonId);
    this.isDrawerSeasonOpen.set(false);
    if (seasonId !== 'all') {
      const current = new Set(this.expandedSeasonIds());
      current.add(seasonId);
      this.expandedSeasonIds.set(current);
    }
  }

  selectHarvesterOption(harvester: string): void {
    this.selectedHarvesterFilter.set(harvester);
    this.isDrawerHarvesterOpen.set(false);
  }

  resetFilters(): void {
    this.selectedDateFilter.set('all');
    this.selectedSeasonFilter.set('all');
    this.selectedHarvesterFilter.set('all');
    this.customStartDate.set('');
    this.customEndDate.set('');
    this.customSingleDate.set('');
  }

  setCustomMode(mode: 'range' | 'single'): void {
    this.customMode.set(mode);
  }

  // Active filter count for badge
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

  // Filter Drawer Badge Counts
  allCount = computed(() => this.recordsService.records().length);

  todayCount = computed(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
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
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return this.recordsService.records().filter(r => {
      if (r.markedAsPaid || (Number(r.pendingAmount) || 0) <= 0 || !r.fullPaymentDate) return false;
      return this.normalizeDateToKey(r.fullPaymentDate) === todayKey;
    }).length;
  });

  getSeasonRecordCount(seasonId: string): number {
    if (seasonId === 'all') return this.recordsService.records().length;
    return this.recordsService.records().filter(r => {
      const recSeason = this.seasonService.getSeasonForRecord(r);
      return recSeason?.id === seasonId || r.seasonId === seasonId;
    }).length;
  }

  getHarvesterRecordCount(harvester: string): number {
    if (harvester === 'all') return this.recordsService.records().length;
    return this.recordsService.records().filter(r => {
      const h = (r.harvester || 'Harvester 1').trim().toLowerCase();
      return h === harvester.trim().toLowerCase();
    }).length;
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

  // Filtered dataset according to date & harvester
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

    return allRecords.filter(record => {
      if (filter === 'dueToday') {
        if (record.markedAsPaid || (Number(record.pendingAmount) || 0) <= 0 || !record.fullPaymentDate) return false;
        return this.normalizeDateToKey(record.fullPaymentDate) === todayKey;
      }

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
            return recordDay === new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
          } else {
            const start = this.customStartDate() ? this.parseDate(this.customStartDate()) : null;
            const end = this.customEndDate() ? this.parseDate(this.customEndDate()) : null;
            const startTime = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : -Infinity;
            const endTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() + oneDayMs - 1 : Infinity;
            return recordDay >= startTime && recordDay <= endTime;
          }
        }
        default:
          return true;
      }
    });
  });

  filteredRecords = computed(() => {
    let list = this.recordsByDate();
    const harvesterFilter = this.selectedHarvesterFilter();
    if (harvesterFilter !== 'all') {
      list = list.filter(r => (r.harvester || 'Harvester 1').trim().toLowerCase() === harvesterFilter.trim().toLowerCase());
    }
    return list;
  });

  // Accordion Expand/Collapse
  toggleExpand(seasonId: string): void {
    const current = new Set(this.expandedSeasonIds());
    if (current.has(seasonId)) {
      current.delete(seasonId);
    } else {
      current.add(seasonId);
    }
    this.expandedSeasonIds.set(current);
  }

  isExpanded(seasonId: string): boolean {
    return this.expandedSeasonIds().has(seasonId);
  }

  expandAll(): void {
    const allIds = this.seasonSummaries().map(s => s.id);
    this.expandedSeasonIds.set(new Set(allIds));
  }

  collapseAll(): void {
    this.expandedSeasonIds.set(new Set());
  }

  setSeasonFilter(seasonId: string): void {
    this.selectedSeasonFilter.set(seasonId);
    if (seasonId !== 'all') {
      const current = new Set(this.expandedSeasonIds());
      current.add(seasonId);
      this.expandedSeasonIds.set(current);
    }
  }

  goToSeasonRecords(seasonId: string): void {
    this.router.navigate(['/records'], { queryParams: { seasonId } });
  }

  // Calculate comprehensive data for all seasons based on active filteredRecords
  seasonSummaries = computed<SeasonSummaryData[]>(() => {
    const seasons = this.seasonService.seasons();
    const activeRecords = this.filteredRecords();
    const isHi = this.translationService.getCurrentLanguage() === 'hi';

    const list: SeasonSummaryData[] = [];

    for (const s of seasons) {
      const seasonId = s.id || '';
      const matchingRecords = activeRecords.filter(r => {
        const recSeason = this.seasonService.getSeasonForRecord(r);
        return recSeason?.id === seasonId || r.seasonId === seasonId;
      });

      let totalLand = 0;
      let totalRevenue = 0;
      let totalPending = 0;

      const machineMap = new Map<string, { acres: number; revenue: number; count: number }>();

      for (const r of matchingRecords) {
        const acres = Number(r.landInAcres) || 0;
        const total = Number(r.totalPayment) || 0;
        const pending = r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0);

        totalLand += acres;
        totalRevenue += total;
        totalPending += pending;

        const machName = (r.harvester && r.harvester.trim()) ? r.harvester.trim() : 'Harvester 1';
        const machData = machineMap.get(machName) || { acres: 0, revenue: 0, count: 0 };
        machData.acres += acres;
        machData.revenue += total;
        machData.count += 1;
        machineMap.set(machName, machData);
      }

      const totalCollected = Math.max(0, totalRevenue - totalPending);
      const averageRate = totalLand > 0 ? Math.round(totalRevenue / totalLand) : 0;
      const recoveryPercentage = totalRevenue > 0
        ? Math.min(100, Math.round((totalCollected / totalRevenue) * 100))
        : (totalCollected > 0 ? 100 : 0);

      const machines: SeasonMachineStat[] = Array.from(machineMap.entries()).map(([machineName, data]) => ({
        machineName,
        acres: Math.round(data.acres * 100) / 100,
        revenue: Math.round(data.revenue),
        jobsCount: data.count,
        sharePercent: totalLand > 0 ? Math.round((data.acres / totalLand) * 100) : 0
      })).sort((a, b) => b.acres - a.acres);

      const recentRecords = [...matchingRecords].reverse().slice(0, 5);

      const startMonthName = isHi ? getHindiMonthName(s.startMonth) : `Month ${s.startMonth}`;
      const endMonthName = isHi ? getHindiMonthName(s.endMonth) : `Month ${s.endMonth}`;
      const durationLabel = `${startMonthName} - ${endMonthName} (${s.year})`;

      list.push({
        id: seasonId,
        name: s.name,
        year: s.year,
        startMonth: s.startMonth,
        endMonth: s.endMonth,
        durationLabel,
        isDefault: !!s.isDefault,
        totalRecords: matchingRecords.length,
        totalLand: Math.round(totalLand * 100) / 100,
        totalRevenue: Math.round(totalRevenue),
        totalCollected: Math.round(totalCollected),
        totalPending: Math.round(totalPending),
        averageRate,
        recoveryPercentage,
        machines,
        recentRecords
      });
    }

    // Also check for unassigned records if any
    const unassignedRecords = activeRecords.filter(r => !this.seasonService.getSeasonForRecord(r));
    if (unassignedRecords.length > 0) {
      let uLand = 0;
      let uRev = 0;
      let uPending = 0;
      for (const r of unassignedRecords) {
        uLand += Number(r.landInAcres) || 0;
        uRev += Number(r.totalPayment) || 0;
        uPending += r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0);
      }
      const uCollected = Math.max(0, uRev - uPending);
      const uRate = uLand > 0 ? Math.round(uRev / uLand) : 0;
      const uRecovery = uRev > 0 ? Math.min(100, Math.round((uCollected / uRev) * 100)) : 0;

      list.push({
        id: 'unassigned',
        name: isHi ? 'अन्य / पूर्व रिकॉर्ड्स' : 'Other / Legacy Records',
        year: new Date().getFullYear(),
        startMonth: 1,
        endMonth: 12,
        durationLabel: isHi ? 'बिना सीज़न वाले रिकॉर्ड्स' : 'Records without assigned season',
        isDefault: false,
        totalRecords: unassignedRecords.length,
        totalLand: Math.round(uLand * 100) / 100,
        totalRevenue: Math.round(uRev),
        totalCollected: Math.round(uCollected),
        totalPending: Math.round(uPending),
        averageRate: uRate,
        recoveryPercentage: uRecovery,
        machines: [],
        recentRecords: [...unassignedRecords].reverse().slice(0, 5)
      });
    }

    return list;
  });

  // Filtered by selected season & search
  filteredSeasonSummaries = computed(() => {
    const list = this.seasonSummaries();
    const filter = this.selectedSeasonFilter();
    const query = this.searchQuery().trim().toLowerCase();

    let result = list;

    if (filter !== 'all') {
      result = result.filter(s => s.id === filter);
    }

    if (query) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        String(s.year).includes(query) ||
        s.machines.some(m => m.machineName.toLowerCase().includes(query))
      );
    }

    return result;
  });

  // Overall Global Aggregations for the Overview Banner
  overallStats = computed(() => {
    const list = this.filteredSeasonSummaries();
    let totalLand = 0;
    let totalRevenue = 0;
    let totalPending = 0;
    let totalJobs = 0;

    for (const s of list) {
      totalLand += s.totalLand;
      totalRevenue += s.totalRevenue;
      totalPending += s.totalPending;
      totalJobs += s.totalRecords;
    }

    return {
      totalSeasons: list.length,
      totalLand: Math.round(totalLand * 100) / 100,
      totalRevenue: Math.round(totalRevenue),
      totalPending: Math.round(totalPending),
      totalJobs
    };
  });

  formatCurrency(value: number): string {
    return '₹' + (value || 0).toLocaleString('en-IN');
  }

  formatNumber(value: number): string {
    return (value || 0).toLocaleString('en-IN');
  }
}
