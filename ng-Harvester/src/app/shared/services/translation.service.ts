import { Injectable, computed } from '@angular/core';
import { LanguageService, Language } from './language.service';

export interface Translations {
  // Common
  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    search: string;
    clear: string;
    update: string;
    loading: string;
    saving: string;
    updating: string;
    yes: string;
    no: string;
  };

  // Navigation
  nav: {
    dashboard: string;
    addNew: string;
    records: string;
    settings: string;
    more: string;
  };

  // Form Labels
  form: {
    farmerInfo: string;
    farmerName: string;
    farmerNamePlaceholder: string;
    contactNumber: string;
    contactNumberPlaceholder: string;
    date: string;
    harvester: string;
    landInAcres: string;
    landInAcresPlaceholder: string;
    ratePerAcre: string;
    ratePerAcrePlaceholder: string;
    totalAmount: string;
    cashPayment: string;
    cashPaymentPlaceholder: string;
    paymentDate: string;
    fullPaymentDate: string;
    addNewRecord: string;
    editRecord: string;
  };

  // Form Errors
  errors: {
    farmerNameRequired: string;
    contactNumberRequired: string;
    contactNumberInvalid: string;
    dateRequired: string;
    landRequired: string;
    rateRequired: string;
    cashExceedsTotal: string;
    fillAllFields: string;
  };

  // Records
  records: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    noRecords: string;
    noRecordsSubtitle: string;
    changeSearch: string;
    addNewRecord: string;
    date: string;
    land: string;
    rate: string;
    harvester: string;
    totalAmount: string;
    cashPaid: string;
    pendingAmount: string;
    fullPayment: string;
    editRecord: string;
    deleteRecord: string;
    shareRecord: string;
    today: string;
    yesterday: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    subtitle: string;
    selectPeriod: string;
    today: string;
    week: string;
    month: string;
    all: string;
    totalRecords: string;
    totalLand: string;
    totalAmount: string;
    totalCash: string;
    pendingAmount: string;
    averageLand: string;
    averageRate: string;
  };

  // App
  app: {
    appTitle: string;
    totalBalance: string;
  };

  // Messages
  messages: {
    recordSaved: string;
    recordUpdated: string;
    recordDeleted: string;
    recordMarkedAsPaid: string;
    markAsPaidConfirm: string;
    markAsPaidMessage: string;
    markAsPaidButton: string;
    saveError: string;
    updateError: string;
    deleteError: string;
    recordNotFound: string;
    deleteConfirm: string;
    deleteConfirmMessage: string;
    resetConfirm: string;
    resetConfirmMessage: string;
    noDataToExport: string;
    dataExported: string;
    dataImported: string;
    dataCleared: string;
    settingsReset: string;
    copiedToClipboard: string;
    logoutSuccess: string;
    logoutError: string;
  };

    // Settings
    settings: {
      title: string;
      subtitle: string;
      themeSettings: string;
      darkLightMode: string;
      themeDescription: string;
      preferences: string;
      notifications: string;
      notificationsDescription: string;
      language: string;
      languageDescription: string;
      languageHindi: string;
      languageEnglish: string;
      currencyFormat: string;
      currencyDescription: string;
      currencyINR: string;
      currencyUSD: string;
      currencyGBP: string;
      harvesterSetup: string;
      harvesterSetupDescription: string;
      harvesterCount: string;
      harvesterCountOne: string;
      addHarvester: string;
      harvesterNamePlaceholder: string;
      saveHarvester: string;
      editHarvester: string;
      removeHarvester: string;
      harvesterRequired: string;
      dataManagement: string;
      exportData: string;
      clearAllData: string;
      resetSettings: string;
      resetDescription: string;
      resetButton: string;
      logout: string;
    };

    // More
    more: {
      title: string;
      subtitle: string;
      about: string;
      appName: string;
      version: string;
      description: string;
      development: string;
      shareApp: string;
      help: string;
      helpSubtitle: string;
      howToAddRecord: string;
      howToAddRecordAnswer: string;
      howToEditRecord: string;
      howToEditRecordAnswer: string;
      howToExport: string;
      howToExportAnswer: string;
      howToChangeTheme: string;
      howToChangeThemeAnswer: string;
      contact: string;
      contactSubtitle: string;
      email: string;
      phone: string;
      location: string;
      locationValue: string;
      sendFeedback: string;
      logout: string;
      logoutDescription: string;
    };
}

