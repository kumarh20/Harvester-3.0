import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" id="global-toast-container" role="status" aria-live="polite">
      @for (toast of toastService.toastList(); track toast.id) {
        <div 
          class="toast-item" 
          [class.success]="toast.type === 'success'"
          [class.error]="toast.type === 'error'"
          [class.warning]="toast.type === 'warning'"
          [class.info]="toast.type === 'info'"
          (click)="toastService.remove(toast.id)">
          
          <!-- Icon -->
          <div class="toast-icon-wrapper">
            @switch (toast.type) {
              @case ('success') {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              }
              @case ('error') {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              }
              @case ('warning') {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              }
              @case ('info') {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              }
            }
          </div>

          <!-- Message -->
          <span class="toast-message">{{ toast.message }}</span>

          <!-- Close Icon -->
          <button 
            type="button" 
            class="toast-dismiss-btn" 
            (click)="$event.stopPropagation(); toastService.remove(toast.id)"
            aria-label="Close notification">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: calc(76px + env(safe-area-inset-bottom, 12px));
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
      max-width: 440px;
      padding: 0 16px;
      pointer-events: none;
    }

    .toast-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      border-radius: 14px;
      box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.25), 0 4px 10px rgba(0, 0, 0, 0.1);
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: 0.2px;
      pointer-events: auto;
      cursor: pointer;
      animation: toastSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: transform 0.2s ease, opacity 0.2s ease;
      box-sizing: border-box;
    }

    .toast-item:active {
      transform: scale(0.98);
    }

    .toast-item.success {
      background: #065F46;
      border: 1px solid #10B981;
      color: #FFFFFF;
    }

    .toast-item.error {
      background: #991B1B;
      border: 1px solid #EF4444;
      color: #FFFFFF;
    }

    .toast-item.warning {
      background: #92400E;
      border: 1px solid #F59E0B;
      color: #FFFFFF;
    }

    .toast-item.info {
      background: #1E293B;
      border: 1px solid #64748B;
      color: #F8FAFC;
    }

    .toast-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.15);
    }

    .toast-message {
      flex: 1;
      line-height: 1.4;
      word-break: break-word;
    }

    .toast-dismiss-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.85);
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: background 0.15s ease;
    }

    .toast-dismiss-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
    }

    @keyframes toastSlideUp {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (min-width: 768px) {
      .toast-container {
        bottom: 32px;
        right: 32px;
        left: auto;
        transform: none;
        max-width: 380px;
        padding: 0;
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
