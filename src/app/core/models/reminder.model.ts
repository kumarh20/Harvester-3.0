/**
 * Application-level Cutting Reminder / Advance Booking Interface
 */
export type ReminderStatus = 'pending' | 'completed' | 'cancelled';

export interface Reminder {
  id: string;
  farmerName: string;
  contactNumber: string;
  scheduledDate: string; // DD/MM/YYYY or YYYY-MM-DD
  scheduledTime?: string; // HH:mm (e.g. 08:30)
  landInAcres: number;
  ratePerAcre: number;
  estimatedTotal: number;
  harvester?: string;
  notes?: string;
  status: ReminderStatus;
  movedToRecordId?: string;
  createdAt?: any;
  uid?: string;
  userPhone?: string;
}

export interface DayCalendarSlot {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  reminders: Reminder[];
  totalAcres: number;
}
