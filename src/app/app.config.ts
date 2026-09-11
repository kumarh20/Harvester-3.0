import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { CustomDateAdapter, CUSTOM_DATE_FORMATS } from './core/adapters/custom-date-adapter';
import { apiInterceptor } from './core/interceptors/api.interceptor';


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOeKhANqqFns6voixH0ugud6LF0ABoxOE",
  authDomain: "harvester-tracker-f6cab.firebaseapp.com",
  databaseURL: "https://harvester-tracker-f6cab-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "harvester-tracker-f6cab",
  storageBucket: "harvester-tracker-f6cab.firebasestorage.app",
  messagingSenderId: "342892753940",
  appId: "1:342892753940:web:57b24d103ce61ad0d1e301"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ]
};
