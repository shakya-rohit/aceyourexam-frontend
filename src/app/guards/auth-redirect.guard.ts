import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authRedirectGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('AYE_TOKEN');

  if (token) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};