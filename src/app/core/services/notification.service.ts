import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { RecordsService, Record } from './records.service';
import { RemindersService, Reminder } from './reminders.service';
import { TranslationService } from '../../shared/services/translation.service';
import { ToastService } from '../../shared/services/toast.service';
import { AppNotification, NotificationType } from '../models/notification.model';
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

const NOTIFICATIONS_STORAGE_KEY = 'harvester_app_notifications_list_v1';

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

  // Persistent Notification Center Store
  public notifications = signal<AppNotification[]>([]);
  public unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  constructor() {
    this.loadNotificationsFromStorage();
    this.checkPermissionStatus();
    this.initNotificationListeners();
  }

  /**
   * Load stored notifications from localStorage
   */
  private loadNotificationsFromStorage(): void {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.notifications.set(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load notifications from storage:', e);
    }
  }

  /**
   * Persist notifications to storage
   */
  private saveNotificationsToStorage(): void {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.notifications()));
    } catch (e) {
      console.warn('Could not save notifications to storage:', e);
    }
  }

  /**
   * Add a notification to the in-app notification center
   */
  public addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>): AppNotification {
    const newNotif: AppNotification = {
      ...notification,
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      isRead: false
    };

    // Keep max 100 recent notifications
    this.notifications.update(list => [newNotif, ...list].slice(0, 100));
    this.saveNotificationsToStorage();
    return newNotif;
  }

  /**
   * Mark a single notification as read
   */
  public markAsRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    this.saveNotificationsToStorage();
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): void {
    this.notifications.update(list =>
      list.map(n => ({ ...n, isRead: true }))
    );
    this.saveNotificationsToStorage();
  }

  /**
   * Clear a single notification
   */
  public deleteNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
    this.saveNotificationsToStorage();
  }

  /**
   * Clear all notifications
   */
  public clearAllNotifications(): void {
    this.notifications.set([]);
    this.saveNotificationsToStorage();
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
            const action = extra?.action;
            
            if (action === 'open_reminders') {
              this.router.navigate(['/reminders'], {
                queryParams: {
                  filter: extra?.filter || 'today',
                  ...(extra?.checkStatus ? { check: 'true' } : {})
                }
              });
            } else if (action === 'open_farmer') {
              this.router.navigate(['/records'], {
                queryParams: {
                  farmer: extra?.farmer || '',
                  ...(extra?.recordId ? { recordId: extra.recordId } : {})
                }
              });
            } else if (action === 'open_records') {
              this.router.navigate(['/records'], {
                queryParams: {
                  filter: extra?.filter || 'dueToday',
                  ...(extra?.recordId ? { recordId: extra.recordId } : {})
                }
              });
            } else {
              this.router.navigate(['/notifications']);
            }
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
   * Dispatch system notification and notification center item for today's due settlement
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
    const isSingle = count === 1;
    const singleRecord = isSingle ? summary.dueRecords[0] : null;
    const singleRecordId = singleRecord?.id;
    const singleFarmerName = singleRecord?.farmerName;

    let title = '';
    let body = '';
    let targetRoute = '/records';
    let targetQueryParams: { [key: string]: any } = {};

    if (isSingle && singleRecord) {
      const farmerAmount = '₹' + Number(singleRecord.pendingAmount).toLocaleString('en-IN');
      title = isHi ? '🌾 आज बकाया भुगतान वादा' : '🌾 Payment Promise Due Today';
      body = isHi 
        ? `${singleRecord.farmerName} का ${farmerAmount} का बकाया भुगतान आज देय है!` 
        : `${singleRecord.farmerName}'s payment of ${farmerAmount} is due today!`;
      
      // Single farmer: direct to farmer record page
      targetQueryParams = {
        farmer: singleRecord.contactNumber || singleRecord.farmerName,
        recordId: singleRecord.id
      };
    } else {
      title = isHi 
        ? `🌾 आज ${count} किसानों का बकाया भुगतान वादा है` 
        : `🌾 ${count} Farmers Due for Payment Today`;
      body = isHi 
        ? `${summary.farmersListText} का कुल ${amountStr} बकाया भुगतान आज देय है!` 
        : `${summary.farmersListText} have a total of ${amountStr} due today!`;
      
      // Multiple farmers: direct to records page with dueToday filter
      targetQueryParams = {
        filter: 'dueToday'
      };
    }

    // Add to In-App Notification Center
    this.addNotification({
      type: 'settlement_due',
      title,
      message: body,
      route: targetRoute,
      queryParams: targetQueryParams,
      farmerName: isSingle ? singleFarmerName : summary.farmersListText,
      amount: summary.totalDueAmount,
      dateKey: todayKey,
      entityId: singleRecordId
    });

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
              extra: isSingle
                ? { action: 'open_farmer', farmer: singleRecord?.contactNumber || singleRecord?.farmerName, recordId: singleRecordId, date: todayKey }
                : { action: 'open_records', filter: 'dueToday', date: todayKey }
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
              this.router.navigate([targetRoute], { queryParams: targetQueryParams });
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
                this.router.navigate([targetRoute], { queryParams: targetQueryParams });
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

    // Add to Notification Center
    this.addNotification({
      type: 'system',
      title,
      message: body,
      route: '/notifications'
    });

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
              this.router.navigate(['/notifications']);
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
  // FUTURE CUTTING / BOOKING SCHEDULE NOTIFICATIONS (4x Daily)
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
   * Determine current daily reminder slot (Slot 1: 07:00, Slot 2: 11:00, Slot 3: 15:00, Slot 4: 19:00)
   */
  private getCurrentDailySlot(): { slotId: number; label: string } | null {
    const hour = new Date().getHours();
    if (hour >= 19) return { slotId: 4, label: 'शाम 7:00' };
    if (hour >= 15) return { slotId: 3, label: 'दोपहर 3:00' };
    if (hour >= 11) return { slotId: 2, label: 'सुबह 11:00' };
    if (hour >= 7) return { slotId: 1, label: 'सुबह 7:00' };
    return null;
  }

  /**
   * 4x Daily Cutting Reminder notification (7 AM, 11 AM, 3 PM, 7 PM)
   * Continues repeating up to 4 times a day until the reminder date is modified or moved to records.
   * Clicking navigates directly to the Reminders page.
   */
  async triggerDailyCuttingReminders(force: boolean = false): Promise<boolean> {
    const isNotificationsEnabled = localStorage.getItem('notifications') !== 'false';
    if (!isNotificationsEnabled) return false;

    const summary = this.evaluateTodayCuttings();
    if (!summary.hasCuttingsToday) return false;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const slot = this.getCurrentDailySlot();

    if (!slot && !force) {
      return false; // Too early (before 7:00 AM)
    }

    const slotId = slot?.slotId || 1;
    const storageKey = `last_cutting_remind_slot_${todayKey}_${slotId}`;
    const alreadySentForSlot = localStorage.getItem(storageKey);

    if (!force && alreadySentForSlot) {
      return false;
    }

    const isHi = this.translationService.getCurrentLanguage() === 'hi';
    const count = summary.todayReminders.length;
    let title = '';
    let body = '';

    if (count === 1) {
      const rem = summary.todayReminders[0];
      const timeStr = rem.scheduledTime ? ` (${rem.scheduledTime})` : '';
      title = isHi ? '🌾 आज कटाई रिमाइंडर' : '🌾 Cutting Scheduled Today';
      body = isHi 
        ? `${rem.farmerName} (${rem.landInAcres} एकड़)${timeStr} की कटाई आज निर्धारित है!` 
        : `${rem.farmerName} (${rem.landInAcres} Acres)${timeStr} is scheduled for cutting today!`;
    } else {
      title = isHi 
        ? `🌾 आज ${count} खेतों की कटाई निर्धारित है` 
        : `🌾 ${count} Cutting Bookings Scheduled Today`;
      body = isHi 
        ? `${summary.farmersListText} (${summary.totalAcres} एकड़) की कटाई आज होनी है!` 
        : `${summary.farmersListText} (${summary.totalAcres} Acres total) scheduled today!`;
    }

    // Add to Notification Center Store
    this.addNotification({
      type: 'reminder',
      title,
      message: body,
      route: '/reminders',
      queryParams: { filter: 'today' },
      farmerName: summary.farmersListText,
      acres: summary.totalAcres,
      dateKey: todayKey
    });

    // Dispatch System Notification
    try {
      if (Capacitor.isNativePlatform()) {
        await this.requestPermission();
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 100000) + 100 + slotId,
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
          tag: `cutting-reminder-${todayKey}-slot-${slotId}`
        });
        notif.onclick = () => {
          window.focus();
          this.ngZone.run(() => {
            this.router.navigate(['/reminders'], { queryParams: { filter: 'today' } });
          });
        };
      }
    } catch (err) {
      console.warn('Cutting reminder notification error:', err);
    }

    localStorage.setItem(storageKey, 'true');
    this.toastService.info(body);
    return true;
  }

  /**
   * Legacy wrapper for morning cutting notification
   */
  async triggerMorningCuttingNotification(force: boolean = false): Promise<boolean> {
    return this.triggerDailyCuttingReminders(force);
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

    // Add to Notification Center Store
    this.addNotification({
      type: 'cutting_status',
      title,
      message: body,
      route: '/reminders',
      queryParams: { filter: 'today', check: 'true' },
      farmerName: summary.farmersListText,
      acres: summary.totalAcres,
      dateKey: todayKey
    });

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
    
    // Settlement reminder check (morning / daytime)
    this.evaluateTodaySettlements();
    this.triggerSettlementNotification();

    // Cutting schedule checks (4x daily: 7 AM, 11 AM, 3 PM, 7 PM)
    this.evaluateTodayCuttings();
    if (hour >= 7) {
      this.triggerDailyCuttingReminders();
    }

    // If day-end (around or after 20:00 / 8 PM - 10 PM)
    if (hour >= 20 || hour >= 22) {
      this.triggerDayEndCuttingCheck();
    }
  }
}
