import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthMockService } from './auth-mock.service';

/** Sin rol elegido → al login. */
export const sesionGuard: CanActivateFn = () => {
  const auth = inject(AuthMockService);
  const router = inject(Router);
  return auth.rol() ? true : router.createUrlTree(['/login']);
};
