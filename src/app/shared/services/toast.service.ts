import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  private lastMessage = '';
  private lastMessageTime = 0;

  // Public readonly accessor
  public readonly toastList = this.toasts.asReadonly();

  /**
   * Show a toast notification with deduplication and auto-dismiss
   */
  show(message: string, type: ToastType = 'info', duration: number = 3200): void {
    if (!message || !message.trim()) return;

    const now = Date.now();
    // Deduplicate same message within 1.2 seconds
    if (this.lastMessage === message && now - this.lastMessageTime < 1200) {
      return;
    }
    this.lastMessage = message;
    this.lastMessageTime = now;

    // If a success or error comes in, dismiss any prior 'info' loading toasts
    if (type === 'success' || type === 'error') {
      this.toasts.update(list => list.filter(t => t.type !== 'info'));
    }

    const id = `toast_${now}_${Math.floor(Math.random() * 1000)}`;
    const toast: Toast = { id, message, type, duration };

    // Keep at most 2 active toasts on screen so it never clutters
    this.toasts.update(list => {
      const trimmed = list.length >= 2 ? list.slice(1) : list;
      return [...trimmed, toast];
    });

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  /**
   * Show success toast
   */
  success(message: string): void {
    this.show(message, 'success', 3200);
  }

  /**
   * Show error toast
   */
  error(message: string): void {
    this.show(message, 'error', 4500);
  }

  /**
   * Show warning toast
   */
  warning(message: string): void {
    this.show(message, 'warning', 4000);
  }

  /**
   * Show info toast
   */
  info(message: string): void {
    this.show(message, 'info', 2500);
  }

  /**
   * Remove a specific toast
   */
  remove(id: string): void {
    this.toasts.update(toasts => toasts.filter(toast => toast.id !== id));
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.toasts.set([]);
  }
}
