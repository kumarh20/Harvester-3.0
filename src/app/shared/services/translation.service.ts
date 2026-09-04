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
    close: string;
    back: string;
    refresh: string;
    all: string;
    active: string;
    completed: string;
  };

  // Navigation
  nav: {
    dashboard: string;
    home: string;
    addNew: string;
    records: string;
    settings: string;
    more: string;
    profile: string;
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
    cuttingDetails: string;
    landInAcres: string;
    landInAcresPlaceholder: string;
    measureLandBtn: string;
    ratePerAcre: string;
    ratePerAcrePlaceholder: string;
    totalAmount: string;
    paymentSettlement: string;
    cashPayment: string;
    cashPaymentPlaceholder: string;
    paymentDate: string;
    fullPaymentDate: string;
    addNewRecord: string;
    editRecord: string;
    commercialSummary: string;
    fullySettled: string;
    dueToCollect: string;
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
    fullPaymentPromise: string;
    editRecord: string;
    deleteRecord: string;
    shareRecord: string;
    markedAsPaid: string;
    markAsPaidButton: string;
    today: string;
    yesterday: string;
    acresUnit: string;
    callFarmer: string;
    filterToday?: string;
    filterYesterday?: string;
    filterWeek?: string;
    filterMonth?: string;
    filterCustom?: string;
    filterAll?: string;
    customSingleDate?: string;
    customDateRange?: string;
    fromDate?: string;
    toDate?: string;
    clearFilter?: string;
    noRecordsForDate?: string;
    viewAllRecords?: string;
    selectDate?: string;
    filterSummary?: string;
    [key: string]: any;
  };

  // Dashboard
  dashboard: {
    title: string;
    subtitle: string;
    activeOperations: string;
    refresh: string;
    selectPeriod: string;
    today: string;
    week: string;
    month: string;
    all: string;
    totalRecords: string;
    completedJobs: string;
    totalLand: string;
    acresHarvested: string;
    acres: string;
    perCutting: string;
    avgYieldRate: string;
    totalAmount: string;
    totalEarnings: string;
    totalCash: string;
    totalAdvance: string;
    pendingAmount: string;
    outstandingDue: string;
    allDuesCleared: string;
    quickActions: string;
    newCuttingJob: string;
    measureField: string;
    manageFleet: string;
    exportCsv: string;
    recentJobs: string;
    inThisPeriod: string;
    viewFullLedger: string;
    paid: string;
    due: string;
    noRecords: string;
    noRecordsDesc: string;
    averageLand: string;
    averageRate: string;
    harvestTrend: string;
    trendSubtitle: string;
    chartRevenue: string;
    chartAcres: string;
    chartJobs: string;
    paymentRecovery: string;
    recoverySubtitle: string;
    collected: string;
    pending: string;
    recoveryRate: string;
    fleetDistribution: string;
    topHarvesters: string;
    acresUnit: string;
    quickStats: string;
  };

  // App
  app: {
    appTitle: string;
    tagline: string;
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
    logoutConfirm: string;
    logoutConfirmTitle: string;
  };

  // Settings
  settings: {
    title: string;
    subtitle: string;
    cloudSynced: string;
    profileEdit: string;
    syncSuccess: string;
    activeStatus: string;
    syncingStatus: string;
    harvesterSetup: string;
    harvesterSetupDescription: string;
    harvestersLoading: string;
    harvesterCount: string;
    harvesterCountOne: string;
    addHarvester: string;
    searchHarvesterPlaceholder: string;
    defaultMachine: string;
    unitNumber: string;
    harvesterNamePlaceholder: string;
    saveHarvester: string;
    editHarvester: string;
    removeHarvester: string;
    harvesterRequired: string;
    defaultRate: string;
    defaultRateDescription: string;
    defaultRatePlaceholder: string;
    perAcreUnit: string;
    conversionPill: string;
    quickPresets: string;
    preferredUnit: string;
    acre: string;
    bigha: string;
    hectare: string;
    preferences: string;
    preferencesDesc: string;
    themeSettings: string;
    darkLightMode: string;
    themeDescription: string;
    light: string;
    dark: string;
    bottomNavLabels: string;
    bottomNavLabelsDesc: string;
    language: string;
    languageDescription: string;
    languageHindi: string;
    languageEnglish: string;
    currencyFormat: string;
    currencyDescription: string;
    currencyINR: string;
    currencyUSD: string;
    currencyGBP: string;
    notifications: string;
    notificationsDescription: string;
    systemNotifications: string;
    systemNotificationsDesc: string;
    testNotification: string;
    settlementDueToday: string;
    settlementDueTodayDesc: string;
    dataManagement: string;
    dataManagementDesc: string;
    exportData: string;
    exportDataDesc: string;
    importData: string;
    importDataDesc: string;
    clearAllData: string;
    clearAllDataDesc: string;
    resetSettings: string;
    resetDescription: string;
    resetButton: string;
    logout: string;
    logoutDesc: string;
    systemVersion: string;
    defaultRecordFilter?: string;
    defaultRecordFilterDesc?: string;
    defaultFilterUpdated?: string;
    filterOptionToday?: string;
    filterOptionWeek?: string;
    filterOptionMonth?: string;
    filterOptionAll?: string;
    filterTodayOption?: string;
    filterWeekOption?: string;
    filterMonthOption?: string;
    filterAllOption?: string;
    defaultMachineDesc?: string;
    selectDefaultHarvester?: string;
    setAsDefault?: string;
    isDefaultBadge?: string;
    defaultHarvesterUpdated?: string;
    makeDefaultCheckbox?: string;
    [key: string]: any;
  };

  // More
  more: {
    title: string;
    subtitle: string;
    verifiedOperator: string;
    businessContractor: string;
    idLabel: string;
    editProfile: string;
    totalRecords: string;
    acresHarvested: string;
    fleetHarvesters: string;
    appTools: string;
    appToolsDesc: string;
    landTracker: string;
    landTrackerDesc: string;
    settingsTitle: string;
    settingsDesc: string;
    exportTitle: string;
    exportDesc: string;
    importTitle: string;
    importDesc: string;
    about: string;
    appName: string;
    version: string;
    description: string;
    appType: string;
    appTypeValue: string;
    development: string;
    developmentValue: string;
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

  // Land Tracker
  land: {
    title: string;
    mapMode: string;
    walkMode: string;
    mapPill: string;
    walkPill: string;
    satellite: string;
    street: string;
    locate: string;
    savedFields: string;
    mapGuide: string;
    walkGuide: string;
    walkStart: string;
    walkPause: string;
    walkResume: string;
    walkFinish: string;
    clearPoints: string;
    undoPoint: string;
    calculatedArea: string;
    acres: string;
    bigha: string;
    hectares: string;
    perimeter: string;
    saveField: string;
    fieldName: string;
    fieldNamePlaceholder: string;
    gpsWaiting: string;
    markCorner: string;
    applyArea: string;
    createCuttingRecord: string;
    saveFieldModalTitle: string;
    fieldPlotName: string;
    savedFieldsTitle: string;
    noSavedFields: string;
    noSavedFieldsHint: string;
    viewOnMap: string;
    sqMeters: string;
    sqFeet: string;
    pointsLabel: string;
  };

  // Dialogs
  dialogs: {
    editProfileTitle: string;
    editProfileSubtitle: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    mobileLabel: string;
    mobilePlaceholder: string;
    farmBusinessLabel: string;
    farmBusinessPlaceholder: string;
  };

  // Auth
  auth: {
    back: string;
    brandBadge: string;
    brandTitle: string;
    brandDesc: string;
    featLandTitle: string;
    featLandDesc: string;
    featLedgerTitle: string;
    featLedgerDesc: string;
    featFleetTitle: string;
    featFleetDesc: string;
    cloudSecure: string;
    welcomeSubtitle: string;
    signIn: string;
    signUp: string;
    whatsappLogin: string;
    welcomeBack: string;
    phoneLabel: string;
    phonePlaceholder: string;
    phoneRequired: string;
    phoneInvalid: string;
    sendOtp: string;
    sendingOtp: string;
    dontWantOtp: string;
    loginWithPassword: string;
    enterOtp: string;
    enterOtpPlaceholder: string;
    otpHintWhatsapp: string;
    otpHintSms: string;
    resendOtp: string;
    resending: string;
    verifyOtp: string;
    verifying: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordRequired: string;
    passwordMinLength: string;
    passwordComplexity: string;
    rememberMe: string;
    forgotPassword: string;
    signInWith: string;
    signUpWith: string;
    noAccount: string;
    alreadyAccount: string;
    getStarted: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    fullNameRequired: string;
    nameMinLength: string;
    nameMaxLength: string;
    createPasswordPlaceholder: string;
    agreeTerms: string;
    personalData: string;
    whatsappTitle: string;
    whatsappSubtitle: string;
    whatsappPhonePlaceholder: string;
    sendOtpWhatsapp: string;
    sendingOtpWhatsapp: string;
    preferPassword: string;
    codeSentTo: string;
    change: string;
    enterOtp6Digit: string;
    checkWhatsappPhone: string;
    expiresIn: string;
    otpExpired: string;
    resendIn: string;
    verifyOtpSignIn: string;
    backToRegularLogin: string;
  };
}

