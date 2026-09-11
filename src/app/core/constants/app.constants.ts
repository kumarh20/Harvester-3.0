/**
 * Application-wide Constants & Default Values
 * Adheres to Open-Closed Principle (OCP) and Single Responsibility Principle (SRP).
 */

export const APP_CONSTANTS = {
  APP_NAME: 'Harvester Tracker',
  APP_VERSION: '2.0.0',
  DEFAULT_LANGUAGE: 'hi',
  CURRENCY_SYMBOL: '₹',
  DEFAULT_COUNTRY_CODE: '+91',
  DEFAULT_RATE_PER_ACRE: 1200,
  PHONE_NUMBER_LENGTH: 10,
  OTP_LENGTH: 6,
  
  STORAGE_KEYS: {
    RECORDS_CACHE: 'harvester_records_cache',
    REMINDERS_CACHE: 'harvester_reminders_cache',
    NOTIFICATIONS: 'harvester_app_notifications_list_v1',
    AUTH_TOKEN: 'harvester_auth_token',
    USER_PROFILE: 'harvester_user_profile',
    THEME: 'theme',
    LANGUAGE: 'language',
    NOTIFICATIONS_ENABLED: 'notifications'
  },

  LAND_UNITS: [
    { key: 'acre', labelHi: 'एकड़', labelEn: 'Acre', multiplierToAcre: 1.0 },
    { key: 'bigha_up', labelHi: 'बीघा (UP/MP)', labelEn: 'Bigha (UP/MP)', multiplierToAcre: 0.208 },
    { key: 'bigha_punjab', labelHi: 'बीघा (Punjab/Haryana)', labelEn: 'Bigha (Punjab/Haryana)', multiplierToAcre: 0.25 },
    { key: 'guntha', labelHi: 'गुंठा (MH/KA)', labelEn: 'Guntha (MH/KA)', multiplierToAcre: 0.025 },
    { key: 'kanal', labelHi: 'कनाल', labelEn: 'Kanal', multiplierToAcre: 0.125 }
  ],

  PAYMENT_STATUSES: {
    PAID: 'paid',
    PENDING: 'pending',
    PARTIAL: 'partial'
  },

  REMINDER_SLOTS: [
    { slotId: 1, hour: 7, labelHi: 'सुबह 7:00 बजे', labelEn: '7:00 AM' },
    { slotId: 2, hour: 11, labelHi: 'सुबह 11:00 बजे', labelEn: '11:00 AM' },
    { slotId: 3, hour: 15, labelHi: 'दोपहर 3:00 बजे', labelEn: '3:00 PM' },
    { slotId: 4, hour: 19, labelHi: 'शाम 7:00 बजे', labelEn: '7:00 PM' }
  ]
} as const;
