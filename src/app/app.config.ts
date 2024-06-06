// Author: Preston Lee

import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { ToastService } from './toast/toast.service';
import { MomentModule } from 'ngx-moment';

export const appConfig: ApplicationConfig = {
  providers: [
    ToastService,
    importProvidersFrom(BrowserModule, FormsModule, MomentModule),
    provideHttpClient(withInterceptorsFromDi()),
    provideZoneChangeDetection({ eventCoalescing: true }),
     provideRouter(routes)]
};
