import { AppNotification, NotificationType } from '../../core/models/notification.model';

/**
 * Notifications Feature Interfaces
 * Adheres to Interface Segregation Principle (ISP).
 */

export type NotificationFilterTab = 'all' | 'unread' | 'reminder' | 'due';

export interface NotificationTabOption {
  key: NotificationFilterTab;
  labelHi: string;
  labelEn: string;
}