// Helper function to get English translations (for now, Hindi uses English too)
const getEnglishTranslations = (): Translations => ({
  common: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    clear: 'Clear',
    update: 'Update',
    loading: 'Loading...',
    saving: 'Saving...',
    updating: 'Updating...',
    yes: 'Yes',
    no: 'No'
  },
  nav: {
    dashboard: 'Dashboard',
    addNew: 'Add New',
    records: 'Records',
    settings: 'Settings',
    more: 'More'
  },
  form: {
    farmerInfo: 'Farmer Information',
    farmerName: 'Farmer Name',
    farmerNamePlaceholder: 'Full Name',
    contactNumber: 'Mobile Number',
    contactNumberPlaceholder: '10 digits',
    date: 'Date',
    harvester: 'Harvester',
    landInAcres: 'Land (Acres)',
    landInAcresPlaceholder: '0.00',
    ratePerAcre: 'Rate (₹/Acre)',
    ratePerAcrePlaceholder: '2500',
    totalAmount: 'Total Amount',
    cashPayment: 'Cash Payment (₹)',
    cashPaymentPlaceholder: '0',
    paymentDate: 'Payment Date',
    fullPaymentDate: 'Full Payment Date',
    addNewRecord: 'Add New Record',
    editRecord: 'Edit Record'
  },
  errors: {
    farmerNameRequired: 'Please enter name (at least 2 characters)',
    contactNumberRequired: 'Please enter 10-digit mobile number',
    contactNumberInvalid: 'Please enter 10-digit mobile number',
    dateRequired: 'Please select date',
    landRequired: 'Please enter land area (greater than 0)',
    rateRequired: 'Please enter valid rate (greater than 1)',
    cashExceedsTotal: 'Cash amount cannot exceed total amount',
    fillAllFields: 'Please fill all required fields correctly'
  },
  records: {
    title: 'All Records',
    subtitle: 'Total {{count}} records found',
    searchPlaceholder: 'Search by name, number or date',
    noRecords: 'No records found',
    noRecordsSubtitle: 'Go to "Add New" tab to add new entry',
    changeSearch: 'Try changing your search',
    addNewRecord: 'Go to "Add New" tab to add new entry',
    date: 'Date',
    land: 'Land (Acres)',
    rate: 'Rate per Acre',
    harvester: 'Harvester',
    totalAmount: 'Total Amount',
    cashPaid: 'Cash Paid',
    pendingAmount: 'Pending Amount',
    fullPayment: 'Full Payment',
    editRecord: 'Edit',
    deleteRecord: 'Delete',
    shareRecord: 'share',
    today: 'Today',
    yesterday: 'Yesterday'
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview of your records',
    selectPeriod: 'Select Time Period',
    today: 'Today',
    week: 'Week',
    month: 'Month',
    all: 'All',
    totalRecords: 'Total Records',
    totalLand: 'Total Land',
    totalAmount: 'Total Amount',
    totalCash: 'Total Cash',
    pendingAmount: 'Pending Amount',
    averageLand: 'Average Land per Record',
    averageRate: 'Average Rate per Acre'
  },
  app: {
    appTitle: 'Harvester Tracker',
    totalBalance: 'Total Balance'
  },
  messages: {
    recordSaved: 'Record saved successfully! 🎉',
    recordUpdated: 'Record updated successfully! ✅',
    recordDeleted: 'Record deleted successfully',
    recordMarkedAsPaid: 'Record marked as paid',
    markAsPaidConfirm: 'Mark as paid?',
    markAsPaidMessage: 'This will mark the record as paid (pending amount will be 0). You can edit the record later to change it back.',
    markAsPaidButton: 'Mark as paid',
    saveError: 'Error saving record',
    updateError: 'Error updating record',
    deleteError: 'Error deleting record',
    recordNotFound: 'Record not found',
    deleteConfirm: 'Are you sure you want to delete "{{farmerName}}" record?\n\nThis action cannot be undone.',
    deleteConfirmMessage: 'Confirm',
    resetConfirm: 'Are you sure you want to reset all settings to default?',
    resetConfirmMessage: 'Confirm',
    noDataToExport: 'No data to export',
    dataExported: 'Data exported successfully',
    dataImported: 'Data imported successfully',
    dataCleared: 'All data cleared successfully',
    settingsReset: 'Settings reset to default',
    copiedToClipboard: 'Copied to clipboard for sharing',
    logoutSuccess: 'Logged out successfully',
    logoutError: 'Error logging out'
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage your preferences',
    themeSettings: 'Theme Settings',
    darkLightMode: 'Dark/Light Mode',
    themeDescription: 'Choose your theme preference',
    preferences: 'Preferences',
    notifications: 'Notifications',
    notificationsDescription: 'Enable push notifications',
    language: 'Language',
    languageDescription: 'Choose your language',
    languageHindi: 'Hindi',
    languageEnglish: 'English',
    currencyFormat: 'Currency Format',
    currencyDescription: 'Choose payment format',
    currencyINR: 'Indian Rupee (₹)',
    currencyUSD: 'US Dollar ($)',
    currencyGBP: 'British Pound (£)',
    harvesterSetup: 'Harvester Setup',
    harvesterSetupDescription: 'Add or edit harvester names shown in the Add New form dropdown. At least one is required.',
    harvesterCount: '{{count}} harvesters',
    harvesterCountOne: '1 harvester',
    addHarvester: 'Add Harvester',
    harvesterNamePlaceholder: 'e.g. Harvester 2',
    saveHarvester: 'Save',
    editHarvester: 'Edit',
    removeHarvester: 'Remove',
    harvesterRequired: 'At least one harvester is required.',
    dataManagement: 'Data Management',
    exportData: 'Export Data',
    clearAllData: 'Clear All Data',
    resetSettings: 'Reset',
    resetDescription: 'Reset all settings to default values',
    resetButton: 'Reset Settings',
    logout: 'Logout'
  },
  more: {
    title: 'More Options',
    subtitle: 'Additional features and information',
    about: 'About',
    appName: 'App Name:',
    version: 'Version:',
    description: 'Description:',
    development: 'Development:',
    shareApp: 'Share App',
    help: 'Help & Support',
    helpSubtitle: 'Frequently Asked Questions',
    howToAddRecord: 'How to add a new record?',
    howToAddRecordAnswer: 'Go to "Add New" tab, fill all details and click "Save".',
    howToEditRecord: 'How to edit a record?',
    howToEditRecordAnswer: 'In "Records" tab, expand a record and click "Edit" button.',
    howToExport: 'How to export data?',
    howToExportAnswer: 'Go to "More Options" > "Export Data" and download CSV file.',
    howToChangeTheme: 'How to change theme?',
    howToChangeThemeAnswer: 'Use "Theme Settings" in "Settings" tab.',
    contact: 'Contact Us',
    contactSubtitle: 'Get in touch',
    email: 'Email:',
    phone: 'Phone:',
    location: 'Location:',
    locationValue: 'India',
    sendFeedback: 'Send Feedback',
    logout: 'Logout',
    logoutDescription: 'Sign out of your account'
  }
});

