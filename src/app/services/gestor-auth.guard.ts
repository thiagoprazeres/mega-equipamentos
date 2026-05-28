import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const gestorAuthGuard: CanActivateFn = async () => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const router = inject(Router);
  const authService = inject(AuthService);
  const session = await authService.getAdminSession();

  return session ? true : router.parseUrl('/gestor/login');
};
