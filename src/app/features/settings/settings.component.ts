import { Component, signal, computed, ViewEncapsulation, OnInit, OnDestroy, effect } from '@angular/core';
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
import { Router, ActivatedRoute } from '@angular/router';
import { ToastService } from '../../shared/services/toast.service';
import { NotificationService } from '../../core/services/notification.service';
import { UiPreferencesService, DefaultRecordFilterSetting } from '../../core/services/ui-preferences.service';
import { SeasonService } from '../../core/services/season.service';
import { Season, HINDI_MONTHS, getSeasonDisplayLabel } from '../../core/models/season.model';
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
export class SettingsComponent implements OnInit, OnDestroy {
  // Active Modal Signal ('harvesters' | 'rates' | 'seasons' | 'land' | 'preferences' | 'data' | 'about' | null)
  activeModal = signal<'harvesters' | 'rates' | 'seasons' | 'land' | 'preferences' | 'data' | 'about' | null>(null);

  // Season management state
  isSeasonFormOpen = signal<boolean>(false);
  editingSeasonId = signal<string | null>(null);
  seasonNameInput = signal<string>('');
  seasonStartMonthInput = signal<number>(10); // default October
  seasonEndMonthInput = signal<number>(12); // default December
  seasonYearInput = signal<number>(new Date().getFullYear());
  isSavingSeason = signal<boolean>(false);
  hindiMonths = HINDI_MONTHS;

  // Operator profile
  currentUser = signal<User | null>(null);
  userName = signal<string>('Harvester Operator');
  userPhone = signal<string>('+91 XXXXXXXXXX');
  userBusinessName = signal<string>('Agri Cutting Contractor');
  userPhoto = computed(() => this.userService.userProfile()?.photoURL || '');
  isSyncing = signal<boolean>(false);
  isUploadingPhoto = signal<boolean>(false);

  // Theme preference signal
  isDarkMode = signal(false);

  // Language preference signal - computed from LanguageService
  language = computed(() => this.languageService.getCurrentLanguage());

  // Notifications preference signal
  notificationsEnabled = signal(true);

  // Bottom navigation labels visibility signal (default: hidden/false)
  showNavLabels = computed(() => this.uiPreferencesService.showNavLabels());

