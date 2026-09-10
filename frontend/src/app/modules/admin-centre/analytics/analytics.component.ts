import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { NotificationsService, NotificationPayload } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { KpiGlobal } from '../../../core/models';

interface EtablissementDetail {
  id: string;
  nom: string;
  codeAntenne: string | null;
  pays: string;
  statut: string;
  apprenants: number;
  formateurs: number;
  formations: number;
  certificats: number;
  totalUtilisateurs: number;
}

interface TopFormation {
  id: string;
  titre: string;
  etablissement: string;
  modules: number;
  certificats: number;
}

interface DetailedAnalyticsData {
  kpi: KpiGlobal;
  etablissements: EtablissementDetail[];
  admissionParStatut: Record<string, number>;
  tendancesMensuelles: Record<string, number>;
  topFormations: TopFormation[];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="max-w-7xl mx-auto pb-16 font-['Public_Sans',sans-serif] px-4 sm:px-6">

        <!-- En-tête Institutionnel Cockpit -->
        <div class="mb-8 bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-2xs">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[12px] uppercase font-semibold tracking-[0.06em] text-[#4B5157]">
                  02 · Administration Centrale · Cockpit National Analytics
                </span>
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xs font-medium bg-[#E7F1EA] text-[#276B44] border border-[#276B44]/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#276B44] animate-pulse"></span>
                  Temps Réel SSE Actif
                </span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] mt-1 tracking-tight">
                Cockpit National d'Observation & Pilotage
              </h1>
              <div class="barre"></div>
              <p class="text-[14px] text-[#4B5157] max-w-3xl leading-relaxed mt-3">
                Supervision consolidée des établissements satellites, indicateurs d'admission en temps réel, volumétrie des certifications et dynamiques pédagogiques.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                (click)="exporterCsv()"
                [disabled]="exporting || loading"
                class="btn btn-secondary text-xs py-2.5 px-4 font-semibold inline-flex items-center gap-2 shadow-2xs"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                <span>{{ exporting ? 'Génération...' : 'Exporter CSV National' }}</span>
              </button>
              <button
                type="button"
                (click)="chargerDonnees(false)"
                [disabled]="loading || refreshing"
                class="btn btn-ghost text-xs py-2.5 px-3.5 inline-flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" [class.animate-spin]="loading || refreshing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>

        @if (loading && !data) {
          <div class="p-12 text-center bg-white border border-[#D7DBDE] rounded-xs">
            <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin"></div>
            <p class="mt-4 text-sm text-[#4B5157]">Agrégation des indicateurs nationaux en cours...</p>
          </div>
        } @else if (data) {

          <!-- 6 KPI CARDS -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <!-- Établissements -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-xs shadow-2xs hover:border-[#1C75BC] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Établissements</span>
                <span class="text-[#1C75BC] bg-[#E7F1FA] p-1.5 rounded-xs">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </span>
              </div>
              <div class="text-3xl font-extrabold text-[#1B1D1F] tracking-tight">{{ data.kpi.etablissements }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1 font-medium">Antennes & campus</div>
            </div>

            <!-- Apprenants -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-xs shadow-2xs hover:border-[#1C75BC] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Apprenants</span>
                <span class="text-[#1C75BC] bg-[#E7F1FA] p-1.5 rounded-xs">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                </span>
              </div>
              <div class="text-3xl font-extrabold text-[#1C75BC] tracking-tight">{{ data.kpi.apprenants }}</div>
              <div class="text-[11px] text-[#276B44] mt-1 font-medium">Inscrits actifs</div>
            </div>

            <!-- Formateurs -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-xs shadow-2xs hover:border-[#1C75BC] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Formateurs</span>
                <span class="text-[#F0791E] bg-[#FDECDD] p-1.5 rounded-xs">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              </div>
              <div class="text-3xl font-extrabold text-[#1B1D1F] tracking-tight">{{ data.kpi.formateurs }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1 font-medium">Corps enseignant</div>
            </div>

            <!-- Formations -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-xs shadow-2xs hover:border-[#1C75BC] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Programmes</span>
                <span class="text-[#124F80] bg-[#E7F1FA] p-1.5 rounded-xs">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </span>
              </div>
              <div class="text-3xl font-extrabold text-[#1B1D1F] tracking-tight">{{ data.kpi.formations }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1 font-medium">Formations actives</div>
            </div>

            <!-- Certificats -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-xs shadow-2xs hover:border-[#1C75BC] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Certificats</span>
                <span class="text-[#276B44] bg-[#E7F1EA] p-1.5 rounded-xs">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </span>
              </div>
              <div class="text-3xl font-extrabold text-[#276B44] tracking-tight">{{ data.kpi.certificatsEmis }}</div>
              <div class="text-[11px] text-[#276B44] mt-1 font-medium">Titres délivrés</div>
            </div>

            <!-- Séances -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-xs shadow-2xs hover:border-[#1C75BC] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Séances</span>
                <span class="text-[#124F80] bg-[#E7F1FA] p-1.5 rounded-xs">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
              <div class="text-3xl font-extrabold text-[#1B1D1F] tracking-tight">{{ data.kpi.seancesPlanifiees }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1 font-medium">Créneaux planifiés</div>
            </div>
          </div>

          <!-- GRAPHIQUES & REPARTITIONS -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            <!-- Répartition par antenne (Barres 2 col) -->
            <div class="lg:col-span-2 bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-2xs">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-base font-bold text-[#1B1D1F]">Répartition des Effectifs par Établissement</h2>
                  <p class="text-xs text-[#4B5157]">Apprenants et formateurs répartis dans les différentes antennes du réseau</p>
                </div>
                <span class="text-xs font-semibold text-[#1C75BC] bg-[#E7F1FA] px-2.5 py-1 rounded-xs">
                  {{ data.etablissements.length }} antennes
                </span>
              </div>

              <div class="space-y-4 mt-6">
                @for (etab of data.etablissements; track etab.id) {
                  <div class="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 mb-1.5">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-[#1B1D1F]">{{ etab.nom }}</span>
                        @if (etab.codeAntenne) {
                          <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{{ etab.codeAntenne }}</span>
                        }
                        <span class="text-[10px] text-gray-500">({{ etab.pays }})</span>
                      </div>
                      <div class="flex items-center gap-3 font-semibold flex-wrap">
                        <span class="text-[#1C75BC]">{{ etab.apprenants }} apprenants</span>
                        <span class="text-gray-400">·</span>
                        <span class="text-[#F0791E]">{{ etab.formateurs }} formateurs</span>
                        <span class="text-gray-400">·</span>
                        <span class="text-[#276B44]">{{ etab.certificats }} certifiés</span>
                      </div>
                    </div>

                    <!-- Barre visuelle proportionnelle -->
                    <div class="w-full bg-[#F5F6F7] h-2.5 rounded-full overflow-hidden flex">
                      <div
                        class="bg-[#1C75BC] h-full transition-all duration-500"
                        [style.width.%]="getApprenantPercentage(etab.apprenants)"
                        title="Apprenants: {{ etab.apprenants }}"
                      ></div>
                      <div
                        class="bg-[#F0791E] h-full transition-all duration-500"
                        [style.width.%]="getFormateurPercentage(etab.formateurs)"
                        title="Formateurs: {{ etab.formateurs }}"
                      ></div>
                    </div>
                  </div>
                }
                @if (data.etablissements.length === 0) {
                  <p class="text-xs text-[#4B5157] italic text-center py-6">Aucun établissement enregistré</p>
                }
              </div>

              <!-- Légende -->
              <div class="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100 text-xs text-[#4B5157]">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-[#1C75BC]"></span>
                  <span>Apprenants</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-[#F0791E]"></span>
                  <span>Formateurs</span>
                </div>
              </div>
            </div>

            <!-- Entonnoir Admissions & Statuts -->
            <div class="bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-2xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h2 class="text-base font-bold text-[#1B1D1F]">Pipeline Admissions</h2>
                    <p class="text-xs text-[#4B5157]">Candidatures par statut dans le réseau</p>
                  </div>
                  <span class="text-xs font-semibold text-[#276B44] bg-[#E7F1EA] px-2 py-0.5 rounded-xs">
                    {{ getTotalCandidatures() }} total
                  </span>
                </div>

                <div class="space-y-3 mt-4">
                  @for (statut of getAdmissionStatuts(); track statut.key) {
                    <div class="p-3 rounded-xs border border-gray-100 hover:bg-[#F5F6F7] transition-colors">
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="font-semibold text-[#1B1D1F] flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full" [style.backgroundColor]="statut.color"></span>
                          {{ statut.label }}
                        </span>
                        <span class="font-bold text-[#1B1D1F]">{{ statut.count }}</span>
                      </div>
                      <div class="w-full bg-[#F5F6F7] h-1.5 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          [style.backgroundColor]="statut.color"
                          [style.width.%]="getCandidaturePercentage(statut.count)"
                        ></div>
                      </div>
                    </div>
                  }
                  @if (getAdmissionStatuts().length === 0) {
                    <p class="text-xs text-[#4B5157] italic text-center py-6">Aucune candidature enregistrée</p>
                  }
                </div>
              </div>

              <div class="mt-6 pt-4 border-t border-gray-100 text-xs text-[#4B5157] flex justify-between items-center">
                <span>Taux de conversion :</span>
                <span class="font-bold text-[#276B44]">{{ getTauxConversion() }}%</span>
              </div>
            </div>

          </div>

          <!-- TENDANCES MENSUELLES & TOP FORMATIONS -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Tendances mensuelles -->
            <div class="bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-2xs">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-base font-bold text-[#1B1D1F]">Dynamique des Inscriptions (12 derniers mois)</h2>
                  <p class="text-xs text-[#4B5157]">Évolution mensuelle des nouveaux apprenants inscrits</p>
                </div>
              </div>

              <!-- Bar chart SVG responsive -->
              <div class="mt-6">
                @if (getMoisTendances().length > 0) {
                  <div class="flex items-end gap-2 h-44 pt-6 border-b border-gray-200 overflow-x-auto">
                    @for (item of getMoisTendances(); track item.mois) {
                      <div class="flex-1 min-w-[28px] flex flex-col items-center gap-1 h-full justify-end group">
                        <span class="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                          {{ item.count }}
                        </span>
                        <div
                          class="w-full bg-[#1C75BC] rounded-t-xs hover:bg-[#124F80] transition-all"
                          [style.height.%]="getMoisBarHeight(item.count)"
                        ></div>
                        <span class="text-[10px] text-gray-400 font-mono mt-1 transform -rotate-45 origin-top-left truncate">
                          {{ item.mois }}
                        </span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-xs text-[#4B5157] italic text-center py-12">Données de tendances non disponibles</p>
                }
              </div>
            </div>

            <!-- Top Formations -->
            <div class="bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-2xs">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-base font-bold text-[#1B1D1F]">Top 10 Formations Certifiantes</h2>
                  <p class="text-xs text-[#4B5157]">Programmes délivrant le plus de titres certifiés</p>
                </div>
              </div>

              <div class="overflow-x-auto mt-2">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-gray-200 text-[#4B5157] font-semibold uppercase text-[10px] tracking-wider">
                      <th class="py-2.5 px-2">#</th>
                      <th class="py-2.5 px-2">Formation</th>
                      <th class="py-2.5 px-2">Antenne</th>
                      <th class="py-2.5 px-2 text-right">Modules</th>
                      <th class="py-2.5 px-2 text-right">Certificats</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    @for (f of data.topFormations; track f.id; let idx = $index) {
                      <tr class="hover:bg-[#F5F6F7] transition-colors">
                        <td class="py-2.5 px-2 font-bold text-[#1C75BC]">{{ idx + 1 }}</td>
                        <td class="py-2.5 px-2 font-medium text-[#1B1D1F] max-w-[180px] truncate" [title]="f.titre">{{ f.titre }}</td>
                        <td class="py-2.5 px-2 text-gray-500">{{ f.etablissement }}</td>
                        <td class="py-2.5 px-2 text-right font-mono text-gray-600">{{ f.modules }}</td>
                        <td class="py-2.5 px-2 text-right font-bold text-[#276B44] font-mono">{{ f.certificats }}</td>
                      </tr>
                    }
                    @if (data.topFormations.length === 0) {
                      <tr>
                <td colspan="5" class="py-6 text-center text-gray-400 italic">Aucune formation répertoriée</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        }
      </div>
    </app-main-layout>
  `,
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  data: DetailedAnalyticsData | null = null;
  loading = false;
  refreshing = false;
  exporting = false;
  private sseSub?: Subscription;
  private streamSub?: Subscription;

  constructor(
    private analytics: AnalyticsService,
    private notifications: NotificationsService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    const cached = this.analytics.getCached();
    if (cached) {
      this.data = cached;
      this.loading = false;
    } else {
      this.loading = true;
    }

    // Réception réactive continue (0ms)
    this.streamSub = this.analytics.globalDetailed$.subscribe((d) => {
      if (d) {
        this.data = d;
        this.loading = false;
        this.refreshing = false;
      }
    });

    this.chargerDonnees(!cached);
    this.ecouterSSE();
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
    this.streamSub?.unsubscribe();
  }

  chargerDonnees(showSpinner = false) {
    if (showSpinner && !this.data) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }

    this.analytics.getGlobalDetailed(true).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.refreshing = false;
      },
      error: () => {
        // Fallback sur getGlobal si getGlobalDetailed échoue
        this.analytics.getGlobal().subscribe({
          next: (k) => {
            this.data = {
              kpi: k,
              etablissements: [],
              admissionParStatut: {},
              tendancesMensuelles: {},
              topFormations: [],
            };
            this.loading = false;
            this.refreshing = false;
          },
          error: () => {
            if (!this.data) {
              this.toast.error('Impossible de charger les indicateurs analytics.');
            }
            this.loading = false;
            this.refreshing = false;
          },
        });
      },
    });
  }

  ecouterSSE() {
    const businessEvents = new Set([
      'ADMISSION_NEW_CANDIDATURE',
      'ADMISSION_CONFIRMED',
      'ADMISSION_INSCRIBED',
      'ADMISSION_STATUS_CHANGE',
      'CERTIFICAT_EMIS',
      'ETABLISSEMENT_UPDATE',
    ]);

    this.sseSub = this.notifications
      .messages()
      .pipe(
        filter((payload: NotificationPayload) => businessEvents.has(payload.type)),
        debounceTime(800),
      )
      .subscribe({
        next: () => {
          // Recharger discrètement en arrière-plan sans bloquer l'interface
          this.chargerDonnees(false);
        },
      });
  }

  exporterCsv() {
    this.exporting = true;
    this.analytics.exportGlobalCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vitalis_kpi_national_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exporting = false;
        this.toast.success('Rapport CSV national exporté avec succès');
      },
      error: () => {
        this.toast.error("Échec de l'exportation CSV");
        this.exporting = false;
      },
    });
  }

  // Helpers pour les calculs de graphiques
  getMaxApprenants(): number {
    if (!this.data?.etablissements?.length) return 1;
    return Math.max(...this.data.etablissements.map((e) => e.apprenants + e.formateurs), 1);
  }

  getApprenantPercentage(count: number): number {
    const max = this.getMaxApprenants();
    return Math.round((count / max) * 100);
  }

  getFormateurPercentage(count: number): number {
    const max = this.getMaxApprenants();
    return Math.round((count / max) * 100);
  }

  getTotalCandidatures(): number {
    if (!this.data?.admissionParStatut) return 0;
    return Object.values(this.data.admissionParStatut).reduce((a, b) => a + b, 0);
  }

  getAdmissionStatuts(): { key: string; label: string; count: number; color: string }[] {
    if (!this.data?.admissionParStatut) return [];
    const labelsMap: Record<string, { label: string; color: string }> = {
      BROUILLON: { label: 'Brouillon', color: '#9AA1A8' },
      SOUMISE: { label: 'Soumise', color: '#4B5157' },
      EN_EVALUATION: { label: 'En évaluation', color: '#1C75BC' },
      EN_REVUE: { label: 'En revue', color: '#1C75BC' },
      ENTRETIEN: { label: 'Entretien', color: '#124F80' },
      ADMISE: { label: 'Admise', color: '#276B44' },
      ACCEPTEE: { label: 'Acceptée', color: '#276B44' },
      CONFIRMEE: { label: 'Confirmée', color: '#276B44' },
      INSCRITE: { label: 'Inscrite', color: '#276B44' },
      LISTE_ATTENTE: { label: "Liste d'attente", color: '#F0791E' },
      REJETEE: { label: 'Rejetée', color: '#ED1C24' },
      RETIREE: { label: 'Retirée', color: '#9AA1A8' },
      EXPIREE: { label: 'Expirée', color: '#4B5157' },
    };

    return Object.entries(this.data.admissionParStatut).map(([key, count]) => ({
      key,
      label: labelsMap[key]?.label || key,
      count,
      color: labelsMap[key]?.color || '#94A3B8',
    }));
  }

  getCandidaturePercentage(count: number): number {
    const total = this.getTotalCandidatures();
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  getTauxConversion(): number {
    const total = this.getTotalCandidatures();
    if (!total) return 0;
    const inscrites =
      (this.data?.admissionParStatut['INSCRITE'] || 0) +
      (this.data?.admissionParStatut['CONFIRMEE'] || 0) +
      (this.data?.admissionParStatut['ADMISE'] || 0) +
      (this.data?.admissionParStatut['ACCEPTEE'] || 0);
    return Math.round((inscrites / total) * 100);
  }

  getMoisTendances(): { mois: string; count: number }[] {
    if (!this.data?.tendancesMensuelles) return [];
    return Object.entries(this.data.tendancesMensuelles)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([mois, count]) => ({ mois, count }));
  }

  getMoisBarHeight(count: number): number {
    const items = this.getMoisTendances();
    const max = Math.max(...items.map((i) => i.count), 1);
    return Math.max(8, Math.round((count / max) * 100));
  }
}
