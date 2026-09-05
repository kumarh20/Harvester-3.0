import { Component, output, signal, computed, OnInit, NgZone, ViewChild, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Auth, onAuthStateChanged, signOut, User } from '@angular/fire/auth';
import { TranslationService } from '../../services/translation.service';
import { LanguageService } from '../../services/language.service';
import { UserService } from '../../../services/user/user-service';
import { AuthService } from '../../../services/auth/auth-service';
import { ToastService } from '../../services/toast.service';
import { ProfileDialogComponent, ProfileDialogData } from '../profile-dialog/profile-dialog.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, MatIconModule, MatDialogModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown.escape)': 'closeProfileMenu()'
  }
})
export class HeaderComponent implements OnInit {
  themeToggle = output<void>();
  languageToggle = output<void>();
  
  // Services
  public translationService = inject(TranslationService);
  private languageService = inject(LanguageService);
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);
  public userService = inject(UserService);
  private toastService = inject(ToastService);
  private matDialog = inject(MatDialog);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  // Auth and profile signals
  currentUser = signal<User | null>(null);
  userProfile = computed(() => this.userService.userProfile());
  isProfileMenuOpen = signal<boolean>(false);
  isUploadingPhoto = signal<boolean>(false);
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
    onAuthStateChanged(this.auth, (user) => {
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
    this.themeToggle.emit();
  }

  onLanguageToggle(): void {
    this.languageToggle.emit();
  }

  getCurrentLanguage(): string {
    return this.languageService.getCurrentLanguage();
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(v => !v);
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  onDocumentPointerDown(event: Event): void {
    if (!this.isProfileMenuOpen()) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const profileCard = this.elementRef.nativeElement.querySelector('#header-profile-dropdown');
    const profileBtn = this.elementRef.nativeElement.querySelector('#header-user-profile-btn');

    // If clicked inside the dropdown card or the toggle button, do not close here
    if (profileCard?.contains(target) || profileBtn?.contains(target)) {
      return;
    }

    // Otherwise, user clicked outside (on page content, bottom navigation, margins, etc.)
    this.closeProfileMenu();
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

  openEditProfileDialog(): void {
    this.closeProfileMenu();
    const currentName = this.displayName();
    const currentPhone = this.userPhone();
    const currentBusiness = this.userBusinessName();

    const dialogData: ProfileDialogData = {
      name: currentName === 'Operator' || currentName === 'ऑपरेटर' ? '' : currentName,
      phone: currentPhone,
      businessName: currentBusiness
    };

    const dialogRef = this.matDialog.open(ProfileDialogComponent, {
      width: '440px',
      data: dialogData,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        const user = this.currentUser();
        if (user) {
          try {
            await this.userService.updateUserProfile(user.uid, result.name, result.phone, {
              businessName: result.businessName
            });
            this.toastService.success(
              this.translationService.getCurrentLanguage() === 'hi'
                ? 'प्रोफाइल सफलतापूर्वक अपडेट हुई!'
                : 'Profile updated successfully!'
            );
          } catch (error) {
            this.toastService.error('Failed to update profile');
          }
        }
      }
    });
  }

  navigateToSettings(): void {
    this.closeProfileMenu();
    this.router.navigate(['/settings']);
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

