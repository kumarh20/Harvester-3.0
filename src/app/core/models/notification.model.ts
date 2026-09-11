export type NotificationType = 'reminder' | 'settlement_due' | 'cutting_status' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number; // Date.now() timestamp
  isRead: boolean;
  
  // Navigation / Deep link payload
  route?: string;
  queryParams?: { [key: string]: any };
  
  // Context metadata
  farmerName?: string;
  contactNumber?: string;
  amount?: number;
  acres?: number;
  dateKey?: string; // YYYY-MM-DD
  entityId?: string; // reminder id or record id
}
