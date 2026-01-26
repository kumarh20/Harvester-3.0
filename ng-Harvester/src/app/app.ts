import { Component, signal, ViewEncapsulation, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoaderComponent } from './shared/components/loader/loader.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { BottomNavigationComponent } from './shared/components/bottom-navigation/bottom-navigation.component';
import { RecordsService } from './core/services/records.service';
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
export class App implements OnInit {
  protected activeRoute = signal('/dashboard');
  protected currentTab = signal('dashboard');
  protected isDarkTheme = signal(false);

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
    private auth: Auth,
    private router: Router,
    private recordsService: RecordsService,
    public translationService: TranslationService,
    private languageService: LanguageService,
    private idleService: IdleService
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
      if (user) {
        // ✅ Firebase ke paas valid session hai
        this.idleService.startWatching(); // 👈 important
        this.router.navigate(['/dashboard']);
      } else {
        // ❌ User login nahi hai
        this.router.navigate(['/auth']);
      }
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

  showNavigation() {
    return !(this.router.url.includes('auth'));
  }

  /**
   * Get nav items with translated labels
   */
  getNavItemsWithTranslations() {
    return this.navItems.map(item => ({
      ...item,
      label: this.getNavLabel(item.label)
    }));
  }
}
