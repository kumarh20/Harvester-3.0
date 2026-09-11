import { Record } from '../../core/models/record.model';
import { 
  ChartDataPoint, 
  SeasonChartDataPoint, 
  HarvesterStat, 
  RecoveryOverview, 
  DashboardStats,
  ChartMetricMode,
  DashboardDateFilter 
} from './dashboard.interface';
import { parseDate, normalizeDateToKey } from '../../core/utils/date.utils';

/**
 * Dashboard Pure Calculation and Formatting Helpers
 * Adheres to Single Responsibility Principle (SRP).
 */

export function calculateDashboardStats(records: Record[]): DashboardStats {
  if (!records || records.length === 0) {
    return {
      totalRecords: 0,
      totalLand: 0,
      totalPayment: 0,
      totalPending: 0,
      totalReceived: 0,
      settlementRate: 0
    };
  }

  let totalLand = 0;
  let totalPayment = 0;
  let totalPending = 0;

  for (const r of records) {
    totalLand += Number(r.landInAcres) || 0;
    totalPayment += Number(r.totalPayment) || 0;
    if (!r.markedAsPaid) {
      totalPending += Number(r.pendingAmount) || 0;
    }
  }

  const totalReceived = Math.max(0, totalPayment - totalPending);
  const settlementRate = totalPayment > 0 ? Math.round((totalReceived / totalPayment) * 100) : 0;

  return {
    totalRecords: records.length,
    totalLand: Math.round(totalLand * 100) / 100,
    totalPayment: Math.round(totalPayment),
    totalPending: Math.round(totalPending),
    totalReceived: Math.round(totalReceived),
    settlementRate
  };
}

export function calculateRecoveryOverview(records: Record[], dueTodayAmount: number): RecoveryOverview {
  let totalBilled = 0;
  let totalPending = 0;
  let totalAcres = 0;

  if (records && records.length > 0) {
    for (const r of records) {
      totalBilled += Number(r.totalPayment) || 0;
      totalAcres += Number(r.landInAcres) || 0;
      if (!r.markedAsPaid) {
        totalPending += Number(r.pendingAmount) || 0;
      }
    }
  }

  const totalCollected = Math.max(0, totalBilled - totalPending);
  const otherPending = Math.max(0, totalPending - dueTodayAmount);

  let recoveryPct = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
  let dueTodayPct = totalBilled > 0 ? (dueTodayAmount / totalBilled) * 100 : 0;
  let otherPendingPct = totalBilled > 0 ? (otherPending / totalBilled) * 100 : 0;

  const totalSegments = recoveryPct + dueTodayPct + otherPendingPct;
  if (totalSegments > 100 && totalSegments > 0) {
    recoveryPct = (recoveryPct / totalSegments) * 100;
    dueTodayPct = (dueTodayPct / totalSegments) * 100;
    otherPendingPct = (otherPendingPct / totalSegments) * 100;
  }

  const radius = 62;
  const circumference = 2 * Math.PI * radius;

  const arc1Len = (recoveryPct / 100) * circumference;
  const arc2Len = (dueTodayPct / 100) * circumference;
  const arc3Len = (otherPendingPct / 100) * circumference;

  const dashArray1 = `${arc1Len.toFixed(1)} ${(circumference - arc1Len).toFixed(1)}`;
  const dashOffset1 = 0;

  const dashArray2 = `${arc2Len.toFixed(1)} ${(circumference - arc2Len).toFixed(1)}`;
  const dashOffset2 = -arc1Len;

  const dashArray3 = `${arc3Len.toFixed(1)} ${(circumference - arc3Len).toFixed(1)}`;
  const dashOffset3 = -(arc1Len + arc2Len);

  const strokeDashoffset = circumference - (recoveryPct / 100) * circumference;

  return {
    totalBilled: Math.round(totalBilled),
    totalCollected: Math.round(totalCollected),
    totalPending: Math.round(totalPending),
    dueTodayAmount: Math.round(dueTodayAmount),
    totalAcres: Math.round(totalAcres * 100) / 100,
    recoveryPercentage: Math.round(recoveryPct),
    pendingPercentage: Math.round(otherPendingPct),
    dueTodayPercentage: Math.round(dueTodayPct),
    circumference,
    strokeDashoffset,
    dashArray1,
    dashOffset1,
    dashArray2,
    dashOffset2,
    dashArray3,
    dashOffset3,
    seg1Pct: Math.round(recoveryPct),
    seg2Pct: Math.round(dueTodayPct),
    seg3Pct: Math.round(otherPendingPct)
  };
}

export function buildDailyTimelineChart(
  records: Record[], 
  metric: ChartMetricMode, 
  isHindi: boolean
): ChartDataPoint[] {
  if (!records || records.length === 0) return [];

  const dateMap = new Map<string, { date: Date; acres: number; revenue: number; collected: number; pending: number; count: number }>();

  for (const r of records) {
    const parsed = parseDate(r.date);
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
}
