import { DashboardDateFilter } from './dashboard.interface';

/**
 * Dashboard Constants & Options
 */
export const DASHBOARD_CONSTANTS = {
  DEFAULT_DATE_FILTER: 'all' as DashboardDateFilter,
  DEFAULT_CHART_METRIC: 'revenue' as const,
  DEFAULT_CHART_VIEW: 'daily' as const,
  
  FILTER_OPTIONS: [
    { key: 'all' as DashboardDateFilter, labelHi: 'सभी', labelEn: 'All' },
    { key: 'today' as DashboardDateFilter, labelHi: 'आज', labelEn: 'Today' },
    { key: 'yesterday' as DashboardDateFilter, labelHi: 'कल', labelEn: 'Yesterday' },
    { key: 'week' as DashboardDateFilter, labelHi: 'इस सप्ताह', labelEn: 'This Week' },
    { key: 'month' as DashboardDateFilter, labelHi: 'इस महीने', labelEn: 'This Month' },
    { key: 'dueToday' as DashboardDateFilter, labelHi: 'आज बकाया', labelEn: 'Due Today' },
    { key: 'custom' as DashboardDateFilter, labelHi: 'कस्टम', labelEn: 'Custom' }
  ],

  CHART_COLORS: {
    REVENUE_GRADIENT_START: '#10B981',
    REVENUE_GRADIENT_END: '#059669',
    ACRES_GRADIENT_START: '#3B82F6',
    ACRES_GRADIENT_END: '#2563EB',
    PENDING_COLOR: '#EF4444',
    PAID_COLOR: '#10B981'
  }
} as const;
