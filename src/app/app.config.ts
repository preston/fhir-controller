// Author: Preston Lee

import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { MomentModule } from 'ngx-moment';
import { MarkdownModule } from 'ngx-markdown';
import { provideToastr } from 'ngx-toastr';
import { HIGHLIGHT_OPTIONS, HighlightJSOptions } from 'ngx-highlightjs';

import { routes } from './app.routes';
import { SettingsService } from './settings/settings.service';
import { LoaderService } from './loader/loader.service';
import { LibraryService } from './library.service';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
      FormsModule,
      MomentModule,
      MarkdownModule.forRoot()),
    provideAnimations(), // required animations providers
    provideToastr(), // Toastr providers
    provideHttpClient(withInterceptorsFromDi()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: <HighlightJSOptions>{
        coreLibraryLoader: () => import('highlight.js/lib/core'),
        languages: {
          json: () => import('highlight.js/lib/languages/json'),
          // javascript: () => import('highlight.js/lib/languages/javascript'),
          // typescript: () => import('highlight.js/lib/languages/typescript'),
          // xml: () => import('highlight.js/lib/languages/xml'),
          // css: () => import('highlight.js/lib/languages/css'),
          // sql: () => import('highlight.js/lib/languages/sql'),
          // bash: () => import('highlight.js/lib/languages/bash'),
          // yaml: () => import('highlight.js/lib/languages/yaml')
        }
      }
    },
    SettingsService,
    LoaderService,
    LibraryService
  ]
};
