import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21+ da zoneless standart — bu yerda intentni aniq hujjatlaymiz
    // (kelajakda biror kutubxona zone.js tortib kelsa ham zoneless qoladi).
    provideZonelessChangeDetection(),

    // Ushlanmagan xato/promise rejection'larni global tutadi (v20+).
    provideBrowserGlobalErrorListeners(),

    provideRouter(
      routes,
      withComponentInputBinding(), // route param/query/data -> komponent input() signal
      // View Transitions API bilan silliq route o'tishlari.
      // skipInitialTransition — auth-guard redirect dastlabki transition'ni bekor qilib
      // InvalidStateError bermasligi uchun.
      withViewTransitions({ skipInitialTransition: true }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),

    // withFetch() — XHR o'rniga zamonaviy Fetch backend.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    MessageService,
    providePrimeNG({
      // Barcha overlay'lar (menu, dropdown, popover...) body'ga append qilinadi —
      // aks holda sticky topbar ichida inline render bo'lib, gorizontal overflow
      // hosil qilib content'ni siljitadi.
      overlayAppendTo: 'body',
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
    }),
  ],
};
