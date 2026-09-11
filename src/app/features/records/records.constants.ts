import { RecordDateFilterOption, RecordPaymentFilterOption } from './records.interface';

/**
 * Records Feature Constants
 */
export const RECORDS_CONSTANTS = {
  DEFAULT_DATE_FILTER: 'today' as RecordDateFilterOption,
  DEFAULT_PAYMENT_FILTER: 'all' as RecordPaymentFilterOption,
  
  DATE_FILTER_OPTIONS: [
    { key: 'today' as RecordDateFilterOption, labelHi: 'आज', labelEn: 'Today' },
    { key: 'yesterday' as RecordDateFilterOption, labelHi: 'कल', labelEn: 'Yesterday' },
    { key: 'week' as RecordDateFilterOption, labelHi: 'इस सप्ताह', labelEn: 'This Week' },
    { key: 'month' as RecordDateFilterOption, labelHi: 'इस महीने', labelEn: 'This Month' },
    { key: 'dueToday' as RecordDateFilterOption, labelHi: 'आज बकाया', labelEn: 'Due Today' },
    { key: 'all' as RecordDateFilterOption, labelHi: 'सभी', labelEn: 'All' },
    { key: 'custom' as RecordDateFilterOption, labelHi: 'कस्टम', labelEn: 'Custom' }
  ],

  PAYMENT_FILTER_OPTIONS: [
    { key: 'all' as RecordPaymentFilterOption, labelHi: 'सभी', labelEn: 'All' },
    { key: 'pending' as RecordPaymentFilterOption, labelHi: 'बकाया', labelEn: 'Pending' },
    { key: 'completed' as RecordPaymentFilterOption, labelHi: 'पूर्ण भुगतान', labelEn: 'Completed' }
  ]
} as const;
