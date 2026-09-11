import { Injectable, inject, signal, computed } from '@angular/core';
import { RecordsService } from '../../core/services/records.service';
import { SeasonService } from '../../core/services/season.service';
import { HarvesterService } from '../../core/services/harvester.service';
import { ChartViewMode, ChartMetricMode } from './reports.interface';

/**
 * Reports Page Service
 * Manages presentation state for the analytics and reports screen.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportsPageService {
  private recordsService = inject(RecordsService);
  private seasonService = inject(SeasonService);
  private harvesterService = inject(HarvesterService);

  public chartViewMode = signal<ChartViewMode>('daily');
  public chartMetric = signal<ChartMetricMode>('revenue');
  public machineChartMetric = signal<ChartMetricMode>('acres');

  public selectedDateFilter = signal<string>('all');
  public selectedSeasonFilter = signal<string>('all');
  public selectedHarvesterFilter = signal<string>('all');

  public allRecords = computed(() => this.recordsService.records());
  public isLoading = computed(() => this.recordsService.isLoading());
}
