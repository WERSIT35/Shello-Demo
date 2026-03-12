import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { map, of, switchMap } from 'rxjs';

import { ContentService, type PageToggles } from '../services/content.service';
import { AuthService } from '../services/auth.service';

const adminSafePages = new Set(['adminContent']);

function resolvePageKey(route: ActivatedRouteSnapshot): string | undefined {
  return (route.data?.['pageKey'] as string | undefined) ?? undefined;
}

export const pageToggleGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const content = inject(ContentService);
  const auth = inject(AuthService);
  const pageKey = resolvePageKey(route);

  if (!pageKey) {
    return true;
  }

  if (adminSafePages.has(pageKey)) {
    return true;
  }

  return auth.ensureSession().pipe(
    switchMap(() => {
      if (auth.isAdmin()) {
        return of(true);
      }

      return content.getPageToggles().pipe(
        map((toggles: PageToggles) => {
          if (toggles[pageKey as keyof PageToggles] === false) {
            return router.parseUrl('/');
          }

          return true;
        })
      );
    })
  );
};
