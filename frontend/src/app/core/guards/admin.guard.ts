import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { IS_STATIC_MODE } from '../config/static-mode.config';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  if (IS_STATIC_MODE) {
    return router.parseUrl('/');
  }

  return auth.ensureSession().pipe(
    map(() => {
      if (!auth.isAuthenticated()) {
        return router.parseUrl('/login');
      }

      if (!auth.isAdmin()) {
        return router.parseUrl('/');
      }

      return true;
    })
  );
};
