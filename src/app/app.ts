import { Component, signal, computed, ViewEncapsulation, OnInit, NgZone } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { BottomNavigationComponent } from './shared/components/bottom-navigation/bottom-navigation.component';
import { RecordsService } from './core/services/records.service';
import { NotificationService } from './core/services/notification.service';
import { TranslationService } from './shared/services/translation.service';
import { LanguageService } from './shared/services/language.service';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { IdleService } from './core/services/idle-service';

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
    ToastComponent,
    LoaderComponent,
    HeaderComponent,
    BottomNavigationComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit {
  protected activeRoute = signal('/dashboard');
  protected currentTab = signal('dashboard');
  protected isDarkTheme = signal(false);

  // Navigation items - arranged: Home, Records, Center Add (+), Settings, Profile
  // Display will use translations via getNavLabel()
  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'home', route: '/dashboard' },
    { label: 'Records', icon: 'receipt_long', route: '/records' },
    { label: 'Add New', icon: 'add_circle', route: '/add-new' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
    { label: 'Profile', icon: 'person', route: '/profile' }
  ];

  constructor(
    private auth: Auth,
    private router: Router,
    private recordsService: RecordsService,
    private notificationService: NotificationService,
    public translationService: TranslationService,
    private languageService: LanguageService,
    private idleService: IdleService,
    private ngZone: NgZone
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.activeRoute.set(event.url);
      });

    this.initializeTheme();

    // Always land on Dashboard
    if (this.router.url === '/' || this.router.url === '') {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    onAuthStateChanged(this.auth, (user) => {
      // Run inside Angular zone for proper change detection on Safari/iOS
      this.ngZone.run(() => {
        if (user) {
          // ✅ Firebase ke paas valid session hai
          this.idleService.startWatching();
          // Evaluate settlement dates due today and trigger system notification
          this.recordsService.loadRecords().then(() => {
            this.notificationService.evaluateTodaySettlements();
            this.notificationService.triggerSettlementNotification();
          }).catch(() => {});
          this.router.navigate(['/dashboard']);
        } else {
          // ❌ User login nahi hai
          this.router.navigate(['/auth']);
        }
      });
    });
  }

  onNavChange(route: string): void {
    this.router.navigate([route]);
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
      case 'profile':
        route = '/profile';
        break;
      case 'more':
        route = '/settings';
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

    const currentLang = this.languageService.getCurrentLanguage();
    const locale = currentLang === 'hi' ? 'hi-IN' : 'en-IN';
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
    const labelMap: Record<string, string> = {
      'Dashboard': 'nav.home',
      'Home': 'nav.home',
      'Add New': 'nav.addNew',
      'Records': 'nav.records',
      'Settings': 'nav.settings',
      'Profile': 'nav.profile',
      'More': 'nav.more'
    };
    const key = labelMap[label] || label;
    return this.translationService.get(key);
  }

  showNavigation = computed(() => {
    return !(this.activeRoute().includes('auth'));
  });

  /**
   * Get nav items with translated labels (reactive to language changes)
   */
  navItemsWithTranslations = computed(() => {
    this.translationService.t();
    return this.navItems.map(item => ({
      ...item,
      label: this.getNavLabel(item.label)
    }));
  });

  getNavItemsWithTranslations() {
    return this.navItemsWithTranslations();
  }
}
