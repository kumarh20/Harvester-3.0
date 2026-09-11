import { ReminderTabFilter } from './reminders.interface';

/**
 * Reminders Feature Constants
 */
export const REMINDERS_CONSTANTS = {
  DEFAULT_TAB: 'all' as ReminderTabFilter,
  DEFAULT_RATE_PER_ACRE: 2500,
  DEFAULT_ACRES: 1,

  TABS: [
    { key: 'all' as ReminderTabFilter, labelHi: 'सभी बुकिंग', labelEn: 'All Bookings' },
    { key: 'today' as ReminderTabFilter, labelHi: 'आज', labelEn: 'Today' },
    { key: 'tomorrow' as ReminderTabFilter, labelHi: 'कल', labelEn: 'Tomorrow' },
    { key: 'upcoming' as ReminderTabFilter, labelHi: 'आगामी', labelEn: 'Upcoming' },
    { key: 'custom' as ReminderTabFilter, labelHi: 'कस्टम', labelEn: 'Custom' }
  ]
} as const;
