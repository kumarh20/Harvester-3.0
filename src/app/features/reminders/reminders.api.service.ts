import { Injectable, inject } from '@angular/core';
import { FirestoreService } from '../../services/firestore/firestore-service';
import { Reminder } from '../../core/models/reminder.model';

/**
 * Reminders API Service
 * Exclusively handles API/Firestore CRUD for cutting bookings/reminders.
 */
@Injectable({
  providedIn: 'root'
})
export class RemindersApiService {
  private firestoreService = inject(FirestoreService);

  async fetchReminders(): Promise<Reminder[]> {
    return this.firestoreService.getUserReminders();
  }

  async createReminder(reminder: Omit<Reminder, 'id'>): Promise<{ id: string }> {
    return this.firestoreService.addReminder(reminder);
  }

  async updateReminder(id: string, reminder: Partial<Reminder>): Promise<void> {
    return this.firestoreService.updateReminder(id, reminder);
  }

  async deleteReminder(id: string): Promise<void> {
    return this.firestoreService.deleteReminder(id);
  }
}
