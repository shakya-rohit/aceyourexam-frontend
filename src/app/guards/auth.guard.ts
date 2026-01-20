import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('AYE_TOKEN');

  if (token) {
    return true;
  } else {
    alert('Please log in to access this page.');
    router.navigate(['/auth']);
    return false;
  }
};