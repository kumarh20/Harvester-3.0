import { Component, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../../services/user/user-service';
import { UiPreferencesService } from '../../../core/services/ui-preferences.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-bottom-navigation',
  imports: [CommonModule, MatIconModule],
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss'
})
export class BottomNavigationComponent {
  navItems = input.required<NavItem[]>();
  activeRoute = input.required<string>();
  
  navChange = output<string>();

  private userService = inject(UserService);
  private uiPreferencesService = inject(UiPreferencesService);

  showLabels = computed(() => this.uiPreferencesService.showNavLabels());

  userPhotoURL = computed(() => this.userService.userProfile()?.photoURL || '');
  userInitials = computed(() => {
    const profile = this.userService.userProfile();
    if (profile?.name) {
      const parts = profile.name.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return profile.name.slice(0, 2).toUpperCase();
    }
    return 'OP';
  });

  onNavChange(route: string): void {
    this.navChange.emit(route);
  }

  isActive(route: string): boolean {
    const currentRoute = this.activeRoute();
    if (currentRoute === route) {
      return true;
    }
    if (currentRoute.startsWith(route + '/')) {
      return true;
    }
    return false;
  }
}
