import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs';

/** Retourne la route d'accueil selon le rôle de l'utilisateur connecté. */
export function getHomeRouteForRole(role: string | undefined): string {
  switch (role) {
    case 'APPRENANT':               return '/apprenant/dashboard';
    case 'ADMIN_CENTRE':            return '/admin/analytics';
    case 'ADMIN_ETABLISSEMENT':     return '/admin-etab/dashboard';
    case 'FORMATEUR':               return '/dashboard';
    case 'PERSONNEL_ADMINISTRATIF': return '/dashboard';
    default:                        return '/dashboard';
  }
}

/**
 * Attend que l'initialisation auth (loadMe) soit terminée avant d'évaluer l'accès.
 * Cela évite les fausses redirections lors du rechargement de page.
 */
const waitForAuthThenCheck = (roles?: string[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isReady$.pipe(
    filter((ready) => ready === true),
    take(1),
    map(() => {
      // Non authentifié
      if (!auth.isAuthenticated) {
        router.navigate(['/login']);
        return false;
      }

      // Aucun rôle requis : accès libre si authentifié
      if (!roles || roles.length === 0) {
        return true;
      }

      // Vérification du rôle
      if (!auth.hasAnyRole(roles)) {
        // Rediriger vers l'espace approprié du rôle réel (pas toujours /dashboard)
        const homeRoute = getHomeRouteForRole(auth.currentUser?.role);
        router.navigate([homeRoute]);
        return false;
      }

      return true;
    }),
  );
};

export const authGuard: CanActivateFn = () => waitForAuthThenCheck();

export const adminCentreGuard: CanActivateFn = () => waitForAuthThenCheck(['ADMIN_CENTRE']);

export const adminEtabGuard: CanActivateFn = () =>
  waitForAuthThenCheck(['ADMIN_CENTRE', 'ADMIN_ETABLISSEMENT']);

export const formateurGuard: CanActivateFn = () =>
  waitForAuthThenCheck(['ADMIN_CENTRE', 'ADMIN_ETABLISSEMENT', 'FORMATEUR']);

export const apprenantGuard: CanActivateFn = () =>
  waitForAuthThenCheck(['APPRENANT']);

export const personnelAdminGuard: CanActivateFn = () =>
  waitForAuthThenCheck(['PERSONNEL_ADMINISTRATIF', 'ADMIN_ETABLISSEMENT', 'ADMIN_CENTRE']);

export const staffGuard: CanActivateFn = () =>
  waitForAuthThenCheck(['ADMIN_CENTRE', 'ADMIN_ETABLISSEMENT', 'FORMATEUR', 'PERSONNEL_ADMINISTRATIF']);
