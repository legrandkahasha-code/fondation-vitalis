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
        <div class="mb-8 bg-white border border-[#D7DBDE] p-6 rounded-[2px] shadow-2xs">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[12px] uppercase font-semibold tracking-[0.06em] text-[#4B5157]">
                  02 · Administration Centrale · Cockpit National Analytics
                </span>
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Temps Réel SSE Actif
                </span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] mt-1 tracking-tight">
                Cockpit National d'Observation & Pilotage
              </h1>
              <div class="w-12 h-1 bg-[#005B94] mt-2 mb-3"></div>
              <p class="text-[14px] text-[#4B5157] max-w-3xl leading-relaxed">
                Supervision consolidée des établissements satellites, indicateurs d'admission en temps réel, volumétrie des certifications et dynamiques pédagogiques.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <button
                type="button"
                (click)="exporterCsv()"
                [disabled]="exporting || loading"
                class="btn btn-secondary text-xs py-2.5 px-4 font-semibold inline-flex items-center gap-2 shadow-2xs"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                {{ exporting ? 'Génération...' : 'Exporter CSV National' }}
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
                Actualiser
              </button>
            </div>
          </div>
        </div>

        @if (loading && !data) {
          <div class="p-12 text-center bg-white border border-[#D7DBDE] rounded-[2px]">
            <div class="inline-block w-8 h-8 border-3 border-[#005B94] border-t-transparent rounded-full animate-spin"></div>
            <p class="mt-4 text-sm text-[#4B5157]">Agrégation des indicateurs nationaux en cours...</p>
          </div>
        } @else if (data) {

          <!-- 6 KPI CARDS -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <!-- Établissements -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-[2px] shadow-2xs hover:border-[#005B94] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Établissements</span>
                <span class="text-[#005B94] bg-blue-50 p-1.5 rounded-[2px]">🏛️</span>
              </div>
              <div class="text-3xl font-extrabold text-[#1B1D1F] tracking-tight">{{ data.kpi.etablissements }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1 font-medium">Antennes & campus</div>
            </div>

            <!-- Apprenants -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-[2px] shadow-2xs hover:border-[#005B94] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Apprenants</span>
                <span class="text-[#005B94] bg-blue-50 p-1.5 rounded-[2px]">👨‍🎓</span>
              </div>
              <div class="text-3xl font-extrabold text-[#005B94] tracking-tight">{{ data.kpi.apprenants }}</div>
              <div class="text-[11px] text-emerald-600 mt-1 font-medium">Inscrits actifs</div>
            </div>

            <!-- Formateurs -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-[2px] shadow-2xs hover:border-[#005B94] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Formateurs</span>
                <span class="text-amber-700 bg-amber-50 p-1.5 rounded-[2px]">🧑‍🏫</span>
              </div>
              <div class="text-3xl font-extrabold text-[#1B1D1F] tracking-tight">{{ data.kpi.formateurs }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1 font-medium">Corps enseignant</div>
            </div>

            <!-- Formations -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-[2px] shadow-2xs hover:border-[#005B94] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Programmes</span>
                <span class="text-purple-700 bg-purple-50 p-1.5 rounded-[2px]">📚</span>
              </div>
              <div class="text-3xl font-extrabold text-[#1B1D1F] tracking-tight">{{ data.kpi.formations }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1 font-medium">Formations actives</div>
            </div>

            <!-- Certificats -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-[2px] shadow-2xs hover:border-[#005B94] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Certificats</span>
                <span class="text-emerald-700 bg-emerald-50 p-1.5 rounded-[2px]">🎓</span>
              </div>
              <div class="text-3xl font-extrabold text-emerald-600 tracking-tight">{{ data.kpi.certificatsEmis }}</div>
              <div class="text-[11px] text-emerald-600 mt-1 font-medium">Titres délivrés</div>
            </div>

            <!-- Séances -->
            <div class="bg-white border border-[#D7DBDE] p-5 rounded-[2px] shadow-2xs hover:border-[#005B94] transition-colors">
              <div class="flex items-center justify-between text-[#4B5157] text-xs font-semibold uppercase tracking-wider mb-2">
                <span>Séances</span>
                <span class="text-indigo-700 bg-indigo-50 p-1.5 rounded-[2px]">📅</span>
              </div>
              <div class="text-3xl font-extrabold text-[#1B1D1F] tracking-tight">{{ data.kpi.seancesPlanifiees }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1 font-medium">Créneaux planifiés</div>
            </div>
          </div>

          <!-- GRAPHIQUES & REPARTITIONS -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            <!-- Répartition par antenne (Barres 2 col) -->
            <div class="lg:col-span-2 bg-white border border-[#D7DBDE] p-6 rounded-[2px] shadow-2xs">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-base font-bold text-[#1B1D1F]">Répartition des Effectifs par Établissement</h2>
                  <p class="text-xs text-[#4B5157]">Apprenants et formateurs répartis dans les différentes antennes du réseau</p>
                </div>
                <span class="text-xs font-semibold text-[#005B94] bg-blue-50 px-2.5 py-1 rounded-[2px]">
                  {{ data.etablissements.length }} antennes
                </span>
              </div>

              <div class="space-y-4 mt-6">
                @for (etab of data.etablissements; track etab.id) {
                  <div class="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    <div class="flex items-center justify-between text-xs mb-1.5">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-[#1B1D1F]">{{ etab.nom }}</span>
                        @if (etab.codeAntenne) {
                          <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{{ etab.codeAntenne }}</span>
                        }
                        <span class="text-[10px] text-gray-500">({{ etab.pays }})</span>
                      </div>
                      <div class="flex items-center gap-3 font-semibold">
                        <span class="text-[#005B94]">{{ etab.apprenants }} apprenants</span>
                        <span class="text-gray-400">·</span>
                        <span class="text-amber-700">{{ etab.formateurs }} formateurs</span>
                        <span class="text-gray-400">·</span>
                        <span class="text-emerald-700">{{ etab.certificats }} certifiés</span>
                      </div>
                    </div>

                    <!-- Barre visuelle proportionnelle -->
                    <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        class="bg-[#005B94] h-full transition-all duration-500"
                        [style.width.%]="getApprenantPercentage(etab.apprenants)"
                        title="Apprenants: {{ etab.apprenants }}"
                      ></div>
                      <div
                        class="bg-amber-500 h-full transition-all duration-500"
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
                  <span class="w-3 h-3 rounded-full bg-[#005B94]"></span>
                  <span>Apprenants</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span>Formateurs</span>
                </div>
              </div>
            </div>

            <!-- Entonnoir Admissions & Statuts -->
            <div class="bg-white border border-[#D7DBDE] p-6 rounded-[2px] shadow-2xs flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h2 class="text-base font-bold text-[#1B1D1F]">Pipeline Admissions</h2>
                    <p class="text-xs text-[#4B5157]">Candidatures par statut dans le réseau</p>
                  </div>
                  <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[2px]">
                    {{ getTotalCandidatures() }} total
                  </span>
                </div>

                <div class="space-y-3 mt-4">
                  @for (statut of getAdmissionStatuts(); track statut.key) {
                    <div class="p-3 rounded-[2px] border border-gray-100 hover:bg-slate-50 transition-colors">
                      <div class="flex items-center justify-between text-xs mb-1">
                        <span class="font-semibold text-[#1B1D1F] flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full" [style.backgroundColor]="statut.color"></span>
                          {{ statut.label }}
                        </span>
                        <span class="font-bold text-[#1B1D1F]">{{ statut.count }}</span>
                      </div>
                      <div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
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
                <span class="font-bold text-emerald-700">{{ getTauxConversion() }}%</span>
              </div>
            </div>

          </div>

          <!-- TENDANCES MENSUELLES & TOP FORMATIONS -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Tendances mensuelles -->
            <div class="bg-white border border-[#D7DBDE] p-6 rounded-[2px] shadow-2xs">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-base font-bold text-[#1B1D1F]">Dynamique des Inscriptions (12 derniers mois)</h2>
                  <p class="text-xs text-[#4B5157]">Évolution mensuelle des nouveaux apprenants inscrits</p>
                </div>
              </div>

              <!-- Bar chart SVG responsive -->
              <div class="mt-6">
                @if (getMoisTendances().length > 0) {
                  <div class="flex items-end gap-2 h-44 pt-6 border-b border-gray-200">
                    @for (item of getMoisTendances(); track item.mois) {
                      <div class="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <span class="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                          {{ item.count }}
                        </span>
                        <div
                          class="w-full bg-[#005B94] rounded-t-sm hover:bg-[#0072B8] transition-all"
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
            <div class="bg-white border border-[#D7DBDE] p-6 rounded-[2px] shadow-2xs">
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
                      <tr class="hover:bg-slate-50 transition-colors">
                        <td class="py-2.5 px-2 font-bold text-[#005B94]">{{ idx + 1 }}</td>
                        <td class="py-2.5 px-2 font-medium text-[#1B1D1F] max-w-[180px] truncate" [title]="f.titre">{{ f.titre }}</td>
                        <td class="py-2.5 px-2 text-gray-500">{{ f.etablissement }}</td>
                        <td class="py-2.5 px-2 text-right font-mono text-gray-600">{{ f.modules }}</td>
                        <td class="py-2.5 px-2 text-right font-bold text-emerald-700 font-mono">{{ f.certificats }}</td>
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
      BROUILLON: { label: 'Brouillon', color: '#94A3B8' },
      SOUMISE: { label: 'Soumise', color: '#64748B' },
      EN_EVALUATION: { label: 'En évaluation', color: '#0284C7' },
      EN_REVUE: { label: 'En revue', color: '#0284C7' },
      ENTRETIEN: { label: 'Entretien', color: '#8B5CF6' },
      ADMISE: { label: 'Admise', color: '#10B981' },
      ACCEPTEE: { label: 'Acceptée', color: '#10B981' },
      CONFIRMEE: { label: 'Confirmée', color: '#059669' },
      INSCRITE: { label: 'Inscrite', color: '#047857' },
      LISTE_ATTENTE: { label: "Liste d'attente", color: '#F59E0B' },
      REJETEE: { label: 'Rejetée', color: '#EF4444' },
      RETIREE: { label: 'Retirée', color: '#94A3B8' },
      EXPIREE: { label: 'Expirée', color: '#64748B' },
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
