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

  // Public readonly accessor
  public readonly toastList = this.toasts.asReadonly();

  /**
   * Show a toast notification
   */
  show(message: string, type: ToastType = 'info', duration: number = 4000): void {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const toast: Toast = { id, message, type, duration };

    // Add toast to list
    this.toasts.update(toasts => [...toasts, toast]);

    // Auto-remove after duration
    if (type === 'info') {
      setTimeout(() => this.remove(id), 2000); // Info messages: 2 seconds
    } else {
      setTimeout(() => this.remove(id), duration); // Others: 4 seconds
    }
  }

  /**
   * Show success toast
   */
  success(message: string): void {
    this.show(message, 'success', 4000);
  }

  /**
   * Show error toast
   */
  error(message: string): void {
    this.show(message, 'error', 4000);
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
    this.show(message, 'info', 2000);
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

