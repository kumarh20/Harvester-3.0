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
    });
  }

  isActive(path: string): boolean {
    return this.activeRoute === path;
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
