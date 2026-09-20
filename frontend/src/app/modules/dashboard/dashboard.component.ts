import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { MainLayoutComponent } from '../../shared/layout/main-layout.component';
import { KpiGlobal, KpiEtablissement } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="p-8">
        <div class="max-w-6xl mx-auto">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-3xl font-bold text-vc-primary font-heading">Tableau de bord</h1>
              <div class="barre my-2"></div>
            </div>
            <span class="badge" [class]="badgeClass">{{ user?.role }}</span>
          </div>

          @if (user) {
            <p class="text-vc-secondary text-sm mb-8">
              Bienvenue, <strong>{{ user.prenom }} {{ user.nom }}</strong>
            </p>
          }

          @if (kpiGlobal) {
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div class="card text-center"><p class="text-2xl font-bold text-vc-primary">{{ kpiGlobal.etablissements }}</p><p class="text-xs text-slate-500">Établissements</p></div>
              <div class="card text-center"><p class="text-2xl font-bold text-vc-primary">{{ kpiGlobal.apprenants }}</p><p class="text-xs text-slate-500">Apprenants</p></div>
              <div class="card text-center"><p class="text-2xl font-bold text-vc-primary">{{ kpiGlobal.formateurs }}</p><p class="text-xs text-slate-500">Formateurs</p></div>
              <div class="card text-center"><p class="text-2xl font-bold text-vc-primary">{{ kpiGlobal.formations }}</p><p class="text-xs text-slate-500">Formations</p></div>
              <div class="card text-center"><p class="text-2xl font-bold text-vc-primary">{{ kpiGlobal.certificatsEmis }}</p><p class="text-xs text-slate-500">Certificats</p></div>
              <div class="card text-center"><p class="text-2xl font-bold text-vc-primary">{{ kpiGlobal.seancesPlanifiees }}</p><p class="text-xs text-slate-500">Séances</p></div>
            </div>
          }

          @if (kpiEtab) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div class="card text-center"><p class="text-2xl font-bold text-vc-secondary">{{ kpiEtab.tauxAssiduite }}%</p><p class="text-xs text-slate-500">Assiduité</p></div>
              <div class="card text-center"><p class="text-2xl font-bold text-vc-secondary">{{ kpiEtab.tauxCompletion }}%</p><p class="text-xs text-slate-500">Complétion</p></div>
              <div class="card text-center"><p class="text-2xl font-bold text-vc-secondary">{{ kpiEtab.moyenneGenerale }}/20</p><p class="text-xs text-slate-500">Moyenne</p></div>
              <div class="card text-center"><p class="text-2xl font-bold text-vc-secondary">{{ kpiEtab.certificatsEmis }}</p><p class="text-xs text-slate-500">Certificats émis</p></div>
            </div>
          }

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @if (isAdminCentre) {
              <a routerLink="/admin/analytics" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📊 Indicateurs & Analytics</h3>
                <p class="text-xs text-slate-500 mt-1">Cockpit des indicateurs nationaux consolidés</p>
              </a>
              <a routerLink="/admin/filieres" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📚 Pilotage des Filières (Classes)</h3>
                <p class="text-xs text-slate-500 mt-1">Supervision temps réel de toutes les filières et attributions</p>
              </a>
              <a routerLink="/admin/etablissements" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">🏢 Réseau des Établissements</h3>
                <p class="text-xs text-slate-500 mt-1">Superviser les centres et antennes agréées</p>
              </a>
              <a routerLink="/admin/utilisateurs" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">👥 Gestion des Utilisateurs</h3>
                <p class="text-xs text-slate-500 mt-1">Comptes, attributions et accès nationaux</p>
              </a>
              <a routerLink="/admin/admissions" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📬 Admissions & Doléances</h3>
                <p class="text-xs text-slate-500 mt-1">Sessions, dossiers candidats et demandes d'orientation</p>
              </a>
              <a routerLink="/admin/accueil" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">🌐 CMS & Portail Public</h3>
                <p class="text-xs text-slate-500 mt-1">Configuration des contenus et sections d'accueil</p>
              </a>
              <a routerLink="/admin/formations" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📖 Catalogue des Formations</h3>
                <p class="text-xs text-slate-500 mt-1">Supervision nationale des programmes, volumes horaires et vitrine Landing Page</p>
              </a>
            }
            @if (isAdminEtab) {
              <a routerLink="/admin-etab/dashboard" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📊 Mon Établissement</h3>
                <p class="text-xs text-slate-500 mt-1">Statistiques et indicateurs locaux de l'antenne</p>
              </a>
              <a routerLink="/admin-etab/utilisateurs" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">👥 Utilisateurs Établissement</h3>
                <p class="text-xs text-slate-500 mt-1">Comptes apprenants et formateurs de l'antenne</p>
              </a>
              <a routerLink="/admin-etab/sessions-admission" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📬 Sessions & Admissions</h3>
                <p class="text-xs text-slate-500 mt-1">Gestion des campagnes et validation des dossiers</p>
              </a>
            }
            @if (isFormateur) {
              <a routerLink="/formations" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📚 Mes Formations</h3>
                <p class="text-xs text-slate-500 mt-1">Modules, cours et ressources pédagogiques</p>
              </a>
              <a routerLink="/notes" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📝 Notes & Évaluations</h3>
                <p class="text-xs text-slate-500 mt-1">Saisie des notes et bulletins</p>
              </a>
              <a routerLink="/seances" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📅 Séances & Émargement</h3>
                <p class="text-xs text-slate-500 mt-1">Planifier et valider les présences</p>
              </a>
              <a routerLink="/devoirs/noter" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📑 Devoirs à corriger</h3>
                <p class="text-xs text-slate-500 mt-1">Correction et notation des devoirs</p>
              </a>
            }
            @if (isPersonnel) {
              <a routerLink="/personnel/assiduite" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📋 Registre d'Assiduité</h3>
                <p class="text-xs text-slate-500 mt-1">Suivi des états de présence et assiduité</p>
              </a>
              <a routerLink="/admin-etab/sessions-admission" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📬 Enrôlement & Candidatures</h3>
                <p class="text-xs text-slate-500 mt-1">Saisie des nouveaux apprenants</p>
              </a>
              <a routerLink="/seances" class="card block no-underline cursor-pointer hover:border-[#1C75BC] transition">
                <h3 class="font-bold text-[#1C75BC]">📅 Planning des Séances</h3>
                <p class="text-xs text-slate-500 mt-1">Consulter l'emploi du temps</p>
              </a>
            }
          </div>
        </div>
      </div>
    </app-main-layout>
  `,
})
export class DashboardComponent implements OnInit {
  kpiGlobal: KpiGlobal | null = null;
  kpiEtab: KpiEtablissement | null = null;

  constructor(
    private authService: AuthService,
    private analytics: AnalyticsService,
    private router: Router,
  ) {}

  get user() { return this.authService.currentUser; }
  get isAdminCentre() { return this.user?.role === 'ADMIN_CENTRE'; }
  get isAdminEtab() { return this.user?.role === 'ADMIN_ETABLISSEMENT'; }
  get isFormateur() { return this.user?.role === 'FORMATEUR'; }
  get isPersonnel() { return this.user?.role === 'PERSONNEL_ADMINISTRATIF'; }
  get canViewEtablissementKpi() { return this.isAdminEtab || this.isPersonnel; }

  get badgeClass(): string {
    const map: Record<string, string> = {
      ADMIN_CENTRE: 'badge badge-admin-centre',
      ADMIN_ETABLISSEMENT: 'badge badge-admin-etab',
      FORMATEUR: 'badge badge-formateur',
      PERSONNEL_ADMINISTRATIF: 'badge badge-personnel-admin',
      APPRENANT: 'badge badge-apprenant',
    };
    return map[this.user?.role ?? ''] || 'badge';
  }

  ngOnInit() {
    // Redirection immédiate si c'est un APPRENANT : l'apprenant a un espace unique dédié
    if (this.authService.currentUser?.role === 'APPRENANT') {
      this.router.navigate(['/apprenant/dashboard']);
      return;
    }

    if (this.isAdminCentre) {
      this.analytics.getGlobal().subscribe({ next: (k) => this.kpiGlobal = k });
    }
    if (this.user?.etablissementId && this.canViewEtablissementKpi) {
      this.analytics.getEtablissement(this.user.etablissementId).subscribe({ next: (k) => this.kpiEtab = k });
    }
  }
}
