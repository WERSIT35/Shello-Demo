import { registerLocaleData } from '@angular/common';
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import localeKa from '@angular/common/locales/ka';

registerLocaleData(localeKa);

declare const $localize: { locale?: string };

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: LOCALE_ID,
      useFactory: () => (typeof $localize !== 'undefined' && $localize.locale) || 'ka'
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptorsFromDi())
  ]
};
