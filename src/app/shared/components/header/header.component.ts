import { Component, output, signal, computed, OnInit, NgZone, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Auth, authState, User } from '@angular/fire/auth';
import { signOut } from 'firebase/auth';
import { TranslationService } from '../../services/translation.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { UserService } from '../../../services/user/user-service';
import { AuthService } from '../../../services/auth/auth-service';
import { ToastService } from '../../services/toast.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ProfileDialogComponent, ProfileDialogData } from '../profile-dialog/profile-dialog.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, MatIconModule, MatDialogModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  host: {
    '[class.menu-open]': 'isProfileMenuOpen()',
    '(document:keydown.escape)': 'closeProfileMenu()'
  }
})
export class HeaderComponent implements OnInit {
  themeToggle = output<void>();
  languageToggle = output<void>();
  
  // Services
  public translationService = inject(TranslationService);
  private languageService = inject(LanguageService);
  public themeService = inject(ThemeService);
  public notificationService = inject(NotificationService);
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);
  public userService = inject(UserService);
  private toastService = inject(ToastService);
  private matDialog = inject(MatDialog);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  // Unread notifications badge
  unreadNotificationCount = computed(() => this.notificationService.unreadCount());

  // Theme signal
  isDarkMode = computed(() => this.themeService.isDarkMode());

  // Auth and profile signals
  currentUser = signal<User | null>(null);
  userProfile = computed(() => this.userService.userProfile());
  isProfileMenuOpen = signal<boolean>(false);
  isUploadingPhoto = signal<boolean>(false);
  isReloading = signal<boolean>(false);
  currentUrl = signal<string>(this.router.url);

  @ViewChild('photoFileInput') photoFileInput?: ElementRef<HTMLInputElement>;

  isAuthPage = computed(() => {
    const url = this.currentUrl();
    return url.includes('/auth') || url.includes('/whatsapp-login');
  });

  showUserActions = computed(() => {
    return !!this.currentUser() && !this.isAuthPage();
  });

  // Derived user display computed signals
  displayName = computed(() => {
    const profile = this.userProfile();
    if (profile?.name && profile.name.trim() !== '') {
      return profile.name;
    }
    const user = this.currentUser();
    if (user?.displayName) {
      return user.displayName;
    }
    return this.translationService.getCurrentLanguage() === 'hi' ? 'ऑपरेटर' : 'Operator';
  });

  userPhotoURL = computed(() => {
    return this.userProfile()?.photoURL || '';
  });

  userBusinessName = computed(() => {
    return this.userProfile()?.businessName || '';
  });

  userPhone = computed(() => {
    const profile = this.userProfile();
    if (profile?.phone) return profile.phone;
    const user = this.currentUser();
    if (user?.email && user.email.includes('@harvester.app')) {
      return user.email.split('@')[0];
    }
    if (user?.phoneNumber) {
      return user.phoneNumber.replace('+91', '');
    }
    return '';
  });

  userInitials = computed(() => {
    const name = this.displayName();
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  constructor() {
    // Check initial auth state immediately
    if (this.auth.currentUser) {
      this.currentUser.set(this.auth.currentUser);
      const phone = this.auth.currentUser.email?.includes('@harvester.app') 
        ? this.auth.currentUser.email.split('@')[0] 
        : (this.auth.currentUser.phoneNumber || '');
      this.userService.loadUserProfile(this.auth.currentUser.uid, phone);
    }

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl.set(event.urlAfterRedirects || event.url);
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    // Listen to auth state changes and update signal
    authState(this.auth).subscribe((user) => {
      this.ngZone.run(() => {
        this.currentUser.set(user);
        if (user) {
          const phone = user.email?.includes('@harvester.app') 
            ? user.email.split('@')[0] 
            : (user.phoneNumber || '');
          this.userService.loadUserProfile(user.uid, phone);
        } else {
          this.userService.userProfile.set(null);
        }
        this.cdr.markForCheck();
      });
    });
  }

  onThemeToggle(): void {
    this.themeService.toggleTheme();
  }

  onLanguageToggle(): void {
    this.languageToggle.emit();
  }

  onReloadApp(): void {
    if (this.isReloading()) return;
    this.isReloading.set(true);
    
    this.toastService.info(
      this.translationService.getCurrentLanguage() === 'hi'
        ? 'ऐप रीफ्रेश हो रहा है...'
        : 'Refreshing app...'
    );

    setTimeout(() => {
      this.closeProfileMenu();
    }, 200);

    setTimeout(() => {
      window.location.reload();
    }, 400);
  }

  getCurrentLanguage(): string {
    return this.languageService.getCurrentLanguage();
  }

  isHindi(): boolean {
    return this.translationService.getCurrentLanguage() === 'hi';
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(v => !v);
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  triggerPhotoUpload(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.photoFileInput) {
      this.photoFileInput.nativeElement.click();
    }
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.toastService.error(
        this.translationService.getCurrentLanguage() === 'hi'
          ? 'कृपया मान्य फोटो फाइल (JPG, PNG) चुनें'
          : 'Please select a valid image file (JPG, PNG)'
      );
      return;
    }

    const user = this.currentUser();
    if (!user) return;

    try {
      this.isUploadingPhoto.set(true);
      const compressedBase64 = await this.userService.compressImage(file, 256, 256);
      await this.userService.updateUserPhoto(user.uid, compressedBase64);

      this.toastService.success(
        this.translationService.getCurrentLanguage() === 'hi'
          ? 'प्रोफाइल फोटो सफलतापूर्वक अपडेट हुई!'
          : 'Profile photo updated successfully!'
      );
    } catch (err) {
      console.error('Error uploading profile photo:', err);
      this.toastService.error(
        this.translationService.getCurrentLanguage() === 'hi'
          ? 'फोटो अपलोड करने में विफल'
          : 'Failed to upload photo'
      );
    } finally {
      this.isUploadingPhoto.set(false);
      input.value = '';
    }
  }

  navigateToProfile(): void {
    this.closeProfileMenu();
    this.router.navigate(['/profile']);
  }

  openEditProfileDialog(): void {
    this.navigateToProfile();
  }

  navigateToSettings(): void {
    this.closeProfileMenu();
    this.router.navigate(['/settings']);
  }

  navigateToNotifications(): void {
    this.closeProfileMenu();
    this.router.navigate(['/notifications']);
  }

  async onLogout(): Promise<void> {
    this.closeProfileMenu();
    try {
      this.currentUser.set(null);
      this.userService.userProfile.set(null);
      await this.authService.logout();
      this.toastService.info(
        this.translationService.getCurrentLanguage() === 'hi'
          ? 'सफलतापूर्वक लॉगआउट हुआ'
          : 'Signed out successfully'
      );
      this.ngZone.run(() => {
        this.router.navigate(['/auth']);
        this.cdr.markForCheck();
      });
    } catch (err) {
      console.error('Logout error:', err);
      await signOut(this.auth).catch(() => {});
      this.ngZone.run(() => {
        this.router.navigate(['/auth']);
        this.cdr.markForCheck();
      });
    }
  }
}

