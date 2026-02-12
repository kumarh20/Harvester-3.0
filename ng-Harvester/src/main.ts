import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from '../../environments/environment';
import { connectFunctionsEmulator, getFunctions } from '@angular/fire/functions';

// bootstrapApplication(App, appConfig);
bootstrapApplication(App, appConfig).then(() => {
    if (environment.useEmulators) {
        const functions = getFunctions();
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log('🔥 Firebase Functions Emulator Connected');
    }
});