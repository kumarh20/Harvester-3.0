import { Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppNavigationService {
  private history: string[] = [];
  canGoBack = signal<boolean>(false);

  constructor(
    private router: Router,
    private location: Location
  ) {
    // Track internal route changes
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        if (this.history.length === 0 || this.history[this.history.length - 1] !== url) {
          this.history.push(url);
        }
        this.canGoBack.set(this.history.length > 1);
      });
  }

  /**
   * Navigate back to the previous route in the app, or to the fallback route if no history
   */
  back(fallbackRoute: string = '/dashboard'): void {
    if (this.history.length > 1) {
      this.history.pop(); // Remove current route
      this.canGoBack.set(this.history.length > 1);
      this.location.back();
    } else {
      this.router.navigateByUrl(fallbackRoute);
    }
  }
}
