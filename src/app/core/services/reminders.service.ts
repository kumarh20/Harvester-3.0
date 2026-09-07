import { computed, Injectable, signal } from '@angular/core';
import { FirestoreService } from '../../services/firestore/firestore-service';

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
  status: 'pending' | 'completed' | 'cancelled';
  movedToRecordId?: string;
  createdAt?: any;
  uid?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RemindersService {
  private remindersSignal = signal<Reminder[]>([]);
  reminders = computed(() => this.remindersSignal());

  isLoading = signal<boolean>(false);

  // Active/Pending reminders
  pendingReminders = computed(() => 
    this.remindersSignal().filter(r => r.status === 'pending')
  );

  // Today's scheduled reminders
  todayReminders = computed(() => 
    this.pendingReminders().filter(r => this.isToday(r.scheduledDate))
  );

  // Tomorrow's scheduled reminders
  tomorrowReminders = computed(() => 
    this.pendingReminders().filter(r => this.isTomorrow(r.scheduledDate))
  );

  // Upcoming (Future after today) reminders
  upcomingReminders = computed(() => 
    this.pendingReminders().filter(r => this.isFuture(r.scheduledDate))
  );

  constructor(private firestoreService: FirestoreService) {}

  /**
   * Load reminders from Firestore with localStorage fallback
   */
  async loadReminders(): Promise<void> {
    this.isLoading.set(true);
    try {
      const list = await this.firestoreService.getUserReminders();
      this.remindersSignal.set(list);
      try {
        localStorage.setItem('harvester_reminders_cache', JSON.stringify(list));
      } catch {
        // Ignore cache write error
      }
    } catch (e) {
      console.warn('Could not load reminders from Firestore, using cache:', e);
      try {
        const cached = localStorage.getItem('harvester_reminders_cache');
        if (cached) {
          this.remindersSignal.set(JSON.parse(cached));
        }
      } catch {
        // Ignore cache read error
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  refreshReminders(): void {
    this.loadReminders();
  }

  async addReminder(data: Omit<Reminder, 'id' | 'status'> & { status?: 'pending' | 'completed' | 'cancelled' }): Promise<any> {
    const total = (Number(data.landInAcres) || 0) * (Number(data.ratePerAcre) || 0);
    const reminderId = ('rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));
    const reminderData: Reminder = {
      ...data,
      id: reminderId,
      estimatedTotal: data.estimatedTotal ?? total,
      status: data.status || 'pending',
      createdAt: new Date().toISOString()
    };

    // Optimistically update signal & cache immediately
    this.remindersSignal.update(list => [reminderData, ...list.filter(r => r.id !== reminderId)]);
    try {
      localStorage.setItem('harvester_reminders_cache', JSON.stringify(this.remindersSignal()));
    } catch {}

    const res = await this.firestoreService.addReminder(reminderData);
    await this.loadReminders();
    return res;
  }

  async updateReminder(id: string, data: Partial<Reminder>): Promise<void> {
    if (data.landInAcres !== undefined || data.ratePerAcre !== undefined) {
      const existing = this.getReminderById(id);
      const acres = data.landInAcres ?? existing?.landInAcres ?? 0;
      const rate = data.ratePerAcre ?? existing?.ratePerAcre ?? 0;
      data.estimatedTotal = Math.round(acres * rate);
    }

    // Optimistically update signal & cache immediately
    this.remindersSignal.update(list => list.map(r => r.id === id ? { ...r, ...data } : r));
    try {
      localStorage.setItem('harvester_reminders_cache', JSON.stringify(this.remindersSignal()));
    } catch {}

    await this.firestoreService.updateReminder(id, data);
    await this.loadReminders();
  }

  async deleteReminder(id: string): Promise<void> {
    this.remindersSignal.update(list => list.filter(r => r.id !== id));
    try {
      localStorage.setItem('harvester_reminders_cache', JSON.stringify(this.remindersSignal()));
    } catch {}

    await this.firestoreService.deleteReminder(id);
  }

  async markAsCompleted(id: string, movedToRecordId?: string): Promise<void> {
    this.remindersSignal.update(list => list.map(r => r.id === id ? {
      ...r,
      status: 'completed',
      ...(movedToRecordId ? { movedToRecordId } : {})
    } : r));
    try {
      localStorage.setItem('harvester_reminders_cache', JSON.stringify(this.remindersSignal()));
    } catch {}

    await this.firestoreService.updateReminder(id, {
      status: 'completed',
      ...(movedToRecordId ? { movedToRecordId } : {})
    });
    await this.loadReminders();
  }

  getReminderById(id: string): Reminder | undefined {
    return this.remindersSignal().find(r => r.id === id);
  }

  getAllReminders(): Reminder[] {
    return this.remindersSignal();
  }

  /**
   * Get pending reminders for a specific farmer by phone or name
   */
  getRemindersForFarmer(phone?: string, name?: string): Reminder[] {
    const cleanPhone = phone?.replace(/\D/g, '').slice(-10);
    const cleanName = name?.trim().toLowerCase();

    return this.pendingReminders().filter(r => {
      const rPhone = r.contactNumber?.replace(/\D/g, '').slice(-10);
      const rName = r.farmerName?.trim().toLowerCase();
      if (cleanPhone && rPhone === cleanPhone) return true;
      if (cleanName && rName === cleanName) return true;
      return false;
    });
  }

  // ==========================================
  // Date Helpers
  // ==========================================

  parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const clean = dateStr.trim().replace(/\//g, '-');
    const parts = clean.split('-');
    if (parts.length === 3) {
      let y: number, m: number, d: number;
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      } else {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        y = parseInt(parts[2], 10);
      }
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const timestamp = Date.parse(dateStr);
    return isNaN(timestamp) ? null : new Date(timestamp);
  }

  isToday(dateStr: string): boolean {
    const d = this.parseDate(dateStr);
    if (!d) return false;
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  }

  isTomorrow(dateStr: string): boolean {
    const d = this.parseDate(dateStr);
    if (!d) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.getFullYear() === tomorrow.getFullYear() &&
           d.getMonth() === tomorrow.getMonth() &&
           d.getDate() === tomorrow.getDate();
  }

  isFuture(dateStr: string): boolean {
    const d = this.parseDate(dateStr);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    return target.getTime() > today.getTime();
  }

  isPast(dateStr: string): boolean {
    const d = this.parseDate(dateStr);
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    return target.getTime() < today.getTime();
  }
}
