import { Component, signal, ViewChildren, QueryList, ElementRef, AfterViewInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { ToastComponent } from './shared/components/toast/toast.component';
import { RecordsService } from './core/services/records.service';
import { TranslationService } from './shared/services/translation.service';
import { LanguageService } from './shared/services/language.service';

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
    MatIconModule,
    ToastComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class App implements AfterViewInit {
  protected activeRoute = signal('/dashboard');
  protected currentTab = signal('dashboard');
  protected isDarkTheme = signal(false);

  @ViewChildren('navItem') navItemElements!: QueryList<ElementRef>;
  @ViewChild('slidingBg') slidingBgElement!: ElementRef;
  @ViewChild('navContainer') navContainerElement!: ElementRef;

  // Navigation items - labels kept as English for icon matching logic
  // Display will use translations via getNavLabel()
  protected readonly navItems: NavItem[] = [
    { label: 'Add New', icon: 'add_circle', route: '/add-new' },
    { label: 'Records', icon: 'list', route: '/records' },
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
    { label: 'More', icon: 'more_horiz', route: '/more' }
  ];

  constructor(
    private router: Router,
    private recordsService: RecordsService,
    public translationService: TranslationService,
    private languageService: LanguageService
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.activeRoute.set(event.url);
        // Wait for view to update, then move slider
        setTimeout(() => this.moveSliderToActive(), 0);
      });

    this.initializeTheme();

    // Always land on Dashboard
    if (this.router.url === '/' || this.router.url === '') {
      this.router.navigate(['/dashboard']);
    }
  }

  ngAfterViewInit(): void {
    // Initial slider position
    setTimeout(() => this.moveSliderToActive(), 100);
  }

  onNavChange(route: string): void {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    // Check if current route exactly matches or starts with the nav item route
    // This handles both /add-new and /add-new/:id cases
    const currentRoute = this.activeRoute();

    // Exact match
    if (currentRoute === route) {
      return true;
    }

    // Check if current route starts with nav item route (for child routes like /add-new/:id)
    // But don't match partial route segments (e.g., /settings shouldn't match /settings-advanced)
    if (currentRoute.startsWith(route + '/')) {
      return true;
    }

    return false;
  }

  moveSliderToActive(): void {
    if (!this.slidingBgElement || !this.navItemElements) return;

    const currentRoute = this.activeRoute();

    // Find the active nav item using the same logic as isActive
    const activeIndex = this.navItems.findIndex(item => {
      // Exact match
      if (currentRoute === item.route) {
        return true;
      }
      // Check if current route starts with nav item route (for child routes)
      if (currentRoute.startsWith(item.route + '/')) {
        return true;
      }
      return false;
    });

    if (activeIndex === -1) return;

    const navItemsArray = this.navItemElements.toArray();
    if (navItemsArray.length === 0 || !navItemsArray[activeIndex]) return;

    const activeElement = navItemsArray[activeIndex].nativeElement;
    const containerElement = this.navContainerElement.nativeElement;
    const pillElement = this.slidingBgElement.nativeElement;

    // Get positions relative to container
    const containerRect = containerElement.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    // Calculate position and width for the pill
    // Pill should fit the content (icon + text when active)
    const left = (activeRect.left - containerRect.left) + 12;
    const contentWidth = activeElement.querySelector('.nav-item')?.getBoundingClientRect().width || activeRect.width;

    // Pill padding: 12px 16px, so we need to account for that
    const pillWidth = Math.max(contentWidth, 40); // Minimum 40px height = width for pill shape

    // Apply to pill (positioned absolutely within container)
    pillElement.style.transform = `translateX(${left}px)`;
    pillElement.style.width = `${pillWidth}px`;
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

    const locale = this.languageService.isHindi() ? 'hi-IN' : 'en-IN';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(total);
  }

  /**
   * Toggle language between Hindi and English
   */
  toggleLanguage(): void {
    const currentLang = this.languageService.getCurrentLanguage();
    const newLang = currentLang === 'hi' ? 'en' : 'hi';
    this.languageService.setLanguage(newLang);
  }

  /**
   * Get current language code
   */
  getCurrentLanguage(): string {
    return this.languageService.getCurrentLanguage();
  }

  /**
   * Get translated navigation label
   * Maps English label to translation key
   */
  getNavLabel(label: string): string {
    // Show "Home" for Dashboard when active
    if (label === 'Dashboard') {
      return 'Home';
    }
    const labelMap: Record<string, string> = {
      'Add New': 'nav.addNew',
      'Records': 'nav.records',
      'Settings': 'nav.settings',
      'More': 'nav.more'
    };
    const key = labelMap[label] || label;
    return this.translationService.get(key);
  }
}
