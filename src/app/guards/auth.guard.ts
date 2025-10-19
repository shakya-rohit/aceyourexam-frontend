import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const loggedIn = localStorage.getItem('AYE_LOGGED_IN');
  const router = new Router();

  if (loggedIn === 'true') {
    return true;
  } else {
    alert('Please log in to access this page.');
    router.navigate(['/auth']);
    return false;
  }
};