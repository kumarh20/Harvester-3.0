import { Record } from '../../core/models/record.model';
import { RecoveryOverview, HarvesterStat } from './reports.interface';

/**
 * Reports Calculation Helpers
 * Adheres to Single Responsibility Principle (SRP).
 */

export function calculateReportsRecovery(records: Record[], dueTodayAmount: number): RecoveryOverview {
  let totalBilled = 0;
  let totalPending = 0;

  for (const r of records) {
    totalBilled += Number(r.totalPayment) || 0;
    if (!r.markedAsPaid) {
      totalPending += Number(r.pendingAmount) || 0;
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
    recoveryPercentage: Math.round(recoveryPct),
    pendingPercentage: Math.round(otherPendingPct),
    dueTodayPercentage: Math.round(dueTodayPct),
    radius,
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
