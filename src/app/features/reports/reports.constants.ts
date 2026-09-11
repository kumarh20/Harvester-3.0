import { ChartMetricMode, ChartViewMode } from './reports.interface';

/**
 * Reports Feature Constants
 */
export const REPORTS_CONSTANTS = {
  DEFAULT_METRIC: 'revenue' as ChartMetricMode,
  DEFAULT_VIEW: 'daily' as ChartViewMode,
  
  METRICS: [
    { key: 'revenue' as ChartMetricMode, labelHi: 'कमाई (₹)', labelEn: 'Revenue (₹)' },
    { key: 'acres' as ChartMetricMode, labelHi: 'रकबा (एकड़)', labelEn: 'Acres' }
  ],

  VIEW_MODES: [
    { key: 'daily' as ChartViewMode, labelHi: 'दैनिक (Daily)', labelEn: 'Daily' },
    { key: 'season' as ChartViewMode, labelHi: 'सीज़न (Season)', labelEn: 'Season' }
  ]
} as const;
