import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return auth.ensureSession().pipe(
    map(() => {
      if (!auth.isAuthenticated()) {
        return router.parseUrl('/login');
      }

      return true;
    })
  );
};
