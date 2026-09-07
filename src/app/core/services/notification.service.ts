import { Injectable, inject, signal, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { RecordsService, Record } from './records.service';
import { RemindersService, Reminder } from './reminders.service';
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

export interface TodayCuttingSummary {
  todayReminders: Reminder[];
  totalAcres: number;
  farmersListText: string;
  hasCuttingsToday: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private recordsService = inject(RecordsService);
  private remindersService = inject(RemindersService);
  private translationService = inject(TranslationService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  public permissionGranted = signal<boolean>(false);
  public dueTodayCount = signal<number>(0);
  public dueTodaySummary = signal<DueSettlementSummary | null>(null);

  // Cutting reminders state
  public todayCuttingsCount = signal<number>(0);
  public todayCuttingsSummary = signal<TodayCuttingSummary | null>(null);
  public showDayEndPrompt = signal<boolean>(false);

  constructor() {
    this.checkPermissionStatus();
    this.initNotificationListeners();
  }

  /**
   * Listen to notification actions (taps/clicks) on Android / Native platforms
   */
  private initNotificationListeners(): void {
    if (Capacitor.isNativePlatform()) {
      try {
        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          console.log('🔔 Notification action performed:', notificationAction);
          this.ngZone.run(() => {
            const extra = notificationAction.notification.extra;
            const filter = extra?.filter || 'dueToday';
            const recordId = extra?.recordId;
            
            this.router.navigate(['/records'], {
              queryParams: {
                filter,
                ...(recordId ? { recordId } : {})
              }
            });
          });
        });
      } catch (err) {
        console.warn('Could not register local notification action listener:', err);
      }
    }
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
  public normalizeDateToKey(dateVal: any): string | null {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (!trimmed) return null;

      // Check DD/MM/YYYY or DD-MM-YYYY
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) {
        const parts = trimmed.split(/[\/\-]/);
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

    const farmerNames = dueTodayRecords.map(r => r.farmerName?.trim()).filter(Boolean);
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
   * @param force - If true, bypasses once-per-day cooldown check
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
    const singleRecordId = count === 1 ? summary.dueRecords[0].id : undefined;

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
              extra: { 
                action: 'open_records', 
                filter: 'dueToday',
                recordId: singleRecordId,
                date: todayKey 
              }
            }
          ]
        });
        dispatched = true;
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          const notif = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `due-settlement-${todayKey}`
          });
          notif.onclick = () => {
            window.focus();
            this.ngZone.run(() => {
              this.router.navigate(['/records'], {
                queryParams: {
                  filter: 'dueToday',
                  ...(singleRecordId ? { recordId: singleRecordId } : {})
                }
              });
            });
          };
          dispatched = true;
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            const notif = new Notification(title, {
              body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `due-settlement-${todayKey}`
            });
            notif.onclick = () => {
              window.focus();
              this.ngZone.run(() => {
                this.router.navigate(['/records'], {
                  queryParams: {
                    filter: 'dueToday',
                    ...(singleRecordId ? { recordId: singleRecordId } : {})
                  }
                });
              });
            };
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
              smallIcon: 'ic_launcher',
              extra: { action: 'open_records', filter: 'dueToday' }
            }
          ]
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          const notif = new Notification(title, {
            body,
            icon: '/favicon.ico'
          });
          notif.onclick = () => {
            window.focus();
            this.ngZone.run(() => {
              this.router.navigate(['/records'], { queryParams: { filter: 'dueToday' } });
            });
          };
        }
      }
    } catch (e) {
      console.warn('Test notification error:', e);
    }

    this.toastService.success(body);
  }

  // ==========================================
  // FUTURE CUTTING SCHEDULE NOTIFICATIONS
  // ==========================================

  /**
   * Evaluate bookings scheduled for TODAY
   */
  public evaluateTodayCuttings(): TodayCuttingSummary {
    const allReminders = this.remindersService.reminders();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const todayRemindersList: Reminder[] = [];
    let totalAcres = 0;

    for (const r of allReminders) {
      if (r.status !== 'pending') continue;
      const dateKey = this.normalizeDateToKey(r.scheduledDate);
      if (dateKey === todayKey) {
        todayRemindersList.push(r);
        totalAcres += Number(r.landInAcres) || 0;
      }
    }

    const farmerNames = todayRemindersList.map(r => r.farmerName?.trim()).filter(Boolean);
    let farmersListText = '';
    if (farmerNames.length === 1) {
      farmersListText = farmerNames[0];
    } else if (farmerNames.length === 2) {
      farmersListText = `${farmerNames[0]} व ${farmerNames[1]}`;
    } else if (farmerNames.length > 2) {
      farmersListText = `${farmerNames[0]}, ${farmerNames[1]} (+${farmerNames.length - 2} अन्य)`;
    }

    const summary: TodayCuttingSummary = {
      todayReminders: todayRemindersList,
      totalAcres,
      farmersListText,
      hasCuttingsToday: todayRemindersList.length > 0
    };

    this.todayCuttingsCount.set(todayRemindersList.length);
    this.todayCuttingsSummary.set(summary);

    return summary;
  }

  /**
   * Morning 8:00 AM (or early app launch) cutting schedule reminder
   */
  async triggerMorningCuttingNotification(force: boolean = false): Promise<boolean> {
    const isNotificationsEnabled = localStorage.getItem('notifications') !== 'false';
    if (!isNotificationsEnabled) return false;

    const summary = this.evaluateTodayCuttings();
    if (!summary.hasCuttingsToday) return false;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const storageKey = 'last_morning_cutting_notif_date';
    const lastNotified = localStorage.getItem(storageKey);

    if (!force && lastNotified === todayKey) {
      return false;
    }

    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const count = summary.todayReminders.length;
    let title = '';
    let body = '';

    if (count === 1) {
      const rem = summary.todayReminders[0];
      title = isHi ? '🌾 आज कटाई रिमाइंडर' : '🌾 Cutting Scheduled Today';
      body = isHi 
        ? `${rem.farmerName} (${rem.landInAcres} एकड़) की कटाई आज निर्धारित है!` 
        : `${rem.farmerName} (${rem.landInAcres} Acres) scheduled for cutting today!`;
    } else {
      title = isHi 
        ? `🌾 आज ${count} खेतों की कटाई निर्धारित है` 
        : `🌾 ${count} Cutting Bookings Scheduled Today`;
      body = isHi 
        ? `${summary.farmersListText} (${summary.totalAcres} एकड़) की कटाई आज होनी है!` 
        : `${summary.farmersListText} (${summary.totalAcres} Acres total) scheduled today!`;
    }

    // Trigger notification
    try {
      if (Capacitor.isNativePlatform()) {
        await this.requestPermission();
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 100000) + 100,
              title,
              body,
              schedule: { at: new Date(Date.now() + 500) },
              sound: 'default',
              smallIcon: 'ic_launcher',
              extra: { action: 'open_reminders', filter: 'today' }
            }
          ]
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `morning-cutting-${todayKey}`
        });
        notif.onclick = () => {
          window.focus();
          this.ngZone.run(() => {
            this.router.navigate(['/reminders'], { queryParams: { filter: 'today' } });
          });
        };
      }
    } catch (err) {
      console.warn('Morning cutting notification error:', err);
    }

    localStorage.setItem(storageKey, todayKey);
    this.toastService.info(body);
    return true;
  }

  /**
   * Day-End 10:00 PM (or evening app launch) cutting status check
   * Prompts user whether scheduled fields have been cut and offers moving them to records
   */
  async triggerDayEndCuttingCheck(force: boolean = false): Promise<boolean> {
    const isNotificationsEnabled = localStorage.getItem('notifications') !== 'false';
    if (!isNotificationsEnabled) return false;

    const summary = this.evaluateTodayCuttings();
    if (!summary.hasCuttingsToday) return false;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const storageKey = 'last_night_cutting_check_date';
    const lastNotified = localStorage.getItem(storageKey);

    if (!force && lastNotified === todayKey) {
      return false;
    }

    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const count = summary.todayReminders.length;
    const title = isHi ? '🌙 आज की कटाई स्थिति जांच' : '🌙 Day-End Cutting Status';
    const body = isHi
      ? `क्या आज ${count} किसानों (${summary.farmersListText}) की कटाई पूरी हो गई? इन्हें कटाई रिकॉर्ड में जोड़ें।`
      : `Were today's ${count} cuttings (${summary.farmersListText}) completed? Move them to cutting records.`;

    // Show prompt signal so UI displays dialog / banner
    this.showDayEndPrompt.set(true);

    try {
      if (Capacitor.isNativePlatform()) {
        await this.requestPermission();
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 100000) + 200,
              title,
              body,
              schedule: { at: new Date(Date.now() + 500) },
              sound: 'default',
              smallIcon: 'ic_launcher',
              extra: { action: 'open_reminders', filter: 'today', checkStatus: 'true' }
            }
          ]
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `night-cutting-${todayKey}`
        });
        notif.onclick = () => {
          window.focus();
          this.ngZone.run(() => {
            this.router.navigate(['/reminders'], { queryParams: { filter: 'today', check: 'true' } });
          });
        };
      }
    } catch (err) {
      console.warn('Night cutting check notification error:', err);
    }

    localStorage.setItem(storageKey, todayKey);
    return true;
  }

  /**
   * Run automated time-of-day checks on app launch / resume
   */
  public checkAllDailyReminders(): void {
    const hour = new Date().getHours();
    
    // Settlement reminder check
    this.evaluateTodaySettlements();
    this.triggerSettlementNotification();

    // Cutting schedule checks
    this.evaluateTodayCuttings();

    // If morning (around or after 8 AM)
    if (hour >= 8 && hour < 20) {
      this.triggerMorningCuttingNotification();
    }

    // If day-end (around or after 20:00 / 8 PM - 10 PM)
    if (hour >= 20 || hour >= 22) {
      this.triggerDayEndCuttingCheck();
    }
  }
}