const HINDI_TRANSLATIONS: Translations = {
  common: {
    save: 'सहेजें',
    cancel: 'रद्द करें',
    edit: 'संपादित करें',
    delete: 'हटाएं',
    search: 'खोजें',
    clear: 'साफ़ करें',
    update: 'अपडेट करें',
    loading: 'लोड हो रहा है...',
    saving: 'सहेजा जा रहा है...',
    updating: 'अपडेट हो रहा है...',
    yes: 'हाँ',
    no: 'नहीं',
    close: 'बंद करें',
    back: 'वापस जाएं',
    refresh: 'रिफ्रेश',
    all: 'सभी',
    active: 'सक्रिय',
    completed: 'पूर्ण'
  },
  nav: {
    dashboard: 'डैशबोर्ड',
    home: 'होम',
    addNew: 'नया जोड़ें',
    records: 'रिकॉर्ड्स',
    settings: 'सेटिंग्स',
    more: 'अधिक',
    profile: 'प्रोफाइल'
  },
  form: {
    farmerInfo: 'किसान का विवरण',
    farmerName: 'किसान का नाम',
    farmerNamePlaceholder: 'पूरा नाम दर्ज करें',
    contactNumber: 'मोबाइल नंबर',
    contactNumberPlaceholder: '10 अंकों का मोबाइल नंबर',
    date: 'कटाई की तारीख',
    harvester: 'हार्वेस्टर मशीन',
    cuttingDetails: 'कटाई व खेत का विवरण',
    landInAcres: 'जमीन (एकड़ में)',
    landInAcresPlaceholder: '0.00',
    measureLandBtn: '📐 नक्शे या चलकर खेत नापें',
    ratePerAcre: 'दर (₹ प्रति एकड़)',
    ratePerAcrePlaceholder: '2500',
    totalAmount: 'कुल राशि',
    paymentSettlement: 'भुगतान विवरण व बकाया',
    cashPayment: 'नकद प्राप्त राशि (₹)',
    cashPaymentPlaceholder: '0',
    paymentDate: 'पूरा भुगतान करने की तारीख',
    fullPaymentDate: 'पूर्ण भुगतान वादा तारीख',
    addNewRecord: 'नया कटाई रिकॉर्ड दर्ज करें',
    editRecord: 'कटाई रिकॉर्ड संपादित करें',
    commercialSummary: 'व्यावसायिक हिसाब-किताब',
    fullySettled: 'पूरा भुगतान प्राप्त',
    dueToCollect: 'लेना बाकी'
  },
  errors: {
    farmerNameRequired: 'कृपया किसान का नाम दर्ज करें (कम से कम 2 अक्षर)',
    contactNumberRequired: 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें',
    contactNumberInvalid: 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें',
    dateRequired: 'कृपया कटाई की तारीख चुनें',
    landRequired: 'कृपया खेत का रकबा दर्ज करें (0 से अधिक)',
    rateRequired: 'कृपया प्रति एकड़ वैध दर दर्ज करें',
    cashExceedsTotal: 'नकद राशि कुल राशि से अधिक नहीं हो सकती',
    fillAllFields: 'कृपया सभी आवश्यक फ़ील्ड सही तरीके से भरें'
  },
  records: {
    title: 'सभी कटाई रिकॉर्ड',
    subtitle: 'कुल {{count}} रिकॉर्ड उपलब्ध',
    searchPlaceholder: 'किसान के नाम, नंबर या तारीख से खोजें...',
    noRecords: 'कोई रिकॉर्ड नहीं मिला',
    noRecordsSubtitle: 'नया रिकॉर्ड जोड़ने के लिए "नया जोड़ें" पर जाएं',
    changeSearch: 'अपनी खोज बदलकर दोबारा देखें',
    addNewRecord: 'नया रिकॉर्ड जोड़ने के लिए "नया जोड़ें" पर जाएं',
    date: 'तारीख',
    land: 'जमीन (एकड़)',
    rate: 'प्रति एकड़ दर',
    harvester: 'हार्वेस्टर',
    totalAmount: 'कुल राशि',
    cashPaid: 'नकद प्राप्त',
    pendingAmount: 'बकाया राशि',
    fullPayment: 'पूर्ण भुगतान',
    fullPaymentPromise: 'भुगतान वादा तारीख',
    editRecord: 'संपादित करें',
    deleteRecord: 'हटाएं',
    shareRecord: 'रसीद साझा करें',
    markedAsPaid: 'भुगतान चुकता दर्ज',
    markAsPaidButton: 'चुकता दर्ज करें',
    today: 'आज',
    yesterday: 'कल',
    acresUnit: 'एकड़',
    callFarmer: 'कॉल करें',
    filterToday: 'आज',
    filterYesterday: 'कल',
    filterWeek: 'इस सप्ताह',
    filterMonth: 'इस महीने',
    filterCustom: 'कस्टम तारीख',
    filterAll: 'सभी',
    customSingleDate: 'एक तारीख',
    customDateRange: 'तारीख अवधि',
    fromDate: 'शुरू तारीख',
    toDate: 'अंतिम तारीख',
    selectDate: 'तारीख चुनें',
    clearFilter: 'हटाएं',
    noRecordsForDate: 'इस तारीख/अवधि में कोई रिकॉर्ड नहीं मिला',
    viewAllRecords: 'सभी रिकॉर्ड देखें',
    filterSummary: '{{count}} रिकॉर्ड • {{acres}} एकड़ • ₹{{total}} कुल'
  },
  dashboard: {
    title: 'डैशबोर्ड',
    subtitle: 'कटाई कार्य व वित्तीय हिसाब-किताब का अवलोकन',
    activeOperations: 'सक्रिय संचालन',
    refresh: 'रिफ्रेश',
    selectPeriod: 'समय सीमा चुनें',
    today: 'आज',
    week: 'इस सप्ताह',
    month: 'इस महीने',
    all: 'कुल समय',
    totalRecords: 'कुल कटाई कार्य',
    completedJobs: 'कार्य संपन्न',
    totalLand: 'कुल काटी गई जमीन',
    acresHarvested: 'एकड़ कटाई',
    acres: 'एकड़',
    perCutting: 'औसत प्रति कटाई',
    avgYieldRate: 'औसत कटाई दर',
    totalAmount: 'कुल कारोबार',
    totalEarnings: 'कुल राशि',
    totalCash: 'नकद प्राप्त राशि',
    totalAdvance: 'नकद भुगतान',
    pendingAmount: 'कुल बकाया राशि',
    outstandingDue: 'किसानों से वसूली शेष',
    allDuesCleared: 'सभी बकाया चुकता हैं',
    quickActions: 'त्वरित कार्य',
    newCuttingJob: 'नई कटाई एंट्री',
    measureField: 'जमीन नापें',
    manageFleet: 'मशीनें व सेटिंग्स',
    exportCsv: 'एक्सेल एक्सपोर्ट',
    recentJobs: 'हाल के कटाई कार्य',
    inThisPeriod: 'इस समय सीमा में',
    viewFullLedger: 'पूरा लेजर देखें',
    paid: 'चुकता',
    due: 'बकाया',
    noRecords: 'इस अवधि में कोई रिकॉर्ड नहीं है',
    noRecordsDesc: 'चयनित समय सीमा में कोई कटाई दर्ज नहीं है। "कुल समय" चुनें या नई एंट्री जोड़ें।',
    averageLand: 'औसत रकबा प्रति रिकॉर्ड',
    averageRate: 'औसत दर प्रति एकड़',
    harvestTrend: 'कटाई रुझान व ग्राफ',
    trendSubtitle: 'दैनिक व साप्ताहिक कटाई और आय का विश्लेषण',
    chartRevenue: 'कमाई (₹)',
    chartAcres: 'रकबा (एकड़)',
    chartJobs: 'कटाई कार्य',
    paymentRecovery: 'वसूली व भुगतान अनुपात',
    recoverySubtitle: 'नकद प्राप्त राशि बनाम शेष बकाया',
    collected: 'प्राप्त राशि',
    pending: 'शेष बकाया',
    recoveryRate: 'वसूली प्रतिशत',
    fleetDistribution: 'मशीन अनुसार कार्य विभाजन',
    topHarvesters: 'सक्रिय हार्वेस्टर मशीनें',
    acresUnit: 'एकड़',
    quickStats: 'त्वरित आँकड़े'
  },
  app: {
    appTitle: 'हार्वेस्टर कटिंग ट्रैकर',
    tagline: 'डिजिटल कटाई व लेजर',
    totalBalance: 'कुल बकाया राशि'
  },
  messages: {
    recordSaved: 'रिकॉर्ड सफलतापूर्वक सहेजा गया! 🎉',
    recordUpdated: 'रिकॉर्ड सफलतापूर्वक अपडेट किया गया! ✅',
    recordDeleted: 'रिकॉर्ड हटा दिया गया',
    recordMarkedAsPaid: 'रिकॉर्ड चुकता दर्ज किया गया',
    markAsPaidConfirm: 'चुकता दर्ज करें?',
    markAsPaidMessage: 'यह रिकॉर्ड को चुकता (बकाया राशि 0) कर देगा। आप बाद में इसे संपादित भी कर सकते हैं।',
    markAsPaidButton: 'चुकता दर्ज करें',
    saveError: 'रिकॉर्ड सहेजने में त्रुटि',
    updateError: 'रिकॉर्ड अपडेट करने में त्रुटि',
    deleteError: 'रिकॉर्ड हटाने में त्रुटि',
    recordNotFound: 'रिकॉर्ड नहीं मिला',
    deleteConfirm: 'क्या आप निश्चित रूप से "{{farmerName}}" का रिकॉर्ड हटाना चाहते हैं?\n\nयह क्रिया वापस नहीं ली जा सकती।',
    deleteConfirmMessage: 'पुष्टि करें',
    resetConfirm: 'क्या आप सभी सेटिंग्स को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?',
    resetConfirmMessage: 'पुष्टि करें',
    noDataToExport: 'एक्सपोर्ट के लिए कोई डेटा नहीं है',
    dataExported: 'डेटा सफलतापूर्वक एक्सेल/CSV में डाउनलोड हुआ',
    dataImported: 'डेटा सफलतापूर्वक आयात किया गया',
    dataCleared: 'सभी स्थानीय डेटा साफ़ कर दिया गया',
    settingsReset: 'सेटिंग्स डिफ़ॉल्ट पर रीसेट हो गई हैं',
    copiedToClipboard: 'साझा करने के लिए कॉपी किया गया',
    logoutSuccess: 'सफलतापूर्वक लॉगआउट हो गए',
    logoutError: 'लॉगआउट करने में त्रुटि',
    logoutConfirm: 'क्या आप निश्चित रूप से अपने हार्वेस्टर खाते से लॉगआउट करना चाहते हैं?',
    logoutConfirmTitle: 'लॉगआउट'
  },
  settings: {
    title: 'सेटिंग्स',
    subtitle: 'मशीनें, दर व व्यक्तिगत प्राथमिकताएं',
    cloudSynced: 'क्लाउड',
    profileEdit: 'प्रोफाइल एडिट करें',
    syncSuccess: 'डेटा सुरक्षित क्लाउड पर सिंक है',
    activeStatus: 'सक्रिय',
    syncingStatus: 'सिंक हो रहा...',
    harvesterSetup: 'हार्वेस्टर मशीनें',
    harvesterSetupDescription: 'अपने फ्लीट की हार्वेस्टर मशीनें प्रबंधित करें',
    harvestersLoading: 'मशीनें लोड हो रही हैं...',
    harvesterCount: '{{count}} मशीनें',
    harvesterCountOne: '1 मशीन',
    addHarvester: 'मशीन जोड़ें',
    searchHarvesterPlaceholder: 'मशीन का नाम खोजें...',
    defaultMachine: 'डिफ़ॉल्ट मशीन',
    defaultMachineDesc: 'नया रिकॉर्ड फॉर्म खोलते समय यह मशीन अपने-आप चुनी रहेगी',
    selectDefaultHarvester: 'डिफ़ॉल्ट मशीन चुनें (Default Machine)',
    setAsDefault: 'डिफ़ॉल्ट बनाएं',
    isDefaultBadge: 'डिफ़ॉल्ट मशीन',
    defaultHarvesterUpdated: 'डिफ़ॉल्ट मशीन सेट कर दी गई है',
    makeDefaultCheckbox: 'इस मशीन को नए फॉर्म के लिए डिफ़ॉल्ट बनाएं',
    unitNumber: 'हार्वेस्टर कटिंग यूनिट',
    harvesterNamePlaceholder: 'उदा. जॉन डियर 1, प्रीत 987',
    saveHarvester: 'सहेजें',
    editHarvester: 'संपादित करें',
    removeHarvester: 'हटाएं',
    harvesterRequired: 'कम से कम एक हार्वेस्टर मशीन होना आवश्यक है।',
    defaultRate: 'डिफ़ॉल्ट कटाई दर',
    defaultRateDescription: 'नया रिकॉर्ड बनाते समय यह दर अपने-आप भर जाएगी',
    defaultRatePlaceholder: '2500',
    perAcreUnit: 'प्रति एकड़',
    conversionPill: '≈ ₹{{bigha}} प्रति बीघा • ₹{{hectare}} प्रति हेक्टेयर',
    quickPresets: 'त्वरित दर विकल्प:',
    preferredUnit: 'मुख्य पैमाइश इकाई:',
    acre: 'एकड़',
    bigha: 'बीघा',
    hectare: 'हेक्टेयर',
    preferences: 'प्राथमिकताएं',
    preferencesDesc: 'थीम, भाषा व नोटिफिकेशन सेटिंग्स',
    themeSettings: 'थीम सेटिंग्स',
    darkLightMode: 'डार्क / लाइट मोड',
    themeDescription: 'अपनी पसंदीदा स्क्रीन थीम चुनें',
    light: 'लाइट',
    dark: 'डार्क',
    bottomNavLabels: 'बॉटम नेविगेशन लेबल',
    bottomNavLabelsDesc: 'नेविगेशन बार में आइकन्स के नीचे नाम दिखाएं (बंद करने पर नेविगेशन बार स्लिम और कॉम्पैक्ट रहेगा)',
    defaultRecordFilter: 'डिफ़ॉल्ट रिकॉर्ड फ़िल्टर',
    defaultRecordFilterDesc: 'रिकॉर्ड पेज खोलते समय पहले कौन सा फ़िल्टर दिखेगा',
    filterTodayOption: 'आज (Today)',
    filterWeekOption: 'इस सप्ताह (This Week)',
    filterMonthOption: 'इस महीने (This Month)',
    filterAllOption: 'सभी रिकॉर्ड (All Time)',
    language: 'भाषा (Language)',
    languageDescription: 'अपनी भाषा का चयन करें',
    languageHindi: 'हिन्दी',
    languageEnglish: 'English',
    currencyFormat: 'मुद्रा प्रारूप',
    currencyDescription: 'रुपये का प्रारूप चुनें',
    currencyINR: 'भारतीय रुपया (₹)',
    currencyUSD: 'अमेरिकी डॉलर ($)',
    currencyGBP: 'ब्रिटिश पाउंड (£)',
    notifications: 'सूचनाएं (Notifications)',
    notificationsDescription: 'भुगतान रिमाइंडर व अपडेट सूचनाएं प्राप्त करें',
    systemNotifications: 'सिस्टम भुगतान रिमाइंडर (Android/Mobile)',
    systemNotificationsDesc: 'वादा की गई तारीख पर स्वतः मोबाइल सिस्टम नोटिफिकेशन प्राप्त करें',
    testNotification: 'टेस्ट नोटिफिकेशन चलाएं',
    settlementDueToday: 'आज का भुगतान वादा देय',
    settlementDueTodayDesc: 'किसानों द्वारा वादा किया गया भुगतान आज देय है',
    dataManagement: 'डेटा प्रबंधन व बैकअप',
    dataManagementDesc: 'कटाई रिकॉर्ड बैकअप व एक्सेल एक्सपोर्ट',
    exportData: 'डेटा एक्सपोर्ट करें (CSV)',
    exportDataDesc: 'सभी रिकॉर्ड Excel / CSV फाइल में सुरक्षित डाउनलोड करें',
    importData: 'डेटा इम्पोर्ट करें (CSV/JSON)',
    importDataDesc: 'पहले से सहेजे गए CSV या JSON रिकॉर्ड रीस्टोर करें',
    clearAllData: 'सभी डेटा साफ़ करें',
    clearAllDataDesc: 'इस डिवाइस से लोकल रिकॉर्ड साफ़ करें',
    resetSettings: 'रीसेट सेटिंग्स',
    resetDescription: 'सभी सेटिंग्स को डिफ़ॉल्ट मानों पर रीसेट करें',
    resetButton: 'रीसेट करें',
    logout: 'लॉगआउट',
    logoutDesc: 'खाते से सुरक्षित बाहर निकलें',
    systemVersion: 'संस्करण'
  },
  more: {
    title: 'प्रोफाइल व अतिरिक्त सुविधाएं',
    subtitle: 'खाता विवरण व सिस्टम प्रबंधन',
    verifiedOperator: 'प्रमाणित ऑपरेटर',
    businessContractor: 'कृषि कटाई ठेकेदार',
    idLabel: 'आईडी:',
    editProfile: 'प्रोफाइल एडिट करें',
    totalRecords: 'कुल कटाई',
    acresHarvested: 'कुल एकड़ कटाई',
    fleetHarvesters: 'कुल मशीनें',
    appTools: 'ऐप टूल्स व सुविधाएं',
    appToolsDesc: 'खेत नापना, सेटिंग्स, बैकअप व अन्य उपयोगिताएं',
    landTracker: 'जमीन पैमाइश ट्रैकर',
    landTrackerDesc: 'नक्शे पर बिंदु लगाकर या खेत में चलकर एकड़ व बीघा निकालें',
    settingsTitle: 'सेटिंग्स व मशीन प्रबंधन',
    settingsDesc: 'कटाई दर, मशीनें, थीम व भाषा प्राथमिकताएं',
    exportTitle: 'डेटा एक्सपोर्ट (CSV)',
    exportDesc: 'सभी किसानों का रिकॉर्ड स्प्रेडशीट में डाउनलोड करें',
    importTitle: 'डेटा इम्पोर्ट करें',
    importDesc: 'CSV या JSON फाइल से रिकॉर्ड रीस्टोर करें',
    about: 'ऐप के बारे में',
    appName: 'ऐप का नाम:',
    version: 'संस्करण:',
    description: 'विवरण:',
    appType: 'एप्लिकेशन प्रकार:',
    appTypeValue: 'क्लाउड सिंक्रोनाइज़्ड कृषि कटाई लेजर',
    development: 'तकनीक:',
    developmentValue: 'Angular 21 + मॉडर्न मटेरियल डिज़ाइन',
    shareApp: 'ऐप शेयर करें',
    help: 'सहायता व अक्सर पूछे जाने वाले प्रश्न',
    helpSubtitle: 'ऐप का उपयोग करने में मार्गदर्शन',
    howToAddRecord: 'नया रिकॉर्ड कैसे जोड़ें?',
    howToAddRecordAnswer: '"नया जोड़ें" टैब पर जाएं, किसान का नाम, मोबाइल, रकबा और दर भरें और "सहेजें" दबाएं।',
    howToEditRecord: 'रिकॉर्ड में सुधार कैसे करें?',
    howToEditRecordAnswer: '"रिकॉर्ड्स" टैब में संबंधित किसान के कार्ड पर टैप करें और "संपादित करें" चुनें।',
    howToExport: 'डेटा एक्सेल में कैसे निकालें?',
    howToExportAnswer: '"अधिक" > "डेटा एक्सपोर्ट" पर टैप करें और CSV फाइल डाउनलोड करें।',
    howToChangeTheme: 'डार्क मोड कैसे ऑन करें?',
    howToChangeThemeAnswer: '"सेटिंग्स" टैब में "थीम मोड" में डार्क या लाइट चुनें।',
    contact: 'संपर्क व सहायता',
    contactSubtitle: 'हमसे संपर्क करें',
    email: 'ईमेल:',
    phone: 'फोन:',
    location: 'स्थान:',
    locationValue: 'भारत',
    sendFeedback: 'प्रतिक्रिया भेजें',
    logout: 'लॉगआउट',
    logoutDescription: 'अपने खाते से सुरक्षित बाहर निकलें'
  },
  land: {
    title: 'जमीन पैमाइश ट्रैकर',
    mapMode: 'नक्शा मोड',
    walkMode: 'चलकर GPS मोड',
    mapPill: 'नक्शे पर निशान',
    walkPill: 'खेत में चलकर',
    satellite: 'सैटेलाइट',
    street: 'सामान्य',
    locate: 'मेरी स्थिति',
    savedFields: 'सुरक्षित खेत',
    mapGuide: 'खेत के कोनों पर टैप करें। बिंदुओं को खींचकर सीमाएं ठीक करें।',
    walkGuide: 'खेत की मेड़ के चारों ओर घूमें। GPS स्वतः सीमा दर्ज करेगा।',
    walkStart: 'पैमाइश शुरू करें',
    walkPause: 'रोकें',
    walkResume: 'पुनः शुरू करें',
    walkFinish: 'पैमाइश पूरी करें',
    clearPoints: 'साफ़ करें',
    undoPoint: 'पिछला बिंदु हटाएं',
    calculatedArea: 'खेत का रकबा',
    acres: 'एकड़',
    bigha: 'बीघा',
    hectares: 'हेक्टेयर',
    perimeter: 'परिधि (घेरा)',
    saveField: 'खेत सहेजें',
    fieldName: 'खेत का नाम',
    fieldNamePlaceholder: 'उदा. रामलाल का उत्तर वाला खेत',
    gpsWaiting: 'GPS प्रतीक्षा में...',
    markCorner: 'कोना (+) चिह्नित करें',
    applyArea: 'इस रकबे को फॉर्म में भरें',
    createCuttingRecord: 'कटाई रिकॉर्ड बनाएं',
    saveFieldModalTitle: 'खेत का नाम सहेजें',
    fieldPlotName: 'खेत / किसान का नाम',
    savedFieldsTitle: 'सहेजे गए खेत',
    noSavedFields: 'कोई सहेजा गया खेत नहीं मिला।',
    noSavedFieldsHint: 'खेत नापने के बाद "खेत सहेजें" पर क्लिक करें।',
    viewOnMap: 'नक्शे पर देखें',
    sqMeters: 'वर्ग मीटर',
    sqFeet: 'वर्ग फुट',
    pointsLabel: 'बिंदु'
  },
  dialogs: {
    editProfileTitle: 'ऑपरेटर प्रोफाइल संपादित करें',
    editProfileSubtitle: 'अपनी संपर्क जानकारी व फार्म विवरण अपडेट करें',
    fullNameLabel: 'पूरा नाम / ऑपरेटर नाम *',
    fullNamePlaceholder: 'अपना पूरा नाम दर्ज करें',
    mobileLabel: 'मोबाइल नंबर *',
    mobilePlaceholder: '10 अंकों का मोबाइल नंबर',
    farmBusinessLabel: 'फार्म / व्यवसाय का नाम (वैकल्पिक)',
    farmBusinessPlaceholder: 'उदा. किसान हार्वेस्टर वर्क्स'
  },
  auth: {
    back: 'वापस',
    brandBadge: 'एग्रीटेक हार्वेस्टर प्रो',
    brandTitle: 'हार्वेस्टर कटिंग व लेजर ट्रैकर',
    brandDesc: 'किसानों की फसल कटाई का डिजिटल हिसाब-किताब, सैटेलाइट व GPS जमीन पैमाइश और पारदर्शी पेमेंट लेजर।',
    featLandTitle: 'नक्शा व GPS जमीन नापें (Field Area Tracker)',
    featLandDesc: 'खेत के चारों ओर घूमकर या नक्शे पर बिंदु लगाकर एकड़ व बीघा निकालें',
    featLedgerTitle: 'ऑटोमैटिक बिलिंग व हिसाब (Instant Ledger)',
    featLedgerDesc: 'दर प्रति एकड़, नकद भुगतान व शेष राशि का तुरंत बिल व रसीद शेयर',
    featFleetTitle: 'मशीन व फ्लीट मैनेजमेंट (Fleet Analytics)',
    featFleetDesc: 'प्रत्येक हार्वेस्टर की कटाई, डीजल खपत और कार्यक्षमता ट्रैक करें',
    cloudSecure: '100% सुरक्षित क्लाउड डेटा स्टोरेज व ऑफलाइन बैकअप',
    welcomeSubtitle: 'अपने ऑपरेटर खाते में प्रवेश करने के लिए विवरण दर्ज करें',
    signIn: 'साइन इन करें',
    signUp: 'नया खाता बनाएं',
    whatsappLogin: 'व्हाट्सएप लॉगिन',
    welcomeBack: 'पुनः स्वागत है',
    phoneLabel: 'मोबाइल नंबर',
    phonePlaceholder: 'अपना मोबाइल नंबर दर्ज करें',
    phoneRequired: 'मोबाइल नंबर आवश्यक है',
    phoneInvalid: 'कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें',
    sendOtp: 'ओटीपी भेजें',
    sendingOtp: 'ओटीपी भेजा जा रहा है...',
    dontWantOtp: 'ओटीपी का उपयोग नहीं करना चाहते?',
    loginWithPassword: 'पासवर्ड से लॉगिन करें',
    enterOtp: 'ओटीपी दर्ज करें',
    enterOtpPlaceholder: '6-अंकीय ओटीपी दर्ज करें',
    otpHintWhatsapp: 'व्हाट्सएप पर प्राप्त 6-अंकीय कोड देखें',
    otpHintSms: 'एसएमएस पर प्राप्त 6-अंकीय कोड देखें',
    resendOtp: 'पुनः ओटीपी भेजें',
    resending: 'पुनः भेजा जा रहा है...',
    verifyOtp: 'ओटीपी सत्यापित करें',
    verifying: 'सत्यापित हो रहा है...',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    passwordRequired: 'पासवर्ड आवश्यक है',
    passwordMinLength: 'पासवर्ड कम से कम 8 वर्णों का होना चाहिए',
    passwordComplexity: 'पासवर्ड में बड़ा अक्षर, छोटा अक्षर, संख्या व विशेष वर्ण होना चाहिए',
    rememberMe: 'मुझे याद रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    signInWith: 'इसके साथ साइन इन करें',
    signUpWith: 'इसके साथ खाता बनाएं',
    noAccount: 'क्या आपके पास खाता नहीं है?',
    alreadyAccount: 'पहले से खाता है?',
    getStarted: 'शुरुआत करें',
    fullNameLabel: 'पूरा नाम',
    fullNamePlaceholder: 'पूरा नाम दर्ज करें',
    fullNameRequired: 'पूरा नाम आवश्यक है',
    nameMinLength: 'नाम कम से कम 2 वर्णों का होना चाहिए',
    nameMaxLength: 'नाम 50 वर्णों से अधिक नहीं हो सकता',
    createPasswordPlaceholder: 'एक सुरक्षित पासवर्ड बनाएं',
    agreeTerms: 'मैं व्यक्तिगत डेटा के प्रसंस्करण से सहमत हूँ',
    personalData: 'व्यक्तिगत डेटा नीति',
    whatsappTitle: 'व्हाट्सएप लॉगिन',
    whatsappSubtitle: 'अपने व्हाट्सएप पर प्राप्त 6-अंकीय ओटीपी से सुरक्षित लॉगिन करें',
    whatsappPhonePlaceholder: '+91 9876543210',
    sendOtpWhatsapp: 'व्हाट्सएप द्वारा ओटीपी भेजें',
    sendingOtpWhatsapp: 'व्हाट्सएप पर ओटीपी भेजा जा रहा है...',
    preferPassword: 'पासवर्ड पसंद करते हैं?',
    codeSentTo: 'कोड भेजा गया',
    change: 'बदलें',
    enterOtp6Digit: '6-अंकीय ओटीपी दर्ज करें',
    checkWhatsappPhone: 'अपने फोन पर व्हाट्सएप चेक करें',
    expiresIn: 'समाप्त होने में समय',
    otpExpired: 'ओटीपी समाप्त हो गया',
    resendIn: 'पुनः भेजें',
    verifyOtpSignIn: 'ओटीपी सत्यापित करें व लॉगिन करें',
    backToRegularLogin: 'पासवर्ड से लॉगिन पर वापस'
  }
};