const TRANSLATIONS: Record<Language, Translations> = {
  // Hindi translations use English for now (will be added later)
  hi: getEnglishTranslations(),
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      search: 'Search',
      clear: 'Clear',
      update: 'Update',
      loading: 'Loading...',
      saving: 'Saving...',
      updating: 'Updating...',
      yes: 'Yes',
      no: 'No'
    },
    nav: {
      dashboard: 'Dashboard',
      addNew: 'Add New',
      records: 'Records',
      settings: 'Settings',
      more: 'More'
    },
    form: {
      farmerInfo: 'Farmer Information',
      farmerName: 'Farmer Name',
      farmerNamePlaceholder: 'Full Name',
      contactNumber: 'Mobile Number',
      contactNumberPlaceholder: '10 digits',
      date: 'Date',
      harvester: 'Harvester',
      landInAcres: 'Land (Acres)',
      landInAcresPlaceholder: '0.00',
      ratePerAcre: 'Rate (₹/Acre)',
      ratePerAcrePlaceholder: '2500',
      totalAmount: 'Total Amount',
      cashPayment: 'Cash Payment (₹)',
      cashPaymentPlaceholder: '0',
      paymentDate: 'Payment Date',
      fullPaymentDate: 'Full Payment Date',
      addNewRecord: 'Add New Record',
      editRecord: 'Edit Record'
    },
    errors: {
      farmerNameRequired: 'Please enter name (at least 2 characters)',
      contactNumberRequired: 'Please enter 10-digit mobile number',
      contactNumberInvalid: 'Please enter 10-digit mobile number',
      dateRequired: 'Please select date',
      landRequired: 'Please enter land area (greater than 0)',
      rateRequired: 'Please enter valid rate (greater than 1)',
      cashExceedsTotal: 'Cash amount cannot exceed total amount',
      fillAllFields: 'Please fill all required fields correctly'
    },
    records: {
      title: 'सभी रिकॉर्ड',
      subtitle: 'कुल {{count}} रिकॉर्ड मिले',
      searchPlaceholder: 'नाम, नंबर या तारीख से खोजें',
      noRecords: 'कोई रिकॉर्ड नहीं मिला',
      noRecordsSubtitle: 'नई एंट्री जोड़ने के लिए "नया जोड़ें" टैब पर जाएं',
      changeSearch: 'अपनी खोज बदलने का प्रयास करें',
      addNewRecord: 'नई एंट्री जोड़ने के लिए "नया जोड़ें" टैब पर जाएं',
      date: 'तारीख',
      land: 'जमीन (एकड़)',
      rate: 'प्रति एकड़ दर',
      harvester: 'हार्वेस्टर',
      totalAmount: 'कुल राशि',
      cashPaid: 'नकद भुगतान',
      pendingAmount: 'बकाया राशि',
      fullPayment: 'पूर्ण भुगतान',
      editRecord: 'संपादित करें',
      deleteRecord: 'हटाएं',
      shareRecord: 'साझा करें',
      today: 'आज',
      yesterday: 'कल'
    },
    dashboard: {
      title: 'डैशबोर्ड',
      subtitle: 'आपके रिकॉर्ड का अवलोकन',
      selectPeriod: 'समय अवधि चुनें',
      today: 'आज',
      week: 'Week',
      month: 'Month',
      all: 'All',
      totalRecords: 'Total Records',
      totalLand: 'Total Land',
      totalAmount: 'Total Amount',
      totalCash: 'Total Cash',
      pendingAmount: 'Pending Amount',
      averageLand: 'Average Land per Record',
      averageRate: 'Average Rate per Acre'
    },
    app: {
      appTitle: 'Harvester Tracker',
      totalBalance: 'Total Balance'
    },
    messages: {
      recordSaved: 'Record saved successfully! 🎉',
      recordUpdated: 'Record updated successfully! ✅',
      recordDeleted: 'Record deleted successfully',
      recordMarkedAsPaid: 'Record marked as paid',
      markAsPaidConfirm: 'Mark as paid?',
      markAsPaidMessage: 'This will mark the record as paid (pending amount will be 0). You can edit the record later to change it back.',
      markAsPaidButton: 'Mark as paid',
      saveError: 'Error saving record',
      updateError: 'Error updating record',
      deleteError: 'Error deleting record',
      recordNotFound: 'Record not found',
      deleteConfirm: 'Are you sure you want to delete "{{farmerName}}" record?\n\nThis action cannot be undone.',
      deleteConfirmMessage: 'Confirm',
      resetConfirm: 'Are you sure you want to reset all settings to default?',
      resetConfirmMessage: 'Confirm',
      noDataToExport: 'No data to export',
      dataExported: 'Data exported successfully',
      dataImported: 'Data imported successfully',
      dataCleared: 'All data cleared successfully',
      settingsReset: 'Settings reset to default',
      copiedToClipboard: 'Copied to clipboard for sharing',
      logoutSuccess: 'Logged out successfully',
      logoutError: 'Error logging out'
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage your preferences',
      themeSettings: 'Theme Settings',
      darkLightMode: 'Dark/Light Mode',
      themeDescription: 'Choose your theme preference',
      preferences: 'Preferences',
      notifications: 'Notifications',
      notificationsDescription: 'Enable push notifications',
      language: 'Language',
      languageDescription: 'Choose your language',
      languageHindi: 'Hindi',
      languageEnglish: 'English',
      currencyFormat: 'Currency Format',
      currencyDescription: 'Choose payment format',
      currencyINR: 'Indian Rupee (₹)',
      currencyUSD: 'US Dollar ($)',
      currencyGBP: 'British Pound (£)',
      harvesterSetup: 'Harvester Setup',
      harvesterSetupDescription: 'Add or edit harvester names shown in the Add New form dropdown. At least one is required.',
      harvesterCount: '{{count}} harvesters',
      harvesterCountOne: '1 harvester',
      addHarvester: 'Add Harvester',
      harvesterNamePlaceholder: 'e.g. Harvester 2',
      saveHarvester: 'Save',
      editHarvester: 'Edit',
      removeHarvester: 'Remove',
      harvesterRequired: 'At least one harvester is required.',
      dataManagement: 'Data Management',
      exportData: 'Export Data',
      clearAllData: 'Clear All Data',
      resetSettings: 'Reset',
      resetDescription: 'Reset all settings to default values',
      resetButton: 'Reset Settings',
      logout: 'Logout'
    },
    more: {
      title: 'More Options',
      subtitle: 'Additional features and information',
      about: 'About',
      appName: 'App Name:',
      version: 'Version:',
      description: 'Description:',
      development: 'Development:',
      shareApp: 'Share App',
      help: 'Help & Support',
      helpSubtitle: 'Frequently Asked Questions',
      howToAddRecord: 'How to add a new record?',
      howToAddRecordAnswer: 'Go to "Add New" tab, fill all details and click "Save".',
      howToEditRecord: 'How to edit a record?',
      howToEditRecordAnswer: 'In "Records" tab, expand a record and click "Edit" button.',
      howToExport: 'How to export data?',
      howToExportAnswer: 'Go to "More Options" > "Export Data" and download CSV file.',
      howToChangeTheme: 'How to change theme?',
      howToChangeThemeAnswer: 'Use "Theme Settings" in "Settings" tab.',
      contact: 'Contact Us',
      contactSubtitle: 'Get in touch',
      email: 'Email:',
      phone: 'Phone:',
      location: 'Location:',
      locationValue: 'India',
      sendFeedback: 'Send Feedback',
      logout: 'Logout',
      logoutDescription: 'Sign out of your account'
    }
  }
};

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  // Computed signal that returns translations based on current language
  public readonly t = computed(() => TRANSLATIONS[this.languageService.getCurrentLanguage()]);

  constructor(private languageService: LanguageService) {}

  /**
   * Get translation for a key path
   * Example: get('form.farmerName')
   */
  get(key: string): string {
    const keys = key.split('.');
    let value: any = this.t();
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return value as string;
  }

  /**
   * Get translation with interpolation
   * Example: getWithParams('records.subtitle', { count: 5 })
   */
  getWithParams(key: string, params: Record<string, string | number>): string {
    let translation = this.get(key);
    
    for (const [paramKey, paramValue] of Object.entries(params)) {
      translation = translation.replace(`{{${paramKey}}}`, String(paramValue));
    }
    
    return translation;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.languageService.getCurrentLanguage();
  }

  /**
   * Check if current language is Hindi
   */
  isHindi(): boolean {
    return this.languageService.isHindi();
  }
}
