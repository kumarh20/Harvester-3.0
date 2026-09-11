import { Reminder, ReminderStatus } from '../../core/models/reminder.model';

/**
 * Reminders Feature Specific Interfaces and Types
 * Adheres to Interface Segregation Principle (ISP).
 */

export type ReminderTabFilter = 'today' | 'tomorrow' | 'upcoming' | 'all' | 'custom';

export interface ReminderFormData {
  farmerName: string;
  contactNumber: string;
  scheduledDate: string;
  scheduledTime?: string;
  landInAcres: number;
  ratePerAcre: number;
  estimatedTotal: number;
  harvester?: string;
  notes?: string;
}

export interface ReminderFilterState {
  searchQuery: string;
  activeTab: ReminderTabFilter;
  selectedDateFilter: string;
  selectedSeasonFilter: string;
  selectedHarvesterFilter: string;
}
