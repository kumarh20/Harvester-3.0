/**
 * Reports Feature Specific Interfaces and Types
 * Adheres to Interface Segregation Principle (ISP).
 */

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