const ENGLISH_TRANSLATIONS: Translations = {
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
    no: 'No',
    close: 'Close',
    back: 'Back',
    refresh: 'Refresh',
    all: 'All',
    active: 'Active',
    completed: 'Completed'
  },
  nav: {
    dashboard: 'Dashboard',
    home: 'Home',
    addNew: 'Add New',
    records: 'Records',
    settings: 'Settings',
    more: 'More',
    profile: 'Profile'
  },
  form: {
    farmerInfo: 'Farmer Information',
    farmerName: 'Farmer Name',
    farmerNamePlaceholder: 'Enter full name',
    contactNumber: 'Mobile Number',
    contactNumberPlaceholder: '10-digit mobile number',
    date: 'Cutting Date',
    harvester: 'Harvester Machine',
    cuttingDetails: 'Cutting Details & Land Area',
    landInAcres: 'Land in Acres',
    landInAcresPlaceholder: '0.00',
    measureLandBtn: '📐 Measure Land (Map / GPS Walk)',
    ratePerAcre: 'Rate (₹/Acre)',
    ratePerAcrePlaceholder: '2500',
    totalAmount: 'Total Amount',
    paymentSettlement: 'Payment Settlement & Dues',
    cashPayment: 'Cash Paid on Sight (₹)',
    cashPaymentPlaceholder: '0',
    paymentDate: 'Promised Settlement Date',
    fullPaymentDate: 'Full Payment Promise Date',
    addNewRecord: 'Log Cutting Record',
    editRecord: 'Edit Cutting Record',
    commercialSummary: 'Commercial Calculation Summary',
    fullySettled: 'Fully Settled',
    dueToCollect: 'Due to Collect'
  },
  errors: {
    farmerNameRequired: 'Please enter farmer name (minimum 2 characters)',
    contactNumberRequired: 'Please enter a valid 10-digit mobile number',
    contactNumberInvalid: 'Please enter a valid 10-digit mobile number',
    dateRequired: 'Please select cutting date',
    landRequired: 'Please enter land area (greater than 0)',
    rateRequired: 'Please enter a valid rate per acre',
    cashExceedsTotal: 'Cash payment cannot exceed total amount',
    fillAllFields: 'Please fill all required fields correctly'
  },
  records: {
    title: 'All Cutting Records',
    subtitle: 'Total {{count}} records logged',
    searchPlaceholder: 'Search by farmer name, phone or date...',
    noRecords: 'No records found',
    noRecordsSubtitle: 'Go to "Add New" tab to create your first entry',
    changeSearch: 'Try adjusting your search criteria',
    addNewRecord: 'Go to "Add New" tab to create your first entry',
    date: 'Date',
    land: 'Land (Acres)',
    rate: 'Rate per Acre',
    harvester: 'Harvester',
    totalAmount: 'Total Amount',
    cashPaid: 'Cash Paid',
    pendingAmount: 'Pending Amount',
    fullPayment: 'Full Payment',
    fullPaymentPromise: 'Promise Date',
    editRecord: 'Edit',
    deleteRecord: 'Delete',
    shareRecord: 'Share Invoice',
    markedAsPaid: 'Marked as Paid',
    markAsPaidButton: 'Mark as Paid',
    today: 'Today',
    yesterday: 'Yesterday',
    acresUnit: 'Acres',
    callFarmer: 'Call',
    filterToday: 'Today',
    filterYesterday: 'Yesterday',
    filterWeek: 'This Week',
    filterMonth: 'This Month',
    filterCustom: 'Custom Date',
    filterAll: 'All Time',
    customSingleDate: 'Single Date',
    customDateRange: 'Date Range',
    fromDate: 'From Date',
    toDate: 'To Date',
    selectDate: 'Select Date',
    clearFilter: 'Clear',
    noRecordsForDate: 'No records found for this date or period',
    viewAllRecords: 'View All Records',
    filterSummary: '{{count}} records • {{acres}} acres • ₹{{total}} total'
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview of harvesting operations & ledger balances',
    activeOperations: 'Active Operations',
    refresh: 'Refresh',
    selectPeriod: 'Select Period',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
    totalRecords: 'Total Cutting Jobs',
    completedJobs: 'jobs completed',
    totalLand: 'Total Harvested Area',
    acresHarvested: 'Acres Harvested',
    acres: 'Acres',
    perCutting: 'avg per cutting',
    avgYieldRate: 'Average Cutting Rate',
    totalAmount: 'Total Gross Volume',
    totalEarnings: 'Total Amount',
    totalCash: 'Cash Collected',
    totalAdvance: 'Paid on sight',
    pendingAmount: 'Outstanding Dues',
    outstandingDue: 'Outstanding Collection Due',
    allDuesCleared: 'All Dues Cleared',
    quickActions: 'Quick Actions',
    newCuttingJob: 'New Cutting Job',
    measureField: 'Measure Field',
    manageFleet: 'Fleet & Rates',
    exportCsv: 'Export CSV',
    recentJobs: 'Recent Cutting Jobs',
    inThisPeriod: 'in this period',
    viewFullLedger: 'View Full Ledger',
    paid: 'PAID',
    due: 'DUE',
    noRecords: 'No Cutting Records for this Period',
    noRecordsDesc: 'There are no harvesting jobs logged under the selected time frame. Switch to "All Time" or log a new entry.',
    averageLand: 'Average Land per Job',
    averageRate: 'Average Rate per Acre',
    harvestTrend: 'Harvest Trends & Analytics',
    trendSubtitle: 'Timeline analysis of acres cut and earnings',
    chartRevenue: 'Revenue (₹)',
    chartAcres: 'Area (Acres)',
    chartJobs: 'Jobs',
    paymentRecovery: 'Recovery & Collection Ratio',
    recoverySubtitle: 'Cash collected vs pending credit balance',
    collected: 'Collected',
    pending: 'Pending Due',
    recoveryRate: 'Recovery Rate',
    fleetDistribution: 'Machine Utilization',
    topHarvesters: 'Active Fleet Machines',
    acresUnit: 'Acres',
    quickStats: 'Quick Stats'
  },
  app: {
    appTitle: 'Harvester Cutting Tracker',
    tagline: 'Harvest Operations & Ledger',
    totalBalance: 'Total Pending Balance'
  },
  messages: {
    recordSaved: 'Record saved successfully! 🎉',
    recordUpdated: 'Record updated successfully! ✅',
    recordDeleted: 'Record deleted successfully',
    recordMarkedAsPaid: 'Record marked as paid',
    markAsPaidConfirm: 'Mark as paid?',
    markAsPaidMessage: 'This will mark the record as paid (pending amount will be ₹0). You can edit it later if needed.',
    markAsPaidButton: 'Mark as Paid',
    saveError: 'Error saving record',
    updateError: 'Error updating record',
    deleteError: 'Error deleting record',
    recordNotFound: 'Record not found',
    deleteConfirm: 'Are you sure you want to delete "{{farmerName}}" record?\n\nThis action cannot be undone.',
    deleteConfirmMessage: 'Confirm Deletion',
    resetConfirm: 'Are you sure you want to reset all settings to defaults?',
    resetConfirmMessage: 'Confirm Reset',
    noDataToExport: 'No data available to export',
    dataExported: 'Data exported successfully as CSV',
    dataImported: 'Data imported successfully',
    dataCleared: 'All local data cleared successfully',
    settingsReset: 'Settings have been reset to defaults',
    copiedToClipboard: 'Copied to clipboard for sharing',
    logoutSuccess: 'Logged out successfully',
    logoutError: 'Error logging out',
    logoutConfirm: 'Are you sure you want to log out of your Harvester account?',
    logoutConfirmTitle: 'Log Out'
  },
  settings: {
    title: 'Settings',
    subtitle: 'Fleet, rate & personal preferences',
    cloudSynced: 'Cloud',
    profileEdit: 'Edit Profile',
    syncSuccess: 'Data is synced with secure cloud',
    activeStatus: 'Active',
    syncingStatus: 'Syncing...',
    harvesterSetup: 'Harvester Machines',
    harvesterSetupDescription: 'Manage fleet machines available during record entry',
    harvestersLoading: 'Loading machines...',
    harvesterCount: '{{count}} machines',
    harvesterCountOne: '1 machine',
    addHarvester: 'Add Machine',
    searchHarvesterPlaceholder: 'Search machine name...',
    defaultMachine: 'Default Machine',
    defaultMachineDesc: 'This machine will be pre-selected automatically when creating a new cutting record',
    selectDefaultHarvester: 'Select Default Machine',
    setAsDefault: 'Set as Default',
    isDefaultBadge: 'Default Machine',
    defaultHarvesterUpdated: 'Default machine updated successfully',
    makeDefaultCheckbox: 'Set as default machine for new records',
    unitNumber: 'Harvester Cutting Unit',
    harvesterNamePlaceholder: 'e.g. John Deere 1, Preet 987',
    saveHarvester: 'Save',
    editHarvester: 'Edit',
    removeHarvester: 'Remove',
    harvesterRequired: 'At least one harvester machine is required.',
    defaultRate: 'Default Cutting Rate',
    defaultRateDescription: 'Auto-fill this rate when creating a new cutting job',
    defaultRatePlaceholder: '2500',
    perAcreUnit: 'per Acre',
    conversionPill: '≈ ₹{{bigha}} per Bigha • ₹{{hectare}} per Hectare',
    quickPresets: 'Quick Rate Presets:',
    preferredUnit: 'Preferred Area Unit:',
    acre: 'Acre',
    bigha: 'Bigha',
    hectare: 'Hectare',
    preferences: 'Preferences',
    preferencesDesc: 'Theme, language & notification settings',
    themeSettings: 'Theme Settings',
    darkLightMode: 'Dark / Light Mode',
    themeDescription: 'Choose your visual theme preference',
    light: 'Light',
    dark: 'Dark',
    bottomNavLabels: 'Bottom Navigation Labels',
    bottomNavLabelsDesc: 'Show text labels below icons (turn off for a compact, ultra-slim dock)',
    defaultRecordFilter: 'Default Record Filter',
    defaultRecordFilterDesc: 'Choose which date period opens by default on Records page',
    filterTodayOption: 'Today',
    filterWeekOption: 'This Week',
    filterMonthOption: 'This Month',
    filterAllOption: 'All Records',
    language: 'Language',
    languageDescription: 'Select your preferred language',
    languageHindi: 'हिन्दी',
    languageEnglish: 'English',
    currencyFormat: 'Currency Format',
    currencyDescription: 'Choose currency display format',
    currencyINR: 'Indian Rupee (₹)',
    currencyUSD: 'US Dollar ($)',
    currencyGBP: 'British Pound (£)',
    notifications: 'Notifications',
    notificationsDescription: 'Receive payment collection alerts and reminders',
    systemNotifications: 'Mobile System Notification Alerts',
    systemNotificationsDesc: 'Auto push alert on mobile on promised settlement dates',
    testNotification: 'Send Test Notification',
    settlementDueToday: 'Payment Promise Due Today',
    settlementDueTodayDesc: 'Farmers have promised settlement due today',
    dataManagement: 'Data Management & Backup',
    dataManagementDesc: 'Cutting records backup and Excel export',
    exportData: 'Export Data (CSV)',
    exportDataDesc: 'Download all records securely in an Excel / CSV file',
    importData: 'Import Data (CSV/JSON)',
    importDataDesc: 'Restore records from a previously saved file',
    clearAllData: 'Clear All Data',
    clearAllDataDesc: 'Clear local records cached on this device',
    resetSettings: 'Reset Settings',
    resetDescription: 'Reset all settings back to default values',
    resetButton: 'Reset to Defaults',
    logout: 'Log Out',
    logoutDesc: 'Sign out of your account securely',
    systemVersion: 'Version'
  },
  more: {
    title: 'Profile & Utilities',
    subtitle: 'Account details and system management',
    verifiedOperator: 'Verified Operator',
    businessContractor: 'Agri Cutting Contractor',
    idLabel: 'ID:',
    editProfile: 'Edit Profile',
    totalRecords: 'Total Records',
    acresHarvested: 'Acres Harvested',
    fleetHarvesters: 'Fleet Machines',
    appTools: 'App Tools & Utilities',
    appToolsDesc: 'Manage land measurement, backups, and app preferences',
    landTracker: 'Land Area Tracker',
    landTrackerDesc: 'Map pin points & GPS walk field acreage calculator',
    settingsTitle: 'Settings & Fleet',
    settingsDesc: 'Cutting rate, machines, theme & language preferences',
    exportTitle: 'Export Data (CSV)',
    exportDesc: 'Download cutting ledger records as CSV spreadsheet',
    importTitle: 'Import Data',
    importDesc: 'Restore records from CSV or JSON file',
    about: 'About',
    appName: 'App Name:',
    version: 'Version:',
    description: 'Description:',
    appType: 'Application Type:',
    appTypeValue: 'Cloud Synchronized Agri-Tech Ledger',
    development: 'Development:',
    developmentValue: 'Angular 21 + Modern Material Design',
    shareApp: 'Share App',
    help: 'Help & Support',
    helpSubtitle: 'Frequently Asked Questions',
    howToAddRecord: 'How to add a new cutting job?',
    howToAddRecordAnswer: 'Go to the "Add New" tab, fill in farmer name, phone, land area, and rate, then click "Save".',
    howToEditRecord: 'How to edit an existing record?',
    howToEditRecordAnswer: 'In the "Records" tab, expand the farmer\'s card and click the "Edit" button.',
    howToExport: 'How to export data to Excel?',
    howToExportAnswer: 'Go to "More" > "Export Data" to download a complete CSV spreadsheet.',
    howToChangeTheme: 'How to change the theme?',
    howToChangeThemeAnswer: 'Go to "Settings" and choose either Light or Dark mode under Preferences.',
    contact: 'Contact Us',
    contactSubtitle: 'Get in touch for support',
    email: 'Email:',
    phone: 'Phone:',
    location: 'Location:',
    locationValue: 'India',
    sendFeedback: 'Send Feedback',
    logout: 'Log Out',
    logoutDescription: 'Sign out of your account securely'
  },
  land: {
    title: 'Land Area Tracker',
    mapMode: 'Map Pin Mode',
    walkMode: 'GPS Walk Mode',
    mapPill: 'Map Points',
    walkPill: 'Walk GPS',
    satellite: 'Satellite',
    street: 'Street',
    locate: 'Locate',
    savedFields: 'Saved Fields',
    mapGuide: 'Tap field corners on map. Drag points to adjust borders.',
    walkGuide: 'Walk around the field perimeter. GPS will record borders automatically.',
    walkStart: 'Start Walk',
    walkPause: 'Pause',
    walkResume: 'Resume',
    walkFinish: 'Finish Walk',
    clearPoints: 'Clear Points',
    undoPoint: 'Undo Point',
    calculatedArea: 'Calculated Field Area',
    acres: 'Acres',
    bigha: 'Bigha',
    hectares: 'Hectares',
    perimeter: 'Perimeter',
    saveField: 'Save Field',
    fieldName: 'Field Name',
    fieldNamePlaceholder: 'e.g. North Wheat Field',
    gpsWaiting: 'GPS Waiting...',
    markCorner: 'Mark Corner (+)',
    applyArea: 'Use This Area',
    createCuttingRecord: 'Create Cutting Record',
    saveFieldModalTitle: 'Save Field Measurement',
    fieldPlotName: 'Field / Farmer Plot Name',
    savedFieldsTitle: 'Saved Field Records',
    noSavedFields: 'No saved fields yet.',
    noSavedFieldsHint: 'Measure a field and tap "Save Field" to save it here.',
    viewOnMap: 'View on Map',
    sqMeters: 'Sq. Meters',
    sqFeet: 'Sq. Feet',
    pointsLabel: 'Points'
  },
  dialogs: {
    editProfileTitle: 'Edit Operator Profile',
    editProfileSubtitle: 'Update your personal contact and farm business details',
    fullNameLabel: 'Full Name / Operator Name *',
    fullNamePlaceholder: 'Enter your full name',
    mobileLabel: 'Mobile Number *',
    mobilePlaceholder: 'Enter 10-digit mobile number',
    farmBusinessLabel: 'Farm / Business Name (Optional)',
    farmBusinessPlaceholder: 'e.g. Kisan Harvester Works'
  },
  auth: {
    back: 'Back',
    brandBadge: 'AgriTech Harvester Pro',
    brandTitle: 'Harvester Cutting & Ledger Tracker',
    brandDesc: 'Digital recordkeeping for crop harvesting, satellite & GPS land area measurement, and transparent payment settlement ledger.',
    featLandTitle: 'Map & GPS Land Area Measurement',
    featLandDesc: 'Walk around boundaries or mark points on satellite maps to calculate Acres and Bigha',
    featLedgerTitle: 'Instant Billing & Ledger Summary',
    featLedgerDesc: 'Auto calculate rate per acre, cash payments, dues, and share receipts instantly',
    featFleetTitle: 'Machine & Fleet Analytics',
    featFleetDesc: 'Track machine cutting performance, fuel efficiency, and seasonal logs',
    cloudSecure: '100% Secure Cloud Storage with Offline Backup',
    welcomeSubtitle: 'Enter personal details to access your operator account',
    signIn: 'Sign in',
    signUp: 'Sign up',
    whatsappLogin: 'WhatsApp Login',
    welcomeBack: 'Welcome back',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'Enter your phone number',
    phoneRequired: 'Phone number is required',
    phoneInvalid: 'Please enter a valid 10-digit phone number',
    sendOtp: 'Send OTP',
    sendingOtp: 'Sending OTP...',
    dontWantOtp: "Don't want to use OTP?",
    loginWithPassword: 'Login with password',
    enterOtp: 'Enter OTP',
    enterOtpPlaceholder: 'Enter 6-digit OTP',
    otpHintWhatsapp: 'Check WhatsApp for the 6-digit code',
    otpHintSms: 'Check SMS for the 6-digit code',
    resendOtp: 'Resend OTP',
    resending: 'Resending...',
    verifyOtp: 'Verify OTP',
    verifying: 'Verifying...',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    passwordRequired: 'Password is required',
    passwordMinLength: 'Password must be at least 8 characters',
    passwordComplexity: 'Must contain uppercase, lowercase, number & special character',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signInWith: 'Sign in with',
    signUpWith: 'Sign up with',
    noAccount: "Don't have an account?",
    alreadyAccount: 'Already have an account?',
    getStarted: 'Get Started',
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'Enter full name',
    fullNameRequired: 'Full name is required',
    nameMinLength: 'Name must be at least 2 characters',
    nameMaxLength: 'Name cannot exceed 50 characters',
    createPasswordPlaceholder: 'Create a password',
    agreeTerms: 'I agree to the processing of',
    personalData: 'Personal data',
    whatsappTitle: 'WhatsApp Login',
    whatsappSubtitle: 'Sign in securely with a 6-digit OTP sent to your WhatsApp',
    whatsappPhonePlaceholder: '+91 9876543210',
    sendOtpWhatsapp: 'Send OTP via WhatsApp',
    sendingOtpWhatsapp: 'Sending OTP to WhatsApp...',
    preferPassword: 'Prefer password?',
    codeSentTo: 'Code sent to',
    change: 'Change',
    enterOtp6Digit: 'Enter 6-Digit OTP',
    checkWhatsappPhone: 'Check WhatsApp on your phone for code',
    expiresIn: 'Expires in',
    otpExpired: 'OTP Expired',
    resendIn: 'Resend in',
    verifyOtpSignIn: 'Verify OTP & Sign In',
    backToRegularLogin: 'Sign in with password'
  }
};

const TRANSLATIONS: Record<Language, Translations> = {
  hi: HINDI_TRANSLATIONS,
  en: ENGLISH_TRANSLATIONS
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
