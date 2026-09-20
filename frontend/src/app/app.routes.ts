import { Routes } from '@angular/router';
import {
  authGuard, adminCentreGuard, adminEtabGuard, formateurGuard,
  apprenantGuard, personnelAdminGuard, staffGuard,
} from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./modules/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./modules/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'candidature', redirectTo: '/apprenant/candidatures', pathMatch: 'full' },
  { path: 'candidature/mes-voeux', redirectTo: '/apprenant/candidatures', pathMatch: 'full' },
  { path: 'certificats/verifier', loadComponent: () => import('./modules/certificats/verify/verify.component').then(m => m.VerifyComponent) },
  { path: 'certificats/verifier/:numeroSerie', loadComponent: () => import('./modules/certificats/verify/verify.component').then(m => m.VerifyComponent) },
  { path: 'verifier', redirectTo: 'certificats/verifier', pathMatch: 'full' },
  { path: 'verifier/:numeroSerie', redirectTo: 'certificats/verifier/:numeroSerie' },

  // Tableau de bord multi-rôle (ADMIN, FORMATEUR, PERSONNEL) - Les APPRENANTS sont automatiquement redirigés vers /apprenant/dashboard
  { path: 'dashboard', canActivate: [staffGuard], loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent) },

  { path: 'admin/accueil', canActivate: [adminCentreGuard], loadComponent: () => import('./modules/admin-centre/accueil/admin-accueil.component').then(m => m.AdminAccueilComponent) },
  { path: 'admin/filieres', canActivate: [adminCentreGuard], loadComponent: () => import('./modules/admin-centre/filieres/filieres-central.component').then(m => m.FilieresCentralComponent) },
  { path: 'admin/etablissements', canActivate: [adminCentreGuard], loadComponent: () => import('./modules/admin-centre/etablissements/etablissements.component').then(m => m.EtablissementsComponent) },
  { path: 'admin/utilisateurs', canActivate: [adminCentreGuard], loadComponent: () => import('./modules/admin-centre/utilisateurs/utilisateurs.component').then(m => m.UtilisateursComponent) },
  { path: 'admin/analytics', canActivate: [adminCentreGuard], loadComponent: () => import('./modules/admin-centre/analytics/analytics.component').then(m => m.AnalyticsComponent) },
  { path: 'admin/admissions', canActivate: [adminCentreGuard], loadComponent: () => import('./modules/admin-etab/admission/admission-admin.component').then(m => m.AdmissionAdminComponent) },
  { path: 'admin/candidatures', redirectTo: 'admin/admissions', pathMatch: 'full' },
  { path: 'admin/formations', canActivate: [adminCentreGuard], loadComponent: () => import('./modules/formateur/formations/formations.component').then(m => m.FormationsComponent) },
  { path: 'admin/formations/:id', canActivate: [adminCentreGuard], loadComponent: () => import('./modules/formateur/formation-detail/formation-detail.component').then(m => m.FormationDetailComponent) },

  { path: 'admin-etab/dashboard', canActivate: [adminEtabGuard], loadComponent: () => import('./modules/admin-etab/dashboard/dashboard.component').then(m => m.AdminEtabDashboardComponent) },
  { path: 'admin-etab/utilisateurs', canActivate: [adminEtabGuard], loadComponent: () => import('./modules/admin-etab/utilisateurs/utilisateurs-etab.component').then(m => m.UtilisateursEtabComponent) },
  { path: 'admin-etab/sessions-admission', canActivate: [adminEtabGuard], loadComponent: () => import('./modules/admin-etab/admission/admission-admin.component').then(m => m.AdmissionAdminComponent) },
  { path: 'admin-etab/candidatures', redirectTo: 'admin-etab/sessions-admission', pathMatch: 'full' },

  { path: 'formations', canActivate: [formateurGuard], loadComponent: () => import('./modules/formateur/formations/formations.component').then(m => m.FormationsComponent) },
  { path: 'formations/:id', canActivate: [authGuard], loadComponent: () => import('./modules/formateur/formation-detail/formation-detail.component').then(m => m.FormationDetailComponent) },
  { path: 'cours/:id', redirectTo: '/apprenant/formations' },
  { path: 'cours', redirectTo: '/apprenant/formations' },
  { path: 'mes-cours', redirectTo: '/apprenant/formations' },
  { path: 'mes-devoirs', redirectTo: '/apprenant/evaluations/depot-devoir' },
  { path: 'mes-quiz', redirectTo: '/apprenant/evaluations/depot-devoir' },
  { path: 'mes-certificats', redirectTo: '/apprenant/certificats' },
  { path: 'devoirs', redirectTo: '/apprenant/evaluations/depot-devoir' },
  { path: 'notes', canActivate: [formateurGuard], loadComponent: () => import('./modules/formateur/notes/notes.component').then(m => m.NotesComponent) },
  { path: 'devoirs/noter', canActivate: [formateurGuard], loadComponent: () => import('./modules/formateur/devoirs-noter/devoirs-noter.component').then(m => m.DevoirsNoterComponent) },
  { path: 'seances', canActivate: [formateurGuard], loadComponent: () => import('./modules/seances/seances-list/seances-list.component').then(m => m.SeancesListComponent) },
  { path: 'seances/:id', canActivate: [formateurGuard], loadComponent: () => import('./modules/seances/seance-detail/seance-detail.component').then(m => m.SeanceDetailComponent) },

  // ─── ESPACE APPRENANT DÉDIÉ ──────────────────────────────────────────────────
  {
    path: 'apprenant',
    canActivate: [apprenantGuard],
    loadComponent: () => import('./modules/apprenant/apprenant-shell/apprenant-shell.component').then(m => m.ApprenantShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./modules/apprenant/dashboard/apprenant-dashboard.component').then(m => m.ApprenantDashboardComponent) },
      { path: 'candidatures', loadComponent: () => import('./modules/admission/candidature/candidature.component').then(m => m.CandidatureComponent) },
      { path: 'formations', loadComponent: () => import('./modules/apprenant/mes-formations/mes-formations.component').then(m => m.MesFormationsComponent) },
      { path: 'formations/:id', loadComponent: () => import('./modules/apprenant/mes-formations/formation-detail/formation-detail.component').then(m => m.FormationDetailComponent) },
      { path: 'seances', loadComponent: () => import('./modules/apprenant/mes-seances/mes-seances.component').then(m => m.MesSeancesComponent) },
      { path: 'cours', redirectTo: 'formations' },
      { path: 'cours/:id', redirectTo: 'formations' },
      { path: 'evaluations', redirectTo: 'evaluations/depot-devoir' },
      { path: 'evaluations/quiz-player/:id', loadComponent: () => import('./modules/apprenant/evaluations/quiz-player/quiz-player.component').then(m => m.QuizPlayerComponent) },
      { path: 'evaluations/depot-devoir', loadComponent: () => import('./modules/apprenant/evaluations/depot-devoir/depot-devoir.component').then(m => m.DepotDevoirComponent) },
      { path: 'devoirs', redirectTo: 'evaluations/depot-devoir' },
      { path: 'quiz', redirectTo: 'evaluations/depot-devoir' },
      { path: 'certificats', loadComponent: () => import('./modules/apprenant/mes-certificats/mes-certificats.component').then(m => m.MesCertificatsComponent) },
      { path: 'certificats/verifier/:numeroSerie', redirectTo: '/certificats/verifier/:numeroSerie' },
      { path: 'certificats/verifier', redirectTo: '/certificats/verifier' },
      { path: 'verifier/:numeroSerie', redirectTo: '/certificats/verifier/:numeroSerie' },
      { path: 'verifier', redirectTo: '/certificats/verifier' },
      { path: 'profil', loadComponent: () => import('./modules/apprenant/mon-profil/mon-profil.component').then(m => m.MonProfilComponent) },
    ],
  },

  // ─── Accès direct quiz (lien depuis notification, etc.) ──────────────────────
  { path: 'quiz/:id', redirectTo: '/apprenant/evaluations/quiz-player/:id' },

  { path: 'personnel/assiduite', canActivate: [personnelAdminGuard], loadComponent: () => import('./modules/personnel/assiduite/assiduite.component').then(m => m.AssiduiteComponent) },

  { path: '', loadComponent: () => import('./modules/landing/landing.component').then(m => m.LandingComponent) },
  { path: '**', loadComponent: () => import('./modules/not-found/not-found.component').then(m => m.NotFoundComponent) },
];