  // Default records filter preference (today | week | month | all)
  defaultRecordFilter = computed(() => this.uiPreferencesService.defaultRecordFilter());

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
    private route: ActivatedRoute,
    public harvesterService: HarvesterService,
    private recordsService: RecordsService,
    private dataImportExportService: DataImportExportService,
    private toastService: ToastService,
    public notificationService: NotificationService,
    private uiPreferencesService: UiPreferencesService,
    public seasonService: SeasonService
  ) {
    this.loadSettings();

    // Auto toggle body class for bottom nav suppression & iOS stacking fixes
    effect(() => {
      const modal = this.activeModal();
      if (modal) {
        document.body.classList.add('settings-modal-open');
      } else {
        document.body.classList.remove('settings-modal-open');
      }
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('settings-modal-open');
  }

  async ngOnInit(): Promise<void> {
    this.harvestersLoading.set(true);
    try {
      await Promise.all([
        this.harvesterService.loadHarvesters(),
        this.recordsService.loadRecords(),
        this.seasonService.loadSeasons()
      ]);
    } finally {
      this.harvestersLoading.set(false);
    }

    this.route.queryParams.subscribe(params => {
      if (params['open'] === 'seasons') {
        this.openModal('seasons');
      }
    });

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

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Please select a valid image file');
      return;
    }

    const user = this.currentUser();
    if (!user) return;

    try {
      this.isUploadingPhoto.set(true);
      const compressedBase64 = await this.userService.compressImage(file, 256, 256);
      await this.userService.updateUserPhoto(user.uid, compressedBase64);
      this.toastService.success('Profile photo updated successfully!');
    } catch (err) {
      console.error('Error uploading photo:', err);
      this.toastService.error('Failed to upload photo');
    } finally {
      this.isUploadingPhoto.set(false);
      input.value = '';
    }
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
   * Toggle notifications and request system permission if enabled
   */
  async onNotificationsToggle(value: boolean): Promise<void> {
    this.notificationsEnabled.set(value);
    localStorage.setItem('notifications', value ? 'true' : 'false');
    if (value) {
      await this.notificationService.requestPermission();
    } else {
      const isHi = this.languageService.getCurrentLanguage() === 'hi';
      this.toastService.info(isHi ? 'सूचनाएं बंद कर दी गई हैं' : 'Notifications disabled');
    }
  }

  /**
   * Toggle bottom navigation text labels visibility
   */
  onNavLabelsToggle(value: boolean): void {
    this.uiPreferencesService.setShowNavLabels(value);
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    if (value) {
      this.toastService.success(isHi ? 'नेविगेशन टेक्स्ट लेबल चालू हैं' : 'Bottom navigation labels shown');
    } else {
      this.toastService.info(isHi ? 'नेविगेशन लेबल छिपा दिए गए हैं (कॉम्पैक्ट डॉक)' : 'Bottom navigation labels hidden (compact dock)');
    }
  }

  /**
   * Set default records date filter
   */
  setDefaultRecordFilter(filter: DefaultRecordFilterSetting): void {
    this.uiPreferencesService.setDefaultRecordFilter(filter);
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    const names: Record<DefaultRecordFilterSetting, string> = {
      today: isHi ? 'आज (Today)' : 'Today',
      week: isHi ? 'इस सप्ताह (This Week)' : 'This Week',
      month: isHi ? 'इस महीने (This Month)' : 'This Month',
      all: isHi ? 'सभी रिकॉर्ड (All Time)' : 'All Records'
    };
    this.toastService.success(
      isHi ? `डिफ़ॉल्ट फ़िल्टर "${names[filter]}" सेट किया गया` : `Default filter set to "${names[filter]}"`
    );
  }

  /**
   * Send a test mobile system notification
   */
  async sendTestNotification(): Promise<void> {
    await this.notificationService.sendTestNotification();
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

  isDefaultHarvester(name: string): boolean {
    return this.harvesterService.defaultHarvester() === name;
  }

  async setDefaultHarvester(name: string): Promise<void> {
    if (!name || !name.trim()) return;
    try {
      await this.harvesterService.setDefaultHarvester(name.trim());
      const isHi = this.languageService.getCurrentLanguage() === 'hi';
      this.toastService.success(
        isHi
          ? `डिफ़ॉल्ट मशीन "${name}" सेट की गई! (फॉर्म में अपने आप आएगी)`
          : `"${name}" set as default harvester in cutting forms!`
      );
    } catch {
      this.toastService.error(this.translationService.get('messages.updateError'));
    }
  }

  openAddHarvesterDialog(): void {
    const data: HarvesterDialogData = { mode: 'add', isDefault: false };
    const dialogRef = this.matDialog.open(HarvesterDialogComponent, {
      width: '400px',
      data,
      panelClass: 'custom-dialog-container'
    });
    dialogRef.afterClosed().subscribe(async (result: any) => {
      if (result) {
        const name = typeof result === 'string' ? result : result.name;
        const makeDefault = typeof result === 'object' ? !!result.makeDefault : false;
        if (!name?.trim()) return;
        try {
          await this.harvesterService.addHarvester(name, makeDefault);
          this.toastService.success(this.translationService.get('messages.recordSaved'));
          if (makeDefault) {
            const isHi = this.languageService.getCurrentLanguage() === 'hi';
            this.toastService.info(
              isHi ? `"${name}" को फॉर्म के लिए डिफ़ॉल्ट चुना गया` : `"${name}" set as default for form`
            );
          }
        } catch (e) {
          this.toastService.error(this.translationService.get('messages.saveError'));
        }
      }
    });
  }

  openEditHarvesterDialog(index: number): void {
    const list = this.harvesterService.harvesters();
    const currentName = list[index] ?? '';
    const isDefault = this.isDefaultHarvester(currentName);
    const data: HarvesterDialogData = { mode: 'edit', currentName, isDefault };
    const dialogRef = this.matDialog.open(HarvesterDialogComponent, {
      width: '400px',
      data,
      panelClass: 'custom-dialog-container'
    });
    dialogRef.afterClosed().subscribe(async (result: any) => {
      if (result) {
        const name = typeof result === 'string' ? result : result.name;
        const makeDefault = typeof result === 'object' ? !!result.makeDefault : isDefault;
        if (!name?.trim()) return;
        try {
          await this.harvesterService.updateHarvester(index, name, makeDefault);
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

  navigateToLandMeasurement(): void {
    this.router.navigate(['/measure']);
  }

  // --- Modal Management ---
  openModal(modal: 'harvesters' | 'rates' | 'seasons' | 'land' | 'preferences' | 'data' | 'about'): void {
    this.activeModal.set(modal);
    if (modal === 'seasons') {
      this.closeSeasonForm();
      this.seasonService.loadSeasons();
    }
  }

  closeModal(): void {
    this.activeModal.set(null);
    this.closeSeasonForm();
  }

  getHarvesterSummary(): string {
    const count = this.harvesterService.harvesters().length;
    const def = this.harvesterService.defaultHarvester() || this.harvesterService.harvesters()[0] || 'Vardhman Chayan';
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    return `${count} ${isHi ? 'मशीनें' : 'Machines'} • ${def}`;
  }

  getRateSummary(): string {
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    const unitLabel = this.preferredUnit() === 'acre' 
      ? (isHi ? 'एकड़' : 'Acre') 
      : this.preferredUnit() === 'bigha' 
        ? (isHi ? 'बीघा' : 'Bigha') 
        : (isHi ? 'हेक्टेयर' : 'Hectare');
    return `₹${this.defaultRate().toLocaleString('en-IN')} / ${unitLabel}`;
  }

  getSeasonSummary(): string {
    const list = this.seasonService.seasons();
    const count = list.length;
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    if (count === 0) {
      return isHi ? 'कोई सीज़न नहीं' : 'No seasons';
    }
    const def = this.seasonService.defaultSeason();
    const defLabel = def ? `${def.name} ${def.year}` : (isHi ? 'डिफ़ॉल्ट सेट नहीं' : 'No default');
    return `${count} ${isHi ? 'सीज़न' : 'Seasons'} • ${defLabel}`;
  }

  openAddSeasonForm(): void {
    this.editingSeasonId.set(null);
    this.seasonNameInput.set('');
    this.seasonStartMonthInput.set(10);
    this.seasonEndMonthInput.set(12);
    this.seasonYearInput.set(new Date().getFullYear());
    this.isSeasonFormOpen.set(true);
  }

  openEditSeasonForm(season: Season): void {
    this.editingSeasonId.set(season.id || null);
    this.seasonNameInput.set(season.name);
    this.seasonStartMonthInput.set(Number(season.startMonth) || 1);
    this.seasonEndMonthInput.set(Number(season.endMonth) || 12);
    this.seasonYearInput.set(Number(season.year) || new Date().getFullYear());
    this.isSeasonFormOpen.set(true);
  }

  duplicateSeason(season: Season): void {
    this.editingSeasonId.set(null);
    this.seasonNameInput.set(season.name);
    this.seasonStartMonthInput.set(Number(season.startMonth) || 1);
    this.seasonEndMonthInput.set(Number(season.endMonth) || 12);
    const nextYear = (Number(season.year) || new Date().getFullYear()) + 1;
    this.seasonYearInput.set(nextYear);
    this.isSeasonFormOpen.set(true);
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    this.toastService.info(
      isHi 
        ? `सीज़न "${season.name}" वर्ष ${nextYear} के लिए डुप्लिकेट किया गया। विवरण जांचें और सहेजें।`
        : `Duplicated "${season.name}" for year ${nextYear}. Review and save.`
    );
  }

  closeSeasonForm(): void {
    this.isSeasonFormOpen.set(false);
    this.editingSeasonId.set(null);
  }

  async saveSeason(): Promise<void> {
    const name = this.seasonNameInput().trim();
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    if (!name) {
      this.toastService.error(isHi ? 'कृपया सीज़न का नाम दर्ज करें' : 'Please enter season name');
      return;
    }
    const year = Number(this.seasonYearInput());
    if (isNaN(year) || year < 2000 || year > 2100) {
      this.toastService.error(isHi ? 'कृपया मान्य वर्ष दर्ज करें (उदा. 2027)' : 'Please enter a valid year');
      return;
    }

    this.isSavingSeason.set(true);
    try {
      if (this.editingSeasonId()) {
        await this.seasonService.updateSeason(this.editingSeasonId()!, {
          name,
          startMonth: Number(this.seasonStartMonthInput()),
          endMonth: Number(this.seasonEndMonthInput()),
          year
        });
        this.toastService.success(isHi ? 'सीज़न सफलतापूर्वक अपडेट किया गया!' : 'Season updated successfully!');
      } else {
        await this.seasonService.addSeason({
          name,
          startMonth: Number(this.seasonStartMonthInput()),
          endMonth: Number(this.seasonEndMonthInput()),
          year
        });
        this.toastService.success(isHi ? 'नया सीज़न सफलतापूर्वक जोड़ा गया!' : 'New season added successfully!');
      }
      this.closeSeasonForm();
    } catch (err) {
      console.error('Error saving season:', err);
      this.toastService.error(isHi ? 'सीज़न सहेजने में त्रुटि' : 'Error saving season');
    } finally {
      this.isSavingSeason.set(false);
    }
  }

  async setAsDefaultSeason(season: Season): Promise<void> {
    if (!season.id || season.isDefault) return;
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    try {
      await this.seasonService.setDefaultSeason(season.id);
      this.toastService.success(
        isHi 
          ? `"${season.name} ${season.year}" को डिफ़ॉल्ट सीज़न सेट किया गया!` 
          : `"${season.name} ${season.year}" set as default season!`
      );
    } catch (err) {
      console.error('Error setting default season:', err);
      this.toastService.error(isHi ? 'डिफ़ॉल्ट सेट करने में त्रुटि' : 'Failed to set default season');
    }
  }

  deleteSeason(season: Season): void {
    if (!season.id) return;
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    const label = getSeasonDisplayLabel(season);
    this.dialogService.confirm(
      isHi 
        ? `क्या आप वाकई सीज़न "${label}" को हटाना चाहते हैं?` 
        : `Are you sure you want to delete season "${label}"?`,
      isHi ? 'सीज़न हटाएं' : 'Delete Season',
      isHi ? 'हटाएं' : 'Delete',
      isHi ? 'रद्द करें' : 'Cancel',
      'warning'
    ).subscribe(async (confirmed) => {
      if (confirmed) {
        try {
          await this.seasonService.deleteSeason(season.id!);
          this.toastService.success(isHi ? 'सीज़न हटा दिया गया' : 'Season deleted');
        } catch (err) {
          console.error('Error deleting season:', err);
          this.toastService.error(isHi ? 'हटाने में त्रुटि' : 'Failed to delete season');
        }
      }
    });
  }

  getPreferencesSummary(): string {
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    const themeTxt = this.isDarkMode() ? (isHi ? 'डार्क' : 'Dark') : (isHi ? 'लाइट' : 'Light');
    const langTxt = this.language() === 'hi' ? 'हिन्दी' : 'English';
    return `${themeTxt} • ${langTxt}`;
  }

  getLandSummary(): string {
    return 'GPS Walk & Map Boundary';
  }

  getDataSummary(): string {
    const isHi = this.languageService.getCurrentLanguage() === 'hi';
    return isHi ? 'बैकअप, एक्सपोर्ट व इम्पोर्ट' : 'Backup, Export & Import';
  }

  getAboutSummary(): string {
    return 'v2.4.0 • PRO';
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


