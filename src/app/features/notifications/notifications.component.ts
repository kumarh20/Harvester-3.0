import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../core/services/notification.service';
import { TranslationService } from '../../shared/services/translation.service';
import { AppNavigationService } from '../../core/services/app-navigation.service';
import { AppNotification, NotificationType } from '../../core/models/notification.model';
import { NotificationFilterTab } from './notifications.interface';
import { NOTIFICATIONS_CONSTANTS } from './notifications.constants';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, MatIconModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  public notificationService = inject(NotificationService);
  public translationService = inject(TranslationService);
  public appNavigationService = inject(AppNavigationService);
  private router = inject(Router);

  // Active filter tab: 'all' | 'unread' | 'reminder' | 'due'
  public activeFilter = signal<NotificationFilterTab>(NOTIFICATIONS_CONSTANTS.DEFAULT_FILTER);
  public filterTabs = NOTIFICATIONS_CONSTANTS.FILTER_TABS;

  public notifications = computed(() => {
    const list = this.notificationService.notifications();
    const filter = this.activeFilter();

    if (filter === 'unread') {
      return list.filter(n => !n.isRead);
    } else if (filter === 'reminder') {
      return list.filter(n => n.type === 'reminder' || n.type === 'cutting_status');
    } else if (filter === 'due') {
      return list.filter(n => n.type === 'settlement_due');
    }
    return list;
  });

  public unreadCount = computed(() => this.notificationService.unreadCount());
  public totalCount = computed(() => this.notificationService.notifications().length);

  ngOnInit(): void {
    // Refresh settlement and reminder evaluations
    this.notificationService.evaluateTodaySettlements();
    this.notificationService.evaluateTodayCuttings();
  }

  isHindi(): boolean {
    return this.translationService.getCurrentLanguage() === 'hi';
  }

  goBack(): void {
    this.appNavigationService.back('/dashboard');
  }

  setFilter(filter: 'all' | 'unread' | 'reminder' | 'due'): void {
    this.activeFilter.set(filter);
  }

  onNotificationClick(notif: AppNotification): void {
    // Mark as read immediately
    this.notificationService.markAsRead(notif.id);

    // Navigate to target route if present
    if (notif.route) {
      this.router.navigate([notif.route], {
        queryParams: notif.queryParams || {}
      });
    }
  }

  markAllAsRead(event?: Event): void {
    if (event) event.stopPropagation();
    this.notificationService.markAllAsRead();
  }

  deleteNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id);
  }

  clearAll(event?: Event): void {
    if (event) event.stopPropagation();
    this.notificationService.clearAllNotifications();
  }

  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case 'settlement_due':
        return 'payments';
      case 'reminder':
        return 'alarm';
      case 'cutting_status':
        return 'agriculture';
      case 'system':
      default:
        return 'notifications';
    }
  }

  getNotificationTag(type: NotificationType): { label: string; class: string } {
    const isHi = this.isHindi();
    switch (type) {
      case 'settlement_due':
        return {
          label: isHi ? 'बकाया भुगतान' : 'Payment Due',
          class: 'tag-due'
        };
      case 'reminder':
        return {
          label: isHi ? 'कटाई रिमाइंडर' : 'Cutting Reminder',
          class: 'tag-reminder'
        };
      case 'cutting_status':
        return {
          label: isHi ? 'दैनिक स्थिति' : 'Daily Status',
          class: 'tag-status'
        };
      case 'system':
      default:
        return {
          label: isHi ? 'सिस्टम' : 'System',
          class: 'tag-system'
        };
    }
  }

  formatTime(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const timeStr = `${displayHours}:${minutes} ${period}`;

    if (isToday) {
      return this.isHindi() ? `आज, ${timeStr}` : `Today, ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return this.isHindi() ? `कल, ${timeStr}` : `Yesterday, ${timeStr}`;
    }

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}, ${timeStr}`;
  }
}
