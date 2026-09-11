import { Reminder } from '../../core/models/reminder.model';
import { parseDate } from '../../core/utils/date.utils';

/**
 * Reminders Pure Helpers
 * Adheres to Single Responsibility Principle (SRP).
 */

export function calculateEstimatedTotal(acres: number, rate: number): number {
  const safeAcres = Number(acres) || 0;
  const safeRate = Number(rate) || 0;
  return Math.round(safeAcres * safeRate);
}

export function formatWhatsAppReminderText(reminder: Reminder, companyName: string): string {
  const dateStr = reminder.scheduledDate || 'निर्धारित तिथि';
  const timeStr = reminder.scheduledTime ? ` (${reminder.scheduledTime})` : '';

  return (
    `*🚜 ${companyName || 'Harvester Service'} - कटाई बुकिंग रिमाइंडर*\n\n` +
    `नमस्ते *${reminder.farmerName}* जी,\n\n` +
    `आपकी हार्वेस्टर कटाई बुकिंग की जानकारी:\n` +
    `📅 *तारीख:* ${dateStr}${timeStr}\n` +
    `🌱 *रकबा:* ${reminder.landInAcres} एकड़\n` +
    `💵 *अनुमानित दर:* ₹${reminder.ratePerAcre}/एकड़\n` +
    `💰 *अनुमानित कुल राशि:* ₹${reminder.estimatedTotal}\n` +
    `🚜 *हार्वेस्टर मशीन:* ${reminder.harvester || 'Harvester 1'}\n\n` +
    `कृपया समय पर खेत तैयार रखें। धन्यवाद! 🙏`
  );
}
