import { Component, signal, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastComponent } from './shared/components/toast/toast.component';
import { RecordsService } from './core/services/records.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    ToastComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class App {
  protected readonly title = signal('हार्वेस्टर ट्रैकर');
  protected activeRoute = signal('/dashboard');
  protected currentTab = signal('dashboard');
  protected isDarkTheme = signal(false);

  protected readonly navItems: NavItem[] = [
    { label: 'Add New', icon: 'add_circle', route: '/add-new' },
    { label: 'Records', icon: 'list', route: '/records' },
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
    { label: 'More', icon: 'more_horiz', route: '/more' }
  ];

  constructor(
    private router: Router,
    private recordsService: RecordsService
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.activeRoute.set(event.url);
      });

    this.initializeTheme();
  }

  onNavChange(route: string): void {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    return this.activeRoute() === route;
  }

  switchTab(tabName: string): void {
    this.currentTab.set(tabName);
    let route = '/';

    switch(tabName) {
      case 'add-new':
      case 'entry':
        route = '/add-new';
        break;
      case 'records':
        route = '/records';
        break;
      case 'dashboard':
      case 'summary':
        route = '/dashboard';
        break;
      case 'settings':
        route = '/settings';
        break;
      case 'more':
        route = '/more';
        break;
    }

    this.router.navigate([route]);
  }

  toggleTheme(): void {
    this.isDarkTheme.set(!this.isDarkTheme());
    const htmlElement = document.documentElement;

    if (this.isDarkTheme()) {
      htmlElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      htmlElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.isDarkTheme.set(savedTheme === 'dark');

    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  /**
   * Get total balance from all records
   */
  getTotalBalance(): string {
    const records = this.recordsService.getAllRecords();
    const total = records.reduce((sum, record) => {
      return sum + (record.totalPayment || 0);
    }, 0);

    return new Intl.NumberFormat('hi-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(total);
  }
}
