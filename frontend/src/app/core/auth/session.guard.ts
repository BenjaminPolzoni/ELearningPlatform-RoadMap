import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthMockService } from './auth-mock.service';

/** No role chosen → go to login. */
export const sessionGuard: CanActivateFn = () => {
  const auth = inject(AuthMockService);
  const router = inject(Router);
  return auth.role() ? true : router.createUrlTree(['/login']);
};
