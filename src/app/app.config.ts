import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { routes } from './app.routes';
import { SelectivePreloadingStrategy } from './strategies/selective-preloading.strategy';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

// ✅ Google Login imports
import {
  SocialLoginModule,
  SocialAuthServiceConfig,
  GoogleLoginProvider,
} from '@abacritt/angularx-social-login';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { RequestIdInterceptor } from './core/interceptors/request-id.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: RequestIdInterceptor, multi: true },
    // ✅ Use your custom strategy
    provideRouter(routes, withPreloading(SelectivePreloadingStrategy)),

    provideAnimationsAsync(),
    importProvidersFrom(
      MatToolbarModule,
      MatButtonModule,
      MatMenuModule,
      MatIconModule
    ),
    // ✅ Google login configuration
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              '88467193803-7fdu7pmu26iqo0qflg1a95fhcnaf3v4n.apps.googleusercontent.com'
            ),
          },
        ],
        onError: (err) => {
          console.error('Google login error:', err);
        },
      } as SocialAuthServiceConfig,
    },
  ]
};