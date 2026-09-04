import { Component, signal, computed, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { DialogService } from '../../shared/services/dialog.service';
import { TranslationService } from '../../shared/services/translation.service';
import { LanguageService } from '../../shared/services/language.service';
import { AuthService } from '../../services/auth/auth-service';
import { UserService } from '../../services/user/user-service';
import { HarvesterService } from '../../core/services/harvester.service';
import { RecordsService } from '../../core/services/records.service';
import { DataImportExportService } from '../../core/services/data-import-export.service';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';
import { HarvesterDialogComponent, HarvesterDialogData } from '../../shared/components/harvester-dialog/harvester-dialog.component';
import { ProfileDialogComponent, ProfileDialogData } from '../../shared/components/profile-dialog/profile-dialog.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    FormsModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SettingsComponent implements OnInit {
  // Operator profile
  currentUser = signal<User | null>(null);
  userName = signal<string>('Harvester Operator');
  userPhone = signal<string>('+91 XXXXXXXXXX');
  userBusinessName = signal<string>('Agri Cutting Contractor');
  isSyncing = signal<boolean>(false);

  // Theme preference signal
  isDarkMode = signal(false);

  // Language preference signal - computed from LanguageService
  language = computed(() => this.languageService.getCurrentLanguage());

  // Notifications preference signal
  notificationsEnabled = signal(true);

  // Preferred land measurement unit
  preferredUnit = signal<'acre' | 'bigha' | 'hectare'>('acre');

  // Currency format signal
  currencyFormat = signal('hi-IN'); // hi-IN for Indian Rupee, etc.

  // Default Cutting Rate
  defaultRate = signal<number>(2500);
  defaultRateInput = signal<number>(2500);

  // Derived rates for quick farmer reference
  ratePerBigha = computed(() => Math.round(this.defaultRate() / 2));
  ratePerHectare = computed(() => Math.round(this.defaultRate() * 2.471));

  // Harvester setup
  harvestersLoading = signal(false);
  harvesterSearch = signal<string>('');

  // Filtered harvesters based on search
  filteredHarvesters = computed(() => {
    const list = this.harvesterService.harvesters();
    const query = this.harvesterSearch().trim().toLowerCase();
    if (!query) return list;
    return list.filter(name => name.toLowerCase().includes(query));
  });

  // Data import/export state
  isImporting = signal(false);

  constructor(
    private dialogService: DialogService,
    private matDialog: MatDialog,
    public translationService: TranslationService,
    private languageService: LanguageService,
    private authService: AuthService,
    private userService: UserService,
    private auth: Auth,
    private router: Router,
    public harvesterService: HarvesterService,
    private recordsService: RecordsService,
    private dataImportExportService: DataImportExportService,
    private toastService: ToastService
  ) {
    this.loadSettings();
  }

  async ngOnInit(): Promise<void> {
    this.harvestersLoading.set(true);
    try {
      await Promise.all([
        this.harvesterService.loadHarvesters(),
        this.recordsService.loadRecords()
      ]);
    } finally {
      this.harvestersLoading.set(false);
    }

    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser.set(user);
      if (user) {
        await this.loadUserData(user.uid);
      }
    });
  }

  get operatorInitials(): string {
    const name = this.userName() || 'OP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private async loadUserData(uid: string): Promise<void> {
    try {
      this.isSyncing.set(true);
      const data = await this.userService.getUser(uid) as any;
      if (data) {
        if (data.name) this.userName.set(data.name);
        if (data.phone) this.userPhone.set(data.phone);
        if (data.businessName) this.userBusinessName.set(data.businessName);
      } else {
        const email = this.currentUser()?.email;
        if (email && email.includes('@harvester.app')) {
          const ph = email.split('@')[0];
          this.userPhone.set(ph);
        }
      }
    } catch (err) {
      console.error('Error loading user data in settings:', err);
    } finally {
      this.isSyncing.set(false);
    }
  }

  openEditProfileDialog(): void {
    const dialogData: ProfileDialogData = {
      name: this.userName() === 'Harvester Operator' ? '' : this.userName(),
      phone: this.userPhone() === '+91 XXXXXXXXXX' ? '' : this.userPhone(),
      businessName: this.userBusinessName() === 'Agri Cutting Contractor' ? '' : this.userBusinessName()
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
            this.userName.set(result.name);
            this.userPhone.set(result.phone);
            if (result.businessName) this.userBusinessName.set(result.businessName);
            this.toastService.success('Profile updated successfully!');
          } catch (error) {
            this.toastService.error('Failed to update profile');
          }
        }
      }
    });
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    const theme = localStorage.getItem('theme') || 'light';
    this.isDarkMode.set(theme === 'dark');

    const notifications = localStorage.getItem('notifications');
    this.notificationsEnabled.set(notifications !== 'false');

    const currency = localStorage.getItem('currency') || 'hi-IN';
    this.currencyFormat.set(currency);

    const savedUnit = (localStorage.getItem('preferredLandUnit') as any) || 'acre';
    this.preferredUnit.set(savedUnit);

    const savedRate = localStorage.getItem('defaultRatePerAcre');
    const rateVal = savedRate && !isNaN(Number(savedRate)) && Number(savedRate) > 0 ? Number(savedRate) : 2500;
    this.defaultRate.set(rateVal);
    this.defaultRateInput.set(rateVal);
  }

  /**
   * Save default cutting rate
   */
  saveDefaultRate(val?: number): void {
    const rate = val !== undefined ? val : Number(this.defaultRateInput());
    if (isNaN(rate) || rate <= 0) {
      this.toastService.error('Please enter a valid rate greater than 0');
      return;
    }
    this.defaultRate.set(rate);
    this.defaultRateInput.set(rate);
    localStorage.setItem('defaultRatePerAcre', String(rate));
    this.toastService.success(`Default rate updated to ₹${rate.toLocaleString('en-IN')}/Acre`);
  }

  /**
   * Quick rate preset
   */
  setDefaultRatePreset(rate: number): void {
    this.saveDefaultRate(rate);
  }

  /**
   * Step adjustment for cutting rate (+/-)
   */
  adjustRate(delta: number): void {
    const current = Number(this.defaultRateInput()) || 2500;
    const nextVal = Math.max(100, current + delta);
    this.defaultRateInput.set(nextVal);
    this.saveDefaultRate(nextVal);
  }

  /**
   * Set preferred unit
   */
  setPreferredUnit(unit: 'acre' | 'bigha' | 'hectare'): void {
    this.preferredUnit.set(unit);
    localStorage.setItem('preferredLandUnit', unit);
    const unitLabel = unit === 'acre' ? 'Acre (एकड़)' : unit === 'bigha' ? 'Bigha (बीघा)' : 'Hectare (हेक्टेयर)';
    this.toastService.success(`Default unit set to ${unitLabel}`);
  }

  /**
   * Toggle dark/light mode
   */
  onThemeToggle(value: boolean): void {
    this.isDarkMode.set(value);
    const theme = value ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  setThemeMode(dark: boolean): void {
    this.onThemeToggle(dark);
  }

  /**
   * Change language preference
   */
  onLanguageChange(lang: string): void {
    this.languageService.setLanguage(lang as 'hi' | 'en');
  }

  setLanguage(lang: 'hi' | 'en'): void {
    this.languageService.setLanguage(lang);
  }

  /**
   * Toggle notifications
   */
  onNotificationsToggle(value: boolean): void {
    this.notificationsEnabled.set(value);
    localStorage.setItem('notifications', value ? 'true' : 'false');
    this.toastService.info(value ? 'Notifications enabled' : 'Notifications disabled');
  }

  /**
   * Change currency format
   */
  onCurrencyChange(format: string): void {
    this.currencyFormat.set(format);
    localStorage.setItem('currency', format);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Export records data as CSV
   */
  exportData(): void {
    try {
      const records = this.recordsService.getAllRecords();
      if (!records || records.length === 0) {
        const local = localStorage.getItem('harvester_records');
        if (!local || JSON.parse(local).length === 0) {
          this.dialogService.alert(
            this.translationService.get('messages.noDataToExport'),
            'Export',
            'info'
          );
          return;
        }
      }
      this.dataImportExportService.exportToCSV();
      this.toastService.success(this.translationService.get('messages.dataExported'));
    } catch (e: any) {
      if (e?.message === 'NO_DATA') {
        this.dialogService.alert(
          this.translationService.get('messages.noDataToExport'),
          'Export',
          'info'
        );
      } else {
        this.toastService.error(this.translationService.get('messages.saveError'));
      }
    }
  }

  /**
   * Import records from CSV or JSON file
   */
  importData(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json,.txt';

    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      this.isImporting.set(true);
      try {
        const parsed = await this.dataImportExportService.parseFile(file);
        if (!parsed || parsed.length === 0) {
          this.dialogService.alert('No valid records found in the selected file.', 'Import Data', 'warning');
          return;
        }

        this.dialogService.confirm(
          `Found ${parsed.length} record(s) in "${file.name}". Do you want to import them now?`,
          'Import Records',
          'Import Now',
          'Cancel',
          'info'
        ).subscribe(async (confirmed) => {
          if (confirmed) {
            this.isImporting.set(true);
            try {
              const res = await this.dataImportExportService.importRecords(parsed);
              if (res.importedCount > 0) {
                this.toastService.success(`Successfully imported ${res.importedCount} record(s)!`);
                this.dialogService.alert(
                  `Import Summary:\n• Successfully imported: ${res.importedCount}\n• Skipped: ${res.skippedCount}`,
                  'Import Complete',
                  'success'
                );
              } else {
                this.dialogService.alert(
                  `Could not import records. Errors:\n${res.errors.slice(0, 3).join('\n')}`,
                  'Import Failed',
                  'error'
                );
              }
            } catch (err: any) {
              this.toastService.error(`Import failed: ${err?.message || 'Error'}`);
            } finally {
              this.isImporting.set(false);
            }
          }
        });

      } catch (err: any) {
        this.dialogService.alert(`File reading error: ${err?.message || 'Invalid format'}`, 'Error', 'error');
      } finally {
        this.isImporting.set(false);
      }
    };

    input.click();
  }

  /**
   * Clear all data (with confirmation)
   */
  clearAllData(): void {
    const confirmMessage = this.translationService.get('messages.deleteConfirm').replace('{{farmerName}}', 'all');
    
    this.dialogService.confirm(
      confirmMessage,
      this.translationService.get('messages.deleteConfirmMessage'),
      this.translationService.get('common.delete'),
      this.translationService.get('common.cancel'),
      'warning'
    ).subscribe(confirmed => {
      if (confirmed) {
        localStorage.removeItem('harvester_records');
        this.recordsService.clearAllRecords();
        this.dialogService.alert(
          this.translationService.get('messages.dataCleared'),
          this.translationService.get('common.save'),
          'success'
        );
      }
    });
  }

  /**
   * Reset settings to default
   */
  resetSettings(): void {
    const confirmMessage = this.translationService.get('messages.resetConfirm');
    
    this.dialogService.confirm(
      confirmMessage,
      this.translationService.get('messages.resetConfirmMessage'),
      this.translationService.get('settings.resetButton'),
      this.translationService.get('common.cancel'),
      'warning'
    ).subscribe(confirmed => {
      if (confirmed) {
        localStorage.removeItem('theme');
        localStorage.removeItem('language');
        localStorage.removeItem('notifications');
        localStorage.removeItem('currency');
        localStorage.removeItem('defaultRatePerAcre');
        localStorage.removeItem('preferredLandUnit');
        this.loadSettings();
        document.documentElement.setAttribute('data-theme', 'light');
        this.dialogService.alert(
          this.translationService.get('messages.settingsReset'),
          this.translationService.get('common.save'),
          'success'
        );
      }
    });
  }

  // --- Harvester Setup ---
  get canRemoveHarvester(): boolean {
    return this.harvesterService.harvesters().length > 1;
  }

  openAddHarvesterDialog(): void {
    const data: HarvesterDialogData = { mode: 'add' };
    const dialogRef = this.matDialog.open(HarvesterDialogComponent, {
      width: '400px',
      data,
      panelClass: 'custom-dialog-container'
    });
    dialogRef.afterClosed().subscribe(async (result: string | null) => {
      if (result) {
        try {
          await this.harvesterService.addHarvester(result);
          this.toastService.success(this.translationService.get('messages.recordSaved'));
        } catch (e) {
          this.toastService.error(this.translationService.get('messages.saveError'));
        }
      }
    });
  }

  openEditHarvesterDialog(index: number): void {
    const list = this.harvesterService.harvesters();
    const currentName = list[index] ?? '';
    const data: HarvesterDialogData = { mode: 'edit', currentName };
    const dialogRef = this.matDialog.open(HarvesterDialogComponent, {
      width: '400px',
      data,
      panelClass: 'custom-dialog-container'
    });
    dialogRef.afterClosed().subscribe(async (result: string | null) => {
      if (result) {
        try {
          await this.harvesterService.updateHarvester(index, result);
          this.toastService.success(this.translationService.get('messages.recordUpdated'));
        } catch (e) {
          this.toastService.error(this.translationService.get('messages.updateError'));
        }
      }
    });
  }

  async removeHarvester(index: number): Promise<void> {
    if (!this.canRemoveHarvester) return;
    this.dialogService.confirm(
      this.translationService.get('settings.removeHarvester') + '?',
      this.translationService.get('messages.deleteConfirmMessage'),
      this.translationService.get('common.delete'),
      this.translationService.get('common.cancel'),
      'warning'
    ).subscribe(async (confirmed) => {
      if (confirmed) {
        try {
          await this.harvesterService.removeHarvester(index);
          this.toastService.success(this.translationService.get('messages.recordDeleted'));
        } catch (e) {
          this.toastService.error(this.translationService.get('messages.deleteError'));
        }
      }
    });
  }

  logout(): void {
    this.dialogService.confirm(
      this.translationService.get('messages.logoutConfirm'),
      this.translationService.get('messages.logoutConfirmTitle'),
      this.translationService.get('settings.logout'),
      this.translationService.get('common.cancel'),
      'warning'
    ).subscribe(async (confirmed) => {
      if (confirmed) {
        await this.authService.logout().then(() => {
          this.toastService.success(this.translationService.get('messages.logoutSuccess'));
          this.router.navigate(['/auth']);
        });
      }
    });
  }
}


