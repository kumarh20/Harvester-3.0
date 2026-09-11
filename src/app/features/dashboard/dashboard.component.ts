import { Component, OnInit, signal, computed, effect, ViewEncapsulation, inject } from '@angular/core';
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
import { UserService } from '../../services/user/user-service';
import { DashboardSkeletonComponent } from '../../shared/components/skeleton/dashboard-skeleton/dashboard-skeleton.component';
import { FilterDrawerComponent } from '../../shared/components/filter-drawer/filter-drawer.component';
import { DateTimePickerDialogComponent, DateTimePickerResult } from '../../shared/components/date-time-picker-dialog/date-time-picker-dialog.component';
import { AppNavigationService } from '../../core/services/app-navigation.service';
import { parseDate, formatDateDisplay, formatDateForInput, normalizeDateToKey } from '../../core/utils/date.utils';
import { formatIndianCurrency, formatIndianNumber } from '../../core/utils/number.utils';
import { 
  DashboardDateFilter, 
  ChartMetricMode, 
  ChartViewMode, 
  ChartDataPoint, 
  SeasonChartDataPoint, 
  HarvesterStat, 
  RecoveryOverview 
} from './dashboard.interface';
import { DASHBOARD_CONSTANTS } from './dashboard.constants';

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
    DashboardSkeletonComponent,
    FilterDrawerComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit {
  public userService = inject(UserService);

  // Business / Company Name for stylish hero header
  companyName = computed(() => {
    const profile = this.userService.userProfile();
    const busName = profile?.businessName?.trim();
    if (busName) return busName;

    const uid = profile?.uid;
    if (uid && typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`user_business_name_${uid}`);
      if (cached?.trim()) return cached.trim();
    }

    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_business_name_')) {
          const val = localStorage.getItem(key);
          if (val?.trim()) return val.trim();
        }
      }
    }

    return 'Harvester Cutting Services';
  });

  // User Name for welcome back greeting
  userName = computed(() => {
    const profile = this.userService.userProfile();
    const name = profile?.name?.trim();
    if (name && name.toLowerCase() !== 'operator') return name;

    const uid = profile?.uid;
    if (uid && typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`user_name_${uid}`);
      if (cached?.trim() && cached.toLowerCase() !== 'operator') return cached.trim();
    }

    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_name_')) {
          const val = localStorage.getItem(key);
          if (val?.trim() && val.toLowerCase() !== 'operator') return val.trim();
        }
      }
    }

    return name || 'Operator';
  });

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
  yesterdayCount = signal(0);
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

  // Settlement due chip state
  private dismissedDueToken = signal<string | null>(
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('harvester_dismissed_due_chip') : null
  );

  /**
   * Generates a unique token based on current due status & latest notification.
   * If a new notification arrives or records change, this token automatically changes!
   */
  public currentDueToken = computed(() => {
    const summary = this.notificationService.dueTodaySummary();
    if (!summary || !summary.hasDueToday) return null;
    const notifs = this.notificationService.notifications();
    const latestDueNotif = notifs.find(n => n.type === 'settlement_due');
    const latestNotifKey = latestDueNotif ? `${latestDueNotif.id}_${latestDueNotif.isRead}` : 'none';
    const totalNotifsCount = notifs.length;
    return `${summary.dueRecords.length}_${summary.totalDueAmount}_${latestNotifKey}_${totalNotifsCount}`;
  });

  /**
   * Whether to show the compact settlement due chip.
   * Hides if:
   * - No due records today
   * - User clicked it / read the notification
   * - User dismissed (cut) this notification
   * Reappears automatically when a new notification / due arrival happens!
   */
  public showDueTodayChip = computed(() => {
    const summary = this.notificationService.dueTodaySummary();
    if (!summary || !summary.hasDueToday || this.notificationService.dueTodayCount() <= 0) {
      return false;
    }

    // Check if the current settlement notification is already read
    const notifs = this.notificationService.notifications();
    const dueNotifs = notifs.filter(n => n.type === 'settlement_due');
    if (dueNotifs.length > 0 && dueNotifs.every(n => n.isRead)) {
      return false;
    }

    const token = this.currentDueToken();
    if (!token) return false;

    // If dismissed token matches current token, keep it hidden until next notification / token change
    if (this.dismissedDueToken() === token) {
      return false;
    }

    return true;
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

  activeSeasonStats = computed(() => {
    const defaultSeason = this.seasonService.defaultSeason();
    if (!defaultSeason) return { totalRecords: 0, totalLand: 0, totalPayment: 0, totalPending: 0, averageRate: 0, avgLandPerRecord: 0 };
    const seasonRecords = this.recordsService.records().filter(r => {
      const s = this.seasonService.getSeasonForRecord(r);
      return s?.id === defaultSeason.id || r.seasonId === defaultSeason.id;
    });
    return this.calculateStats(seasonRecords);
  });

  activeSeasonName = computed(() => {
    return this.seasonService.defaultSeason()?.name || (this.translationService.getCurrentLanguage() === 'hi' ? 'वर्तमान सीज़न' : 'Current Season');
  });

  totalSeasonsCount = computed(() => {
    return this.seasonService.seasons().length;
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
    return formatDateDisplay(dateStr);
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

  handleHeroBgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (!target) return;
    if (!target.getAttribute('data-tried')) {
      target.setAttribute('data-tried', '1');
      target.src = './assets/slides/harvester-slide-6.png';
    }
  }

  goToAddNew(): void {
    this.router.navigate(['/add-new']);
  }

  goToRecords(): void {
    this.router.navigate(['/records']);
  }

  goToGraphReports(): void {
    this.router.navigate(['/reports']);
  }

  goToSeasonReports(): void {
    this.router.navigate(['/season-reports']);
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

  /**
   * Navigate to records with 'dueToday' filter when clicking the chip,
   * mark settlement notifications as read so it disappears from dashboard.
   */
  openDueTodayRecords(event?: Event): void {
    if (event) event.stopPropagation();

    // Mark today's settlement notifications as read in notification service
    const dueNotifs = this.notificationService.notifications().filter(n => n.type === 'settlement_due');
    dueNotifs.forEach(n => this.notificationService.markAsRead(n.id));

    // Store dismissal token so it stays hidden after reading
    const token = this.currentDueToken();
    if (token) {
      this.dismissedDueToken.set(token);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('harvester_dismissed_due_chip', token);
      }
    }

    // Navigate to records with dueToday filter
    this.router.navigate(['/records'], {
      queryParams: { filter: 'dueToday' }
    });
  }

  /**
   * Dismiss the chip when clicking the small cut button (X).
   * Reappears when the next notification arrives!
   */
  dismissDueChip(event: Event): void {
    event.stopPropagation();
    const token = this.currentDueToken();
    if (token) {
      this.dismissedDueToken.set(token);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('harvester_dismissed_due_chip', token);
      }
    }
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

  selectDateOption(filter: DashboardDateFilter | string): void {
    this.selectedDateFilter.set(filter as DashboardDateFilter);
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
    return formatDateForInput(date);
  }

  normalizeDateToKey(dateVal: any): string | null {
    return normalizeDateToKey(dateVal);
  }

  /**
   * Parse record date string to Date.
   */
  private parseDate(dateString: string): Date | null {
    return parseDate(dateString);
  }

  private updatePeriodCounts(): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterdayStart = todayStart - oneDayMs;
    const weekStart = todayStart - (7 * oneDayMs);
    const monthStart = todayStart - (30 * oneDayMs);
    const todayEnd = todayStart + oneDayMs - 1;

    const records = this.recordsService.records();

    let today = 0;
    let yesterday = 0;
    let week = 0;
    let month = 0;

    for (const record of records) {
      const parsed = this.parseDate(record.date);
      if (!parsed) continue;
      const time = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
      if (time === todayStart) today++;
      if (time === yesterdayStart) yesterday++;
      if (time >= weekStart && time <= todayEnd) week++;
      if (time >= monthStart && time <= todayEnd) month++;
    }

    this.todayCount.set(today);
    this.yesterdayCount.set(yesterday);
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
