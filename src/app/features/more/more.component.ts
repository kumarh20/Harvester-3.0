import { Component, signal, ViewEncapsulation, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogService } from '../../shared/services/dialog.service';
import { TranslationService } from '../../shared/services/translation.service';
import { AuthService } from '../../services/auth/auth-service';
import { UserService } from '../../services/user/user-service';
import { HarvesterService } from '../../core/services/harvester.service';
import { RecordsService } from '../../core/services/records.service';
import { DataImportExportService } from '../../core/services/data-import-export.service';
import { ToastService } from '../../shared/services/toast.service';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { ProfileDialogComponent, ProfileDialogData } from '../../shared/components/profile-dialog/profile-dialog.component';

interface Option {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: () => void;
}

interface UserData {
  uid: string;
  name: string;
  phone: string;
  businessName?: string;
  createdAt: any;
  lastLoginAt: any;
}

@Component({
  selector: 'app-more',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatDialogModule
  ],
  templateUrl: './more.component.html',
  styleUrl: './more.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class MoreComponent implements OnInit {
  // User data signals
  currentUser = signal<User | null>(null);
  userData = signal<UserData | null>(null);
  userName = signal<string>('Harvester Operator');
  userPhone = signal<string>('+91 XXXXXXXXXX');
  userBusinessName = signal<string>('Agri Cutting Contractor');

  // Stats computed from services
  totalRecords = computed(() => this.recordsService.records().length);
  totalAcres = computed(() => {
    const sum = this.recordsService.records().reduce((acc, r) => acc + (Number(r.landInAcres) || 0), 0);
    return Number(sum.toFixed(1));
  });
  totalHarvesters = computed(() => this.harvesterService.harvesters().length);

  // User initials for avatar
  userInitials = computed(() => {
    const name = this.userName().trim();
    if (!name) return 'OP';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  appVersion = '1.0.0';
  appName = computed(() => this.translationService.get('app.appTitle'));

  options = computed<Option[]>(() => {
    this.translationService.t();
    return [
      {
        id: 'measure',
        title: this.translationService.get('more.landTracker'),
        description: this.translationService.get('more.landTrackerDesc'),
        icon: 'straighten',
        action: () => this.router.navigate(['/measure'])
      },
      {
        id: 'settings',
        title: this.translationService.get('more.settingsTitle'),
        description: this.translationService.get('more.settingsDesc'),
        icon: 'settings',
        action: () => this.router.navigate(['/settings'])
      },
      {
        id: 'export',
        title: this.translationService.get('more.exportTitle'),
        description: this.translationService.get('more.exportDesc'),
        icon: 'download',
        action: () => this.exportData()
      },
      {
        id: 'import',
        title: this.translationService.get('more.importTitle'),
        description: this.translationService.get('more.importDesc'),
        icon: 'upload_file',
        action: () => this.importData()
      },
      {
        id: 'about',
        title: this.translationService.get('more.about'),
        description: this.translationService.get('more.version') + ' ' + this.appVersion,
        icon: 'info',
        action: () => this.showAbout()
      }
    ];
  });

  expandedAbout = signal(false);
  expandedHelp = signal(false);
  expandedContact = signal(false);

  constructor(
    private dialogService: DialogService,
    private matDialog: MatDialog,
    public translationService: TranslationService,
    private authService: AuthService,
    private userService: UserService,
    public harvesterService: HarvesterService,
    public recordsService: RecordsService,
    private dataImportExportService: DataImportExportService,
    private toastService: ToastService,
    private auth: Auth,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Load records and machines for real stats
    this.recordsService.loadRecords();
    this.harvesterService.loadHarvesters();

    // Listen to auth state changes
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser.set(user);
      if (user) {
        await this.loadUserData(user.uid);
      }
    });
  }

  private async loadUserData(uid: string): Promise<void> {
    try {
      const data = await this.userService.getUser(uid) as UserData;
      if (data) {
        this.userData.set(data);
        if (data.name) this.userName.set(data.name);
        if (data.phone) this.userPhone.set(data.phone);
        if (data.businessName) this.userBusinessName.set(data.businessName);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  /**
   * Open modal to edit operator profile
   */
  openEditProfileDialog(): void {
    const dialogData: ProfileDialogData = {
      name: this.userName(),
      phone: this.userPhone() === '+91 XXXXXXXXXX' ? '' : this.userPhone(),
      businessName: this.userBusinessName() === 'Agri Cutting Contractor' ? '' : this.userBusinessName()
    };

    const dialogRef = this.matDialog.open(ProfileDialogComponent, {
      width: '440px',
      data: dialogData,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(async (result: ProfileDialogData | null) => {
      if (!result) return;

      const user = this.currentUser();
      if (!user) {
        // Preview fallback
        this.userName.set(result.name);
        if (result.phone) this.userPhone.set(result.phone);
        if (result.businessName) this.userBusinessName.set(result.businessName);
        this.toastService.success('Profile updated successfully!');
        return;
      }

      try {
        await this.userService.updateUserProfile(
          user.uid,
          result.name,
          result.phone,
          { businessName: result.businessName }
        );

        this.userName.set(result.name);
        this.userPhone.set(result.phone || '');
        if (result.businessName) {
          this.userBusinessName.set(result.businessName);
        }

        this.toastService.success('Profile updated successfully!');
      } catch (err) {
        console.error('Failed to update profile:', err);
        this.toastService.error('Failed to save profile changes.');
      }
    });
  }

  /**
   * Copy operator account ID
   */
  copyUid(): void {
    const user = this.currentUser();
    const id = user?.uid || 'HARV-OPERATOR-1';
    navigator.clipboard.writeText(id).then(() => {
      this.toastService.success('Account ID copied to clipboard!');
    }).catch(() => {
      this.toastService.info(`Account ID: ${id}`);
    });
  }

  /**
   * Export harvester data to CSV
   */
  exportData(): void {
    try {
      this.dataImportExportService.exportToCSV();
      this.toastService.success(this.translationService.get('messages.dataExported'));
    } catch (e: any) {
      if (e?.message === 'NO_DATA') {
        this.dialogService.alert(
          this.translationService.get('messages.noDataToExport'),
          'Export Records',
          'info'
        );
      } else {
        this.toastService.error(this.translationService.get('messages.saveError'));
      }
    }
  }

  /**
   * Import harvester data from CSV/JSON
   */
  importData(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.txt';

    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const parsed = await this.dataImportExportService.parseFile(file);
        if (!parsed || parsed.length === 0) {
          this.dialogService.alert('No valid records found in selected file.', 'Import', 'warning');
          return;
        }

        this.dialogService.confirm(
          `Found ${parsed.length} records in "${file.name}". Import them now?`,
          'Import Records',
          'Import Now',
          'Cancel',
          'info'
        ).subscribe(async (confirmed) => {
          if (confirmed) {
            const res = await this.dataImportExportService.importRecords(parsed);
            if (res.importedCount > 0) {
              this.toastService.success(`Imported ${res.importedCount} records successfully!`);
              this.recordsService.loadRecords();
            } else {
              this.toastService.error('Could not import records.');
            }
          }
        });
      } catch (err: any) {
        this.toastService.error(`File reading error: ${err?.message || 'Error'}`);
      }
    };

    input.click();
  }

  /**
   * Show about information
   */
  showAbout(): void {
    this.expandedAbout.set(!this.expandedAbout());
  }

  /**
   * Share app information
   */
  shareApp(): void {
    const text = `${this.appName()} - ${this.translationService.get('more.description')}`;

    if (navigator.share) {
      navigator.share({
        title: this.appName(),
        text: text
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      this.toastService.success('App link copied to clipboard!');
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
