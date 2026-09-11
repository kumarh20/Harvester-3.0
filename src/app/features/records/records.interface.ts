import { Record } from '../../core/models/record.model';
import { Reminder } from '../../core/models/reminder.model';

/**
 * Records Feature Specific Interfaces and Types
 * Adheres to Interface Segregation Principle (ISP).
 */

export type RecordDateFilterOption = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all' | 'dueToday';
export type RecordPaymentFilterOption = 'all' | 'completed' | 'pending';

export interface GroupedRecords {
  dateLabel: string;
  date: string;
  records: Record[];
}

export interface FarmerLedgerSummary {
  farmerName: string;
  contactNumber: string;
  totalAcres: number;
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  recordsCount: number;
  remindersCount: number;
  records: Record[];
  reminders: Reminder[];
}

export interface SettlementModalData {
  record: Record;
  farmerName: string;
  pendingAmount: number;
  totalPayment: number;
  paidOnSight: number;
}
