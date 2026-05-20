import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { IS_STATIC_MODE } from '../config/static-mode.config';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (IS_STATIC_MODE) {
    return router.parseUrl('/');
  }

  return auth.ensureSession().pipe(
    map(() => {
      if (auth.isAuthenticated()) {
        return router.parseUrl('/');
      }

      return true;
    })
  );
};
