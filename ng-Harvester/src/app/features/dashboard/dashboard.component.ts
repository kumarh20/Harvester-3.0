import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { RecordsService, Record } from '../../core/services/records.service';

type PeriodType = 'today' | 'week' | 'month' | 'all';

interface Stats {
  totalRecords: number;
  totalLand: number;
  totalPayment: number;
  totalPending: number;
  avgLandPerRecord: number;
  avgPaymentPerRecord: number;
  averageRate: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class DashboardComponent implements OnInit {

  selectedPeriod = signal<PeriodType>('all');
  todayCount = signal(0);
  weekCount = signal(0);
  monthCount = signal(0);
  allCount = signal(0);

  filteredRecords = computed(() => {
    const period = this.selectedPeriod();
    const records = this.recordsService.records();
    return this.getFilteredRecordsByPeriod(period, records);
  });

  stats = computed(() => {
    return this.calculateStats(this.filteredRecords());
  });

  constructor(public recordsService: RecordsService) {
    // Sample data initialization (if needed)
    // Uncomment below if you want to initialize with sample data
    /*
    const sampleRecords: Record[] = [
      {
        id: '1',
        farmerName: 'राजेश कुमार',
        contactNumber: '9876543210',
        date: '31-12-2025',
        landInAcres: 5,
        ratePerAcre: 2500,
        totalPayment: 12500,
        nakadPaid: 5000,
        pendingAmount: 7500,
        fullPaymentDate: ''
      },
      {
        id: '2',
        farmerName: 'प्रिया शर्मा',
        contactNumber: '8765432109',
        date: '30-12-2025',
        landInAcres: 3,
        ratePerAcre: 2500,
        totalPayment: 7500,
        nakadPaid: 7500,
        pendingAmount: 0,
        fullPaymentDate: '30-12-2025'
      },
      {
        id: '3',
        farmerName: 'अमित सिंह',
        contactNumber: '7654321098',
        date: '25-12-2025',
        landInAcres: 2.5,
        ratePerAcre: 2500,
        totalPayment: 6250,
        nakadPaid: 3000,
        pendingAmount: 3250,
        fullPaymentDate: ''
      },
      {
        id: '4',
        farmerName: 'विजय पटेल',
        contactNumber: '6543210987',
        date: '20-12-2025',
        landInAcres: 4,
        ratePerAcre: 2500,
        totalPayment: 10000,
        nakadPaid: 5000,
        pendingAmount: 5000,
        fullPaymentDate: ''
      },
      {
        id: '5',
        farmerName: 'सुनीता गुप्ता',
        contactNumber: '5432109876',
        date: '10-12-2025',
        landInAcres: 2,
        ratePerAcre: 2500,
        totalPayment: 5000,
        nakadPaid: 5000,
        pendingAmount: 0,
        fullPaymentDate: '10-12-2025'
      }
    ];
    this.recordsService.setRecords(sampleRecords);
    */
    this.updatePeriodCounts();
  }

  ngOnInit(): void {
    this.updatePeriodCounts();
    
    // Update counts whenever records change
    // This ensures period counts update after adding/deleting records
    const intervalId = setInterval(() => {
      this.updatePeriodCounts();
    }, 1000);
  }

  selectPeriod(period: PeriodType): void {
    this.selectedPeriod.set(period);
  }

  private parseDate(dateString: string): Date | null {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  }

  private getFilteredRecordsByPeriod(period: PeriodType, records: Record[]): Record[] {
    if (period === 'all') return records;

    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return records.filter(record => {
      const recordDate = this.parseDate(record.date);
      if (!recordDate) return false;

      switch (period) {
        case 'today':
          return recordDate.toDateString() === today;
        case 'week':
          return recordDate >= weekAgo;
        case 'month':
          return recordDate >= monthAgo;
        default:
          return true;
      }
    });
  }

  private updatePeriodCounts(): void {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const records = this.recordsService.records();

    const todayRecords = records
      .filter(record => {
        const recordDate = this.parseDate(record.date);
        return recordDate && recordDate.toDateString() === today;
      })
      .length;

    const weekRecords = records
      .filter(record => {
        const recordDate = this.parseDate(record.date);
        return recordDate && recordDate >= weekAgo;
      })
      .length;

    const monthRecords = records
      .filter(record => {
        const recordDate = this.parseDate(record.date);
        return recordDate && recordDate >= monthAgo;
      })
      .length;

    this.todayCount.set(todayRecords);
    this.weekCount.set(weekRecords);
    this.monthCount.set(monthRecords);
    this.allCount.set(records.length);
  }

  private calculateStats(filteredRecords: Record[]): Stats {
    const totalRecords = filteredRecords.length;

    const totalLand = filteredRecords.reduce((sum, record) => {
      return sum + (record.landInAcres || 0);
    }, 0);

    const totalPayment = filteredRecords.reduce((sum, record) => {
      return sum + (record.totalPayment || 0);
    }, 0);

    const totalPending = filteredRecords.reduce((sum, record) => {
      return sum + (record.pendingAmount || 0);
    }, 0);

    const avgLandPerRecord = totalRecords > 0 ? totalLand / totalRecords : 0;
    const avgPaymentPerRecord = totalRecords > 0 ? totalPayment / totalRecords : 0;
    const averageRate = totalRecords > 0
      ? filteredRecords.reduce((sum, record) => sum + (record.ratePerAcre || 0), 0) / totalRecords
      : 0;

    return {
      totalRecords,
      totalLand,
      totalPayment,
      totalPending,
      avgLandPerRecord,
      avgPaymentPerRecord,
      averageRate
    };
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('hi-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number, decimals: number = 2): string {
    return num.toFixed(decimals);
  }
}
