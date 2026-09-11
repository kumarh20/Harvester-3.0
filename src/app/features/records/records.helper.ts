import { Record } from '../../core/models/record.model';
import { Reminder } from '../../core/models/reminder.model';
import { GroupedRecords, FarmerLedgerSummary } from './records.interface';
import { parseDate, formatDateDisplay } from '../../core/utils/date.utils';
import { formatIndianCurrency } from '../../core/utils/number.utils';

/**
 * Records Helper Functions
 * Adheres to Single Responsibility Principle (SRP).
 */

export function groupRecordsByDateList(records: Record[], isHindi: boolean): GroupedRecords[] {
  if (!records || records.length === 0) return [];

  const map = new Map<string, { dateLabel: string; date: string; records: Record[] }>();

  for (const record of records) {
    const d = parseDate(record.date);
    const dateKey = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : (record.date || 'Unknown');

    const dateLabel = formatDateDisplay(record.date);

    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateLabel,
        date: record.date,
        records: []
      });
    }

    map.get(dateKey)!.records.push(record);
  }

  // Sort groups descending by date key
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, group]) => group);
}

export function computeFarmerLedgerSummary(
  farmerName: string,
  farmerPhone: string,
  records: Record[],
  reminders: Reminder[]
): FarmerLedgerSummary {
  let totalAcres = 0;
  let totalBilled = 0;
  let totalPaid = 0;
  let totalPending = 0;

  for (const r of records) {
    totalAcres += Number(r.landInAcres) || 0;
    const billed = Number(r.totalPayment) || 0;
    const pending = r.markedAsPaid ? 0 : (Number(r.pendingAmount) || 0);
    const paid = billed - pending;

    totalBilled += billed;
    totalPending += pending;
    totalPaid += paid;
  }

  return {
    farmerName,
    contactNumber: farmerPhone,
    totalAcres: Math.round(totalAcres * 100) / 100,
    totalBilled: Math.round(totalBilled),
    totalPaid: Math.round(totalPaid),
    totalPending: Math.round(totalPending),
    recordsCount: records.length,
    remindersCount: reminders.length,
    records,
    reminders
  };
}

export function formatFarmerWhatsAppBill(
  farmerName: string,
  record: Record,
  companyName: string
): string {
  const isPaid = record.markedAsPaid || (Number(record.pendingAmount) || 0) <= 0;
  const statusStr = isPaid ? '✅ पूर्ण भुगतान (Paid)' : '⏳ बकाया राशि (Pending)';

  return (
    `*🌾 ${companyName || 'Harvester Service'} - कटाई रसीद*\n\n` +
    `👤 *किसान:* ${farmerName}\n` +
    `📅 *दिनांक:* ${record.date}\n` +
    `🚜 *मशीन:* ${record.harvester || 'Harvester 1'}\n` +
    `🌱 *कुल रकबा:* ${record.landInAcres} एकड़\n` +
    `💵 *दर:* ₹${record.ratePerAcre}/एकड़\n` +
    `💰 *कुल बिल:* ₹${record.totalPayment}\n` +
    `💳 *मौके पर भुगतान:* ₹${record.paidOnSight}\n` +
    `⚠️ *शेष बकाया:* ₹${record.markedAsPaid ? 0 : record.pendingAmount}\n` +
    `📊 *स्थिति:* ${statusStr}\n\n` +
    `धन्यवाद! 🙏`
  );
}
