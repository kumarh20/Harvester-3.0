import { Component, output, signal, computed, OnInit, NgZone, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged, signOut, User } from '@angular/fire/auth';
import { TranslationService } from '../../services/translation.service';
import { LanguageService } from '../../services/language.service';
import { UserService } from '../../../services/user/user-service';
import { ToastService } from '../../services/toast.service';
import { ProfileDialogComponent, ProfileDialogData } from '../profile-dialog/profile-dialog.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, MatIconModule, MatDialogModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  themeToggle = output<void>();
  languageToggle = output<void>();
  
  // Services
  public translationService = inject(TranslationService);
  private languageService = inject(LanguageService);
  private auth = inject(Auth);
  private ngZone = inject(NgZone);
  public userService = inject(UserService);
  private toastService = inject(ToastService);
  private matDialog = inject(MatDialog);
  private router = inject(Router);

  // Auth and profile signals
  currentUser = signal<User | null>(null);
  userProfile = computed(() => this.userService.userProfile());
  isProfileMenuOpen = signal<boolean>(false);
  isUploadingPhoto = signal<boolean>(false);

  @ViewChild('photoFileInput') photoFileInput?: ElementRef<HTMLInputElement>;

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
      this.userService.loadUserProfile(this.auth.currentUser.uid);
    }
  }

  ngOnInit(): void {
    // Listen to auth state changes and update signal
    onAuthStateChanged(this.auth, (user) => {
      this.ngZone.run(() => {
        this.currentUser.set(user);
        if (user) {
          this.userService.loadUserProfile(user.uid);
        }
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
      await signOut(this.auth);
      this.toastService.info(
        this.translationService.getCurrentLanguage() === 'hi'
          ? 'सफलतापूर्वक लॉगआउट हुआ'
          : 'Signed out successfully'
      );
      this.router.navigate(['/']);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
}

