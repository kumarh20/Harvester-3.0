/**
 * Unified Analytics and Reporting Data Interfaces across Dashboard, Reports, and Season Reports.
 */

export interface ChartDataPoint {
  label: string;
  count: number;
  totalAcres: number;
  revenue: number;
  paidAmount: number;
  pendingAmount: number;
  dateKey: string;
  isToday?: boolean;
}

export interface SeasonChartDataPoint {
  seasonId: string;
  seasonName: string;
  count: number;
  totalAcres: number;
  revenue: number;
  paidAmount: number;
  pendingAmount: number;
  active: boolean;
}

export interface HarvesterStat {
  machineName: string;
  recordsCount: number;
  totalAcres: number;
  totalEarnings: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface RecoveryOverview {
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  recoveryRate: number;
}

export interface DashboardStats {
  totalAcres: number;
  totalFarmers: number;
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
}
