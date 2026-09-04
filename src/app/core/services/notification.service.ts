import { Injectable, inject, signal } from '@angular/core';
import { RecordsService, Record } from './records.service';
import { TranslationService } from '../../shared/services/translation.service';
import { ToastService } from '../../shared/services/toast.service';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface DueSettlementSummary {
  dueRecords: Record[];
  totalDueAmount: number;
  farmersListText: string;
  hasDueToday: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private recordsService = inject(RecordsService);
  private translationService = inject(TranslationService);
  private toastService = inject(ToastService);

  public permissionGranted = signal<boolean>(false);
  public dueTodayCount = signal<number>(0);
  public dueTodaySummary = signal<DueSettlementSummary | null>(null);

  constructor() {
    this.checkPermissionStatus();
  }

  /**
   * Check whether system notification permission is granted
   */
  async checkPermissionStatus(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await LocalNotifications.checkPermissions();
        const granted = status.display === 'granted';
        this.permissionGranted.set(granted);
        return granted;
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const granted = Notification.permission === 'granted';
        this.permissionGranted.set(granted);
        return granted;
      }
    } catch (e) {
      console.warn('Could not check notification permissions:', e);
    }
    this.permissionGranted.set(false);
    return false;
  }

  /**
   * Request system notification permissions from user
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await LocalNotifications.requestPermissions();
        const granted = res.display === 'granted';
        this.permissionGranted.set(granted);
        if (granted) {
          this.toastService.success(
            this.translationService.getCurrentLanguage() === 'hi'
              ? 'सिस्टम नोटिफिकेशन सक्रिय हो गया!'
              : 'System notifications enabled!'
          );
        }
        return granted;
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        this.permissionGranted.set(granted);
        if (granted) {
          this.toastService.success(
            this.translationService.getCurrentLanguage() === 'hi'
              ? 'सिस्टम नोटिफिकेशन सक्रिय हो गया!'
              : 'System notifications enabled!'
          );
        }
        return granted;
      }
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
    }
    return false;
  }

  /**
   * Parse any date representation into normalized YYYY-MM-DD
   */
  private normalizeDateToKey(dateVal: any): string | null {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (!trimmed) return null;

      // Check DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
        const parts = trimmed.split('/');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }

      // Check ISO or YYYY-MM-DD
      const dateObj = new Date(trimmed);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, '0');
      const day = String(dateVal.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  /**
   * Check all records for promised settlement dates due TODAY
   */
  public evaluateTodaySettlements(): DueSettlementSummary {
    const allRecords = this.recordsService.records();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const dueTodayRecords: Record[] = [];
    let totalDue = 0;

    for (const r of allRecords) {
      // Must not be marked as paid and must have pending amount > 0
      if (r.markedAsPaid) continue;
      const pending = Number(r.pendingAmount) || 0;
      if (pending <= 0) continue;

      if (!r.fullPaymentDate) continue;

      const dateKey = this.normalizeDateToKey(r.fullPaymentDate);
      if (dateKey === todayKey) {
        dueTodayRecords.push(r);
        totalDue += pending;
      }
    }

    const farmerNames = dueTodayRecords.map(r => r.farmerName.trim()).filter(Boolean);
    let farmersListText = '';
    if (farmerNames.length === 1) {
      farmersListText = farmerNames[0];
    } else if (farmerNames.length === 2) {
      farmersListText = `${farmerNames[0]} व ${farmerNames[1]}`;
    } else if (farmerNames.length > 2) {
      farmersListText = `${farmerNames[0]}, ${farmerNames[1]} (+${farmerNames.length - 2} अन्य)`;
    }

    const summary: DueSettlementSummary = {
      dueRecords: dueTodayRecords,
      totalDueAmount: totalDue,
      farmersListText,
      hasDueToday: dueTodayRecords.length > 0
    };

    this.dueTodayCount.set(dueTodayRecords.length);
    this.dueTodaySummary.set(summary);

    return summary;
  }

  /**
   * Dispatch system notification for today's due settlement
   * @param force - If true, bypasses once-per-day cooldown check (e.g. for test or immediate user trigger)
   */
  async triggerSettlementNotification(force: boolean = false): Promise<boolean> {
    const isNotificationsEnabled = localStorage.getItem('notifications') !== 'false';
    if (!isNotificationsEnabled) {
      return false;
    }

    const summary = this.evaluateTodaySettlements();
    if (!summary.hasDueToday) {
      return false;
    }

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const storageKey = 'last_settlement_notif_date';
    const lastNotified = localStorage.getItem(storageKey);

    // If already notified today and not forced, skip
    if (!force && lastNotified === todayKey) {
      return false;
    }

    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const count = summary.dueRecords.length;
    const amountStr = '₹' + summary.totalDueAmount.toLocaleString('en-IN');

    let title = '';
    let body = '';

    if (count === 1) {
      const record = summary.dueRecords[0];
      const farmerAmount = '₹' + Number(record.pendingAmount).toLocaleString('en-IN');
      title = isHi ? '🌾 आज भुगतान वादा रिमाइंडर' : '🌾 Payment Promise Due Today';
      body = isHi 
        ? `${record.farmerName} का ${farmerAmount} का भुगतान आज देय है!` 
        : `${record.farmerName}'s payment of ${farmerAmount} is due today!`;
    } else {
      title = isHi 
        ? `🌾 आज ${count} किसानों का भुगतान वादा है` 
        : `🌾 ${count} Farmers Due for Payment Today`;
      body = isHi 
        ? `${summary.farmersListText} का कुल ${amountStr} बकाया भुगतान आज देय है!` 
        : `${summary.farmersListText} have a total of ${amountStr} due today!`;
    }

    // Try System Notification via Capacitor LocalNotifications or Web Notification API
    let dispatched = false;

    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await this.checkPermissionStatus();
        if (!perm) {
          await this.requestPermission();
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 100000),
              title,
              body,
              schedule: { at: new Date(Date.now() + 500) },
              sound: 'default',
              smallIcon: 'ic_launcher',
              extra: { action: 'open_records', date: todayKey }
            }
          ]
        });
        dispatched = true;
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `due-settlement-${todayKey}`
          });
          dispatched = true;
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification(title, {
              body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `due-settlement-${todayKey}`
            });
            dispatched = true;
          }
        }
      }
    } catch (err) {
      console.warn('System notification dispatch failed, falling back to in-app toast:', err);
    }

    // Record today as notified
    localStorage.setItem(storageKey, todayKey);

    // Also display in-app high-visibility reminder toast for immediate feedback
    this.toastService.warning(body);

    return dispatched;
  }

  /**
   * Send a test notification to verify system notification on device
   */
  async sendTestNotification(): Promise<void> {
    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const title = isHi ? '🌾 हार्वेस्टर सिस्टम टेस्ट' : '🌾 Harvester System Test';
    const body = isHi 
      ? 'सिस्टम नोटिफिकेशन सफलता से काम कर रहा है!' 
      : 'System notifications are working perfectly on this device!';

    try {
      if (Capacitor.isNativePlatform()) {
        await this.requestPermission();
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 99999,
              title,
              body,
              schedule: { at: new Date(Date.now() + 300) },
              sound: 'default',
              smallIcon: 'ic_launcher'
            }
          ]
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico'
          });
        }
      }
    } catch (e) {
      console.warn('Test notification error:', e);
    }

    this.toastService.success(body);
  }
}
