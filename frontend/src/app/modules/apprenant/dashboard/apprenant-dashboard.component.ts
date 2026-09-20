import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApprenantService, ApprenantDashboard } from '../../../core/services/apprenant.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-apprenant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-8 animate-fade-in pb-12">
      <!-- HERO BANNER INSTITUTIONNEL (Charte Graphique Officielle) -->
      <div class="bg-[#124F80] text-white p-6 md:p-8 relative overflow-hidden shadow-md border-b-4 border-[#F0791E] rounded-xs">
        <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xs bg-white/10 border border-white/20 text-[#F0791E] text-xs font-bold uppercase tracking-wider">
              <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              <span>Portail d'Apprentissage Certifié · EUP</span>
            </div>
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white font-heading">
              Bonjour, {{ user?.prenom }} {{ user?.nom }}
            </h1>
            <div class="barre"></div>
            <p class="text-xs md:text-sm text-[#E7F1FA] max-w-2xl leading-relaxed mt-2 font-normal">
              Bienvenue sur votre espace officiel de formation Vitalis Center. Suivez vos modules, passez vos quiz d'évaluation et préparez l'obtention de votre certification officielle.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
            <a
              routerLink="/apprenant/formations"
              class="w-full sm:w-auto px-5 py-2.5 bg-[#F0791E] hover:bg-[#d96612] text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-2 shadow-xs rounded-xs cursor-pointer"
            >
              <span>Continuer mes cours</span>
              <span>→</span>
            </a>
            <a
              routerLink="/apprenant/certificats"
              class="w-full sm:w-auto px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 text-xs font-semibold transition-all text-center flex items-center justify-center gap-2 rounded-xs cursor-pointer"
            >
              <span>Mes Certificats</span>
            </a>
          </div>
        </div>
      </div>

      <!-- KPI METRICS (5 CARDS) ADAPTIVES MOBILE / TABLETTE / DESKTOP -->
      @if (dashboard) {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
          <!-- KPI 1: Formations actives -->
          <a
            routerLink="/apprenant/formations"
            class="p-3.5 sm:p-5 bg-white border border-[#D7DBDE] hover:border-[#1C75BC] hover:bg-[#F5F6F7] rounded-xs shadow-xs flex flex-col justify-between transition-all group cursor-pointer"
          >
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xs bg-[#E7F1FA] text-[#1C75BC] flex items-center justify-center mb-2.5 sm:mb-3 border border-[#1C75BC]/20 group-hover:scale-105 transition-transform">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p class="text-xl sm:text-2xl font-bold text-[#1B1D1F] font-mono leading-none">{{ dashboard.nbFormations }}</p>
              <p class="text-[11px] sm:text-xs font-semibold text-[#4B5157] mt-1 truncate group-hover:text-[#1C75BC] transition-colors">Formations actives →</p>
            </div>
          </a>

          <!-- KPI 2: Complétion moyenne -->
          <a
            routerLink="/apprenant/formations"
            class="p-3.5 sm:p-5 bg-white border border-[#D7DBDE] hover:border-[#276B44] hover:bg-[#F5F6F7] rounded-xs shadow-xs flex flex-col justify-between transition-all group cursor-pointer"
          >
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xs bg-[#E7F1EA] text-[#276B44] flex items-center justify-center mb-2.5 sm:mb-3 border border-[#276B44]/20 group-hover:scale-105 transition-transform">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p class="text-xl sm:text-2xl font-bold text-[#276B44] font-mono leading-none">{{ dashboard.completionGlobale }}%</p>
              <p class="text-[11px] sm:text-xs font-semibold text-[#4B5157] mt-1 truncate group-hover:text-[#276B44] transition-colors">Complétion moyenne →</p>
            </div>
          </a>

          <!-- KPI 3: Devoirs déposés -->
          <a
            routerLink="/apprenant/evaluations/depot-devoir"
            [queryParams]="{ tab: 'devoirs' }"
            class="p-3.5 sm:p-5 bg-white border border-[#D7DBDE] hover:border-[#F0791E] hover:bg-[#F5F6F7] rounded-xs shadow-xs flex flex-col justify-between transition-all group cursor-pointer"
          >
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xs bg-[#FDECDD] text-[#F0791E] flex items-center justify-center mb-2.5 sm:mb-3 border border-[#F0791E]/20 group-hover:scale-105 transition-transform">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p class="text-xl sm:text-2xl font-bold text-[#1B1D1F] font-mono leading-none">{{ dashboard.nbDevoirsDeposes }}</p>
              <p class="text-[11px] sm:text-xs font-semibold text-[#4B5157] mt-1 truncate group-hover:text-[#F0791E] transition-colors">Mes Devoirs →</p>
            </div>
          </a>

          <!-- KPI 4: Quiz passés -->
          <a
            routerLink="/apprenant/evaluations/depot-devoir"
            [queryParams]="{ tab: 'quiz' }"
            class="p-3.5 sm:p-5 bg-white border border-[#D7DBDE] hover:border-[#1C75BC] hover:bg-[#F5F6F7] rounded-xs shadow-xs flex flex-col justify-between transition-all group cursor-pointer"
          >
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xs bg-[#E7F1FA] text-[#1C75BC] flex items-center justify-center mb-2.5 sm:mb-3 border border-[#1C75BC]/20 group-hover:scale-105 transition-transform">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-xl sm:text-2xl font-bold text-[#1B1D1F] font-mono leading-none">{{ dashboard.nbQuizPasses }}</p>
              <p class="text-[11px] sm:text-xs font-semibold text-[#4B5157] mt-1 truncate group-hover:text-[#1C75BC] transition-colors">Mes Quiz →</p>
            </div>
          </a>

          <!-- KPI 5: Certificats obtenus -->
          <a
            routerLink="/apprenant/certificats"
            class="p-3.5 sm:p-5 bg-white border border-[#D7DBDE] hover:border-[#F0791E] hover:bg-[#F5F6F7] rounded-xs shadow-xs col-span-2 sm:col-span-1 flex flex-col justify-between transition-all group cursor-pointer"
          >
            <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xs bg-[#FDECDD] text-[#F0791E] flex items-center justify-center mb-2.5 sm:mb-3 border border-[#F0791E]/20 group-hover:scale-105 transition-transform">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p class="text-xl sm:text-2xl font-bold text-[#F0791E] font-mono leading-none">{{ dashboard.nbCertificats }}</p>
              <p class="text-[11px] sm:text-xs font-semibold text-[#4B5157] mt-1 truncate group-hover:text-[#F0791E] transition-colors">Certificats →</p>
            </div>
          </a>
        </div>
      }

      <!-- MAIN CONTENT: FORMATIONS & ECHEANCES -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- LEFT: FORMATIONS AFFECTÉES (2 cols) -->
        <div class="lg:col-span-2 space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-[#1B1D1F] font-heading">
                Mes Formations Affectées
              </h2>
              <div class="barre"></div>
            </div>
            <a routerLink="/apprenant/formations" class="text-xs font-semibold text-[#1C75BC] hover:underline flex items-center gap-1">
              <span>Voir tout</span>
              <span>→</span>
            </a>
          </div>

          @if (loading) {
            <div class="p-12 text-center text-[#4B5157] bg-white border border-[#D7DBDE] rounded-xs">
              <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p class="text-xs font-semibold text-[#4B5157]">Chargement de vos formations affectées...</p>
            </div>
          } @else if (!dashboard || dashboard.formationsActives.length === 0) {
            <div class="p-10 text-center bg-white border border-[#D7DBDE] text-[#4B5157] rounded-xs space-y-3">
              <svg class="w-12 h-12 text-[#9AA1A8] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 class="text-sm font-bold text-[#1B1D1F]">Aucune formation active</h3>
              <p class="text-xs text-[#4B5157] max-w-md mx-auto">
                Vos formations actives apparaîtront ici après confirmation de votre inscription.
              </p>
            </div>
          } @else {
            <div class="space-y-4">
              @for (form of dashboard.formationsActives; track form.id) {
                <div class="p-5 bg-white border border-[#D7DBDE] hover:border-[#1C75BC] transition-all rounded-xs shadow-2xs">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="space-y-1.5 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-sm font-bold text-[#1B1D1F]">{{ form.titre }}</h3>
                        @if (form.certifie) {
                          <span class="px-2.5 py-0.5 rounded-xs bg-[#E7F1EA] text-[#276B44] border border-[#276B44] text-[10px] font-bold">
                            ✓ Certifié
                          </span>
                        }
                      </div>
                      <p class="text-xs text-[#4B5157] line-clamp-1">{{ form.description || 'Formation professionnelle certifiante' }}</p>
                      <div class="flex items-center gap-4 text-[11px] text-[#4B5157] pt-1">
                        <span class="flex items-center gap-1.5">
                          <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <strong>{{ form.nbModules }}</strong> modules
                        </span>
                        <span class="flex items-center gap-1.5">
                          <svg class="w-3.5 h-3.5 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <strong>{{ form.coursCompletes }}</strong> / {{ form.totalCours }} cours validés
                        </span>
                      </div>
                    </div>

                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 sm:pt-0 sm:min-w-[150px] shrink-0 border-t sm:border-t-0 border-[#D7DBDE]">
                      <span class="text-xs font-bold font-mono text-left sm:text-right" [class]="form.pourcentage === 100 ? 'text-[#276B44]' : 'text-[#1C75BC]'">
                        {{ form.pourcentage }}% complété
                      </span>
                      <a
                        [routerLink]="['/apprenant/formations', form.id]"
                        class="w-full sm:w-auto px-4 py-2 bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold transition-all rounded-xs shadow-xs text-center flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Consulter le cours</span>
                        <span>→</span>
                      </a>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="w-full bg-[#E7F1FA] h-1.5 mt-4 overflow-hidden">
                    <div
                      class="h-1.5 transition-all duration-500"
                      [class]="form.pourcentage === 100 ? 'bg-[#276B44]' : 'bg-[#1C75BC]'"
                      [style.width.%]="form.pourcentage"
                    ></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- RIGHT: PROCHAINE ÉCHÉANCE & RÈGLE BR-03 -->
        <div class="space-y-6">
          <!-- PROCHAINE ÉCHÉANCE -->
          <div class="p-6 bg-white border border-[#D7DBDE] rounded-xs space-y-4 shadow-xs">
            <div>
              <h2 class="text-sm font-bold text-[#1B1D1F] font-heading">
                Prochaine Échéance
              </h2>
              <div class="barre"></div>
            </div>

            @if (dashboard?.prochaineEcheance; as ech) {
              <div class="p-4 bg-[#E7F1FA] border-l-4 border-[#1C75BC] space-y-2 rounded-xs">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase" [class]="ech.type === 'devoir' ? 'bg-[#FDECDD] text-[#F0791E] border border-[#F0791E]' : ech.type === 'quiz' ? 'bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]' : 'bg-[#E7F1EA] text-[#276B44] border border-[#276B44]'">
                    {{ ech.type === 'devoir' ? 'Devoir à rendre' : ech.type === 'quiz' ? 'Quiz à passer' : 'Séance programmée' }}
                  </span>
                  <span class="text-[11px] font-semibold text-[#4B5157] font-mono">
                    {{ ech.dateLimite | date:'dd MMM yyyy à HH:mm' }}
                  </span>
                </div>
                <h3 class="text-xs font-bold text-[#1B1D1F]">{{ ech.titre }}</h3>
                <p class="text-[11px] text-[#4B5157]">{{ ech.formationTitre }}</p>
                <div class="pt-2">
                  <a
                    [routerLink]="ech.type === 'seance' ? '/apprenant/seances' : ech.type === 'quiz' ? '/apprenant/evaluations/depot-devoir' : '/apprenant/evaluations/depot-devoir'"
                    [queryParams]="ech.type === 'quiz' ? { tab: 'quiz' } : null"
                    class="inline-block text-xs font-bold text-[#1C75BC] hover:underline"
                  >
                    {{ ech.type === 'seance' ? 'Consulter le planning →' : ech.type === 'quiz' ? 'Passer le quiz en ligne →' : 'Accéder à l\'épreuve →' }}
                  </a>
                </div>
              </div>
            } @else {
              <div class="p-6 text-center text-[#4B5157] bg-[#F5F6F7] rounded-xs space-y-1">
                <svg class="w-8 h-8 text-[#276B44] mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-xs font-semibold text-[#1B1D1F]">Aucune échéance urgente</p>
                <p class="text-[11px] text-[#4B5157]">Vous êtes à jour dans vos cours et devoirs.</p>
              </div>
            }
          </div>

          <!-- RÈGLE BR-03 RAPPEL DE CERTIFICATION -->
          <div class="p-6 bg-white border-l-4 border-[#276B44] border border-[#D7DBDE] rounded-xs space-y-3 shadow-xs">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h3 class="text-xs font-bold text-[#276B44] uppercase tracking-wider">Règle de Certification (BR-03)</h3>
            </div>
            <p class="text-xs text-[#1B1D1F] leading-relaxed">
              Pour débloquer votre <strong>Certificat officiel</strong> infalsifiable :
            </p>
            <ul class="text-xs text-[#4B5157] space-y-1.5 list-disc list-inside">
              <li>Compléter <strong>100%</strong> des cours obligatoires.</li>
              <li>Obtenir une moyenne pondérée $\ge$ <strong>10/20</strong> aux évaluations et quiz.</li>
            </ul>
            <div class="pt-2">
              <a
                routerLink="/apprenant/certificats"
                class="text-xs font-bold text-[#1C75BC] hover:underline flex items-center gap-1"
              >
                <span>Vérifier mon statut d'éligibilité</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ApprenantDashboardComponent implements OnInit, OnDestroy {
  dashboard: ApprenantDashboard | null = null;
  user: any = null;
  loading = true;

  private liveSub?: Subscription;
  private bootstrapSub?: Subscription;

  constructor(
    private apprenantService: ApprenantService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.user = this.auth.currentUser;
    // 1. Rendu instantané depuis le snapshot cache local (0ms !)
    const cached = this.apprenantService.getDashboardSnapshot();
    if (cached) {
      this.dashboard = cached;
      this.loading = false;
    }

    // 2. Synchronisation unifiée avec le flux bootstrap
    this.bootstrapSub = this.apprenantService.bootstrap$.subscribe((data) => {
      if (data?.dashboard) {
        this.dashboard = data.dashboard;
        this.loading = false;
      }
    });

    // 3. Revalidation silencieuse en tâche de fond
    this.loadDashboard(cached === null);

    // 4. Écouter les mises à jour temps réel SSE — recharger silencieusement
    this.liveSub = this.apprenantService.liveUpdates$.subscribe(() => {
      this.loadDashboard(false);
    });
  }

  ngOnDestroy() {
    this.liveSub?.unsubscribe();
    this.bootstrapSub?.unsubscribe();
  }

  loadDashboard(showSpinner = true) {
    if (showSpinner) {
      this.loading = true;
    }
    this.apprenantService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
