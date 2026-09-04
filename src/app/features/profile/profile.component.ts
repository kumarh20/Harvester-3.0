import { Component, signal, ViewEncapsulation, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogService } from '../../shared/services/dialog.service';
import { TranslationService } from '../../shared/services/translation.service';
import { AuthService } from '../../services/auth/auth-service';
import { UserService } from '../../services/user/user-service';
import { HarvesterService } from '../../core/services/harvester.service';
import { RecordsService } from '../../core/services/records.service';
import { ToastService } from '../../shared/services/toast.service';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { ProfileDialogComponent, ProfileDialogData } from '../../shared/components/profile-dialog/profile-dialog.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ProfileComponent implements OnInit {
  currentUser = signal<User | null>(null);
  userName = signal<string>('Harvester Operator');
  userPhone = signal<string>('+91 XXXXXXXXXX');
  userBusinessName = signal<string>('Agri Cutting Contractor');
  userPhoto = computed(() => this.userService.userProfile()?.photoURL || '');
  isSyncing = signal<boolean>(false);
  isUploadingPhoto = signal<boolean>(false);

  // Stats
  totalRecords = computed(() => this.recordsService.records().length);
  totalAcres = computed(() => {
    const sum = this.recordsService.records().reduce((acc, r) => acc + (Number(r.landInAcres) || 0), 0);
    return Number(sum.toFixed(1));
  });
  totalHarvesters = computed(() => this.harvesterService.harvesters().length);

  userInitials = computed(() => {
    const name = this.userName().trim();
    if (!name) return 'OP';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  appVersion = '2.4.0 (Build 2026.09)';

  constructor(
    private auth: Auth,
    private authService: AuthService,
    private userService: UserService,
    private recordsService: RecordsService,
    private harvesterService: HarvesterService,
    private toastService: ToastService,
    private dialogService: DialogService,
    private matDialog: MatDialog,
    public translationService: TranslationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
      if (user) {
        this.loadProfile();
      }
    });
  }

  private async loadProfile(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    try {
      this.isSyncing.set(true);
      const profile = await this.userService.loadUserProfile(user.uid);
      if (profile) {
        this.userName.set(profile.name || user.displayName || 'Harvester Operator');
        this.userPhone.set(profile.phone || user.phoneNumber || '+91 XXXXXXXXXX');
        this.userBusinessName.set(profile.businessName || 'Agri Cutting Contractor');
      } else {
        if (user.displayName) this.userName.set(user.displayName);
        if (user.phoneNumber) this.userPhone.set(user.phoneNumber);
      }
    } catch {
      if (user.displayName) this.userName.set(user.displayName);
      if (user.phoneNumber) this.userPhone.set(user.phoneNumber);
    } finally {
      this.isSyncing.set(false);
    }
  }

  openEditProfileDialog(): void {
    const dialogRef = this.matDialog.open(ProfileDialogComponent, {
      width: '92vw',
      maxWidth: '460px',
      panelClass: 'custom-dialog-container',
      data: {
        name: this.userName(),
        phone: this.userPhone(),
        businessName: this.userBusinessName()
      } as ProfileDialogData
    });

    dialogRef.afterClosed().subscribe(async (result: ProfileDialogData | undefined) => {
      if (!result) return;
      const user = this.currentUser();
      const uid = user?.uid || 'anonymous';
      try {
        this.isSyncing.set(true);
        await this.userService.updateUserProfile(uid, result.name, result.phone, {
          businessName: result.businessName
        });
        this.userName.set(result.name);
        this.userPhone.set(result.phone);
        this.userBusinessName.set(result.businessName || 'Agri Cutting Contractor');
        this.toastService.success(this.translationService.get('messages.recordUpdated'));
      } catch {
        this.toastService.error(this.translationService.get('messages.updateError'));
      } finally {
        this.isSyncing.set(false);
      }
    });
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastService.error('कृपया एक वैध छवि फ़ाइल चुनें (PNG/JPG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.toastService.error('फ़ाइल का आकार 2MB से कम होना चाहिए');
      return;
    }

    try {
      this.isUploadingPhoto.set(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const user = this.currentUser();
          const uid = user?.uid || 'anonymous';
          await this.userService.updateUserProfile(uid, this.userName(), this.userPhone(), {
            photoURL: base64Data
          });
          this.toastService.success('प्रोफ़ाइल फ़ोटो सफलतापूर्वक अपडेट की गई');
        } catch {
          this.toastService.error('फ़ोटो सहेजने में विफल');
        } finally {
          this.isUploadingPhoto.set(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      this.toastService.error('फ़ोटो लोड करने में विफल');
      this.isUploadingPhoto.set(false);
    }
  }

  async copyUid(): Promise<void> {
    const uid = this.currentUser()?.uid || 'HARV-OPERATOR-1';
    try {
      await navigator.clipboard.writeText(uid);
      this.toastService.success(this.translationService.get('messages.copiedToClipboard'));
    } catch {
      this.toastService.info(uid);
    }
  }

  async logout(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogService.confirm(
        this.translationService.get('messages.logoutConfirm'),
        this.translationService.get('messages.logoutConfirmTitle'),
        this.translationService.get('more.logout'),
        this.translationService.get('common.cancel'),
        'warning'
      )
    );

    if (!confirmed) return;

    try {
      await this.authService.logout();
      this.toastService.success(this.translationService.get('messages.logoutSuccess'));
      this.router.navigate(['/auth']);
    } catch {
      this.toastService.error(this.translationService.get('messages.logoutError'));
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
