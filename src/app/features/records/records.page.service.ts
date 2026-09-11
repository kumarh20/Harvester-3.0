import { Injectable, inject, signal, computed } from '@angular/core';
import { RecordsService } from '../../core/services/records.service';
import { RemindersService } from '../../core/services/reminders.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { SeasonService } from '../../core/services/season.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslationService } from '../../shared/services/translation.service';
import { Record } from '../../core/models/record.model';
import { 
  RecordDateFilterOption, 
  RecordPaymentFilterOption, 
  GroupedRecords,
  FarmerLedgerSummary 
} from './records.interface';
import { groupRecordsByDateList, computeFarmerLedgerSummary } from './records.helper';
import { parseDate, normalizeDateToKey } from '../../core/utils/date.utils';

/**
 * Records Page Service
 * Manages search, filter selection, farmer ledger grouping, and computed lists.
 */
@Injectable({
  providedIn: 'root'
})
export class RecordsPageService {
  private recordsService = inject(RecordsService);
  private remindersService = inject(RemindersService);
  private seasonService = inject(SeasonService);
  private harvesterService = inject(HarvesterService);
  private notificationService = inject(NotificationService);
  private translationService = inject(TranslationService);

  public searchQuery = signal<string>('');
  public selectedDateFilter = signal<RecordDateFilterOption>('today');
  public selectedPaymentFilter = signal<RecordPaymentFilterOption>('all');
  public selectedSeasonFilter = signal<string>('all');
  public selectedHarvesterFilter = signal<string>('all');

  public customStartDate = signal<string>('');
  public customEndDate = signal<string>('');

  public selectedFarmer = signal<{ name: string; phone: string } | null>(null);

  public rawRecords = computed(() => this.recordsService.records());
  public isLoading = computed(() => this.recordsService.isLoading());

  /**
   * Filtered records based on all active criteria
   */
  public filteredRecords = computed<Record[]>(() => {
    const all = this.rawRecords();
    const query = this.searchQuery().trim().toLowerCase();
    const dateFilter = this.selectedDateFilter();
    const payFilter = this.selectedPaymentFilter();
    const seasonFilter = this.selectedSeasonFilter();
    const harvesterFilter = this.selectedHarvesterFilter();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const oneDayMs = 24 * 60 * 60 * 1000;

    return all.filter(record => {
      // 1. Search Query
      if (query) {
        const nameMatch = (record.farmerName || '').toLowerCase().includes(query);
        const phoneMatch = (record.contactNumber || '').toLowerCase().includes(query);
        const harvMatch = (record.harvester || '').toLowerCase().includes(query);
        if (!nameMatch && !phoneMatch && !harvMatch) return false;
      }

      // 2. Season Filter
      if (seasonFilter !== 'all' && seasonFilter) {
        const s = this.seasonService.getSeasonForRecord(record);
        if (s?.id !== seasonFilter && record.seasonId !== seasonFilter) return false;
      }

      // 3. Harvester Filter
      if (harvesterFilter !== 'all' && harvesterFilter) {
        const h = (record.harvester || 'Harvester 1').trim().toLowerCase();
        if (h !== harvesterFilter.trim().toLowerCase()) return false;
      }

      // 4. Payment Status Filter
      if (payFilter === 'completed') {
        const isCompleted = record.markedAsPaid || (Number(record.pendingAmount) || 0) <= 0;
        if (!isCompleted) return false;
      } else if (payFilter === 'pending') {
        const isPending = !record.markedAsPaid && (Number(record.pendingAmount) || 0) > 0;
        if (!isPending) return false;
      }

      // 5. Date Filter
      if (dateFilter === 'dueToday') {
        if (record.markedAsPaid || (Number(record.pendingAmount) || 0) <= 0 || !record.fullPaymentDate) return false;
        return normalizeDateToKey(record.fullPaymentDate) === todayKey;
      }

      if (dateFilter === 'all') return true;

      const recDate = parseDate(record.date);
      if (!recDate) return true;

      const recordDay = new Date(recDate.getFullYear(), recDate.getMonth(), recDate.getDate()).getTime();

      switch (dateFilter) {
        case 'today':
          return recordDay === today.getTime();
        case 'yesterday':
          return recordDay === today.getTime() - oneDayMs;
        case 'week': {
          const dayOfWeek = today.getDay();
          const startOfWeek = new Date(today.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * oneDayMs).getTime();
          return recordDay >= startOfWeek && recordDay <= today.getTime() + oneDayMs - 1;
        }
        case 'month': {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
          return recordDay >= startOfMonth && recordDay <= endOfMonth;
        }
        case 'custom': {
          const startStr = this.customStartDate();
          const endStr = this.customEndDate();
          if (!startStr && !endStr) return true;
          const startParsed = startStr ? parseDate(startStr) : null;
          const endParsed = endStr ? parseDate(endStr) : null;
          const startDay = startParsed ? new Date(startParsed.getFullYear(), startParsed.getMonth(), startParsed.getDate()).getTime() : -Infinity;
          const endDay = endParsed ? new Date(endParsed.getFullYear(), endParsed.getMonth(), endParsed.getDate()).getTime() + oneDayMs - 1 : Infinity;
          return recordDay >= startDay && recordDay <= endDay;
        }
        default:
          return true;
      }
    });
  });

  /**
   * Grouped records by date for UI display
   */
  public groupedRecords = computed<GroupedRecords[]>(() => {
    return groupRecordsByDateList(
      this.filteredRecords(),
      this.translationService.getCurrentLanguage() === 'hi'
    );
  });

  /**
   * Selected Farmer Ledger Details
   */
  public selectedFarmerLedger = computed<FarmerLedgerSummary | null>(() => {
    const farmer = this.selectedFarmer();
    if (!farmer) return null;

    const farmerRecords = this.rawRecords().filter(r => {
      const matchName = (r.farmerName || '').trim().toLowerCase() === farmer.name.trim().toLowerCase();
      const matchPhone = !farmer.phone || (r.contactNumber || '').trim() === farmer.phone.trim();
      return matchName || matchPhone;
    });

    const farmerReminders = this.remindersService.reminders().filter(rem => {
      const matchName = (rem.farmerName || '').trim().toLowerCase() === farmer.name.trim().toLowerCase();
      const matchPhone = !farmer.phone || (rem.contactNumber || '').trim() === farmer.phone.trim();
      return matchName || matchPhone;
    });

    return computeFarmerLedgerSummary(farmer.name, farmer.phone, farmerRecords, farmerReminders);
  });

  public async reloadRecords(): Promise<void> {
    await this.recordsService.loadRecords();
  }
}
