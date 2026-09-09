import { bootstrapApplication } from '@angular/platform-browser';
import { setLogLevel, LogLevel } from '@angular/fire';
import { appConfig } from './app/app.config';
import { App } from './app/app';

setLogLevel(LogLevel.SILENT);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
