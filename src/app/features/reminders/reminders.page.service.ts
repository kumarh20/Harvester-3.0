import { Injectable, inject, signal, computed } from '@angular/core';
import { RemindersService } from '../../core/services/reminders.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { SeasonService } from '../../core/services/season.service';
import { Reminder } from '../../core/models/reminder.model';
import { ReminderTabFilter } from './reminders.interface';
import { parseDate } from '../../core/utils/date.utils';

/**
 * Reminders Page Service
 * Manages presentation state, tab filters, and calendar calculations.
 */
@Injectable({
  providedIn: 'root'
})
export class RemindersPageService {
  private remindersService = inject(RemindersService);
  private harvesterService = inject(HarvesterService);
  private seasonService = inject(SeasonService);

  public searchQuery = signal<string>('');
  public activeTab = signal<ReminderTabFilter>('all');
  public selectedHarvesterFilter = signal<string>('all');
  public selectedSeasonFilter = signal<string>('all');

  public customFilterDate = signal<string>('');
  public customStartDate = signal<string>('');
  public customEndDate = signal<string>('');

  public allReminders = computed(() => this.remindersService.reminders());
  public isLoading = computed(() => this.remindersService.isLoading());

  public todayReminders = computed(() => this.remindersService.todayReminders());
  public tomorrowReminders = computed(() => this.remindersService.tomorrowReminders());
  public upcomingReminders = computed(() => this.remindersService.upcomingReminders());

  /**
   * Filtered reminders according to active tab, search, harvester and date
   */
  public filteredReminders = computed<Reminder[]>(() => {
    let list = this.allReminders();
    const tab = this.activeTab();
    const query = this.searchQuery().trim().toLowerCase();
    const harv = this.selectedHarvesterFilter();

    if (tab === 'today') {
      list = this.todayReminders();
    } else if (tab === 'tomorrow') {
      list = this.tomorrowReminders();
    } else if (tab === 'upcoming') {
      list = this.upcomingReminders();
    }

    if (query) {
      list = list.filter(r => 
        (r.farmerName || '').toLowerCase().includes(query) ||
        (r.contactNumber || '').toLowerCase().includes(query) ||
        (r.harvester || '').toLowerCase().includes(query) ||
        (r.notes || '').toLowerCase().includes(query)
      );
    }

    if (harv !== 'all' && harv) {
      list = list.filter(r => (r.harvester || 'Harvester 1').trim().toLowerCase() === harv.trim().toLowerCase());
    }

    return list;
  });

  public async reloadReminders(): Promise<void> {
    await this.remindersService.loadReminders();
  }
}
