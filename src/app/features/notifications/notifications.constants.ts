import { NotificationFilterTab, NotificationTabOption } from './notifications.interface';

/**
 * Notifications Feature Constants
 */
export const NOTIFICATIONS_CONSTANTS = {
  DEFAULT_FILTER: 'all' as NotificationFilterTab,
  
  FILTER_TABS: [
    { key: 'all' as NotificationFilterTab, labelHi: 'सभी', labelEn: 'All' },
    { key: 'unread' as NotificationFilterTab, labelHi: 'अपठित', labelEn: 'Unread' },
    { key: 'reminder' as NotificationFilterTab, labelHi: 'रिमाइंडर', labelEn: 'Reminders' },
    { key: 'due' as NotificationFilterTab, labelHi: 'बकाया', labelEn: 'Due Today' }
  ] as NotificationTabOption[]
} as const;
