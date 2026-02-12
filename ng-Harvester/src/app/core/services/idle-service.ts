
import { Injectable, NgZone } from '@angular/core';
import { AuthService } from '../../services/auth/auth-service';


@Injectable({ providedIn: 'root' })
export class IdleService {

  private timeoutId: any;
  private readonly IDLE_TIME = 15 * 60 * 1000; // 15 min

  constructor(
    private authService: AuthService,
    private ngZone: NgZone
  ) {}

  startWatching() {
    this.resetTimer();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, () => {
        this.ngZone.run(() => this.resetTimer());
      });
    });
  }

  private resetTimer() {
    clearTimeout(this.timeoutId);

    this.timeoutId = setTimeout(() => {
      // --- Auto-logout on idle commented out (one-time login; restore when needed) ---
      // this.authService.logout();
    }, this.IDLE_TIME);
  }
}
