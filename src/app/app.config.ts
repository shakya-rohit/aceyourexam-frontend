import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { routes } from './app.routes';
import { SelectivePreloadingStrategy } from './strategies/selective-preloading.strategy';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

export const appConfig: ApplicationConfig = {
  providers: [
    // ✅ Use your custom strategy
    provideRouter(routes, withPreloading(SelectivePreloadingStrategy)),

    provideAnimationsAsync(),
    importProvidersFrom(
      MatToolbarModule,
      MatButtonModule,
      MatMenuModule,
      MatIconModule
    )
  ]
};