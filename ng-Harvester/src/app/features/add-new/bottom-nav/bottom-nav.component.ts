import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss'],
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class BottomNavComponent {
  activeRoute: string = '/home';
  activeIndex: number = 0;

  navItems: NavItem[] = [
    { path: '/home', icon: 'home', label: 'Home' },
    { path: '/scan', icon: 'scan', label: 'Scan' },
    { path: '/profile', icon: 'person', label: 'Profile' },
    { path: '/settings', icon: 'settings', label: 'Settings' }
  ];

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.activeRoute = event.urlAfterRedirects;
      this.updateActiveIndex();
    });
    
    // Initialize active index
    this.updateActiveIndex();
  }

  updateActiveIndex(): void {
    const index = this.navItems.findIndex(item => item.path === this.activeRoute);
    if (index !== -1) {
      this.activeIndex = index;
    }
  }

  isActive(path: string): boolean {
    return this.activeRoute === path;
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
  
  getSliderStyle(): any {
    const totalItems = this.navItems.length;
    const gapSize = 8; // 8px gap between items
    const totalGaps = (totalItems - 1) * gapSize;
    
    // Calculate available width for items (container width minus gaps and padding)
    // Using calc to account for dynamic widths
    const itemWidthPercent = (100 / totalItems);
    
    // Calculate position including gaps
    const gapOffset = this.activeIndex * gapSize;
    
    return {
      transform: `translateX(calc(${this.activeIndex * itemWidthPercent}% + ${gapOffset}px))`,
      width: `calc(${itemWidthPercent}% - ${gapSize}px)`
    };
  }
}
