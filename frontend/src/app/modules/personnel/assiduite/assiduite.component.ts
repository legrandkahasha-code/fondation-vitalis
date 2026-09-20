import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { SeancesService } from '../../../core/services/seances.service';
import { EtablissementsService } from '../../../core/services/etablissements.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Utilisateur, Etablissement } from '../../../core/models';

interface AssiduiteSyntheseItem {
  apprenant: Utilisateur;
  total: number;
  present: number;
  absent: number;
  taux: number;
}

@Component({
  selector: 'app-assiduite',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="max-w-6xl mx-auto pb-16 font-['Public_Sans',sans-serif] px-4 sm:px-6">

        <!-- En-tête Institutionnel -->
        <div class="mb-8 bg-white border border-[#D7DBDE] p-6 rounded-[2px] shadow-2xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="text-[12px] uppercase font-semibold tracking-[0.06em] text-[#4B5157]">
                Pédagogie & Suivi · Assiduité
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] mt-1 tracking-tight">
                États & Synthèse d'Assiduité des Apprenants
              </h1>
              <div class="w-12 h-1 bg-[#005B94] mt-2 mb-3"></div>
              <p class="text-[14px] text-[#4B5157] max-w-2xl leading-relaxed">
                Suivi consolidé de l'émargement, détection des risques de décrochage et taux de ponctualité par cohorte.
              </p>
            </div>

            <!-- Sélecteur d'établissement si Admin Centre -->
            @if (isAdminCentre && etablissements.length > 0) {
              <div class="shrink-0 min-w-[220px]">
                <label class="block text-xs font-semibold text-[#4B5157] mb-1">Filtrer par antenne :</label>
                <select
                  [(ngModel)]="selectedEtabId"
                  (ngModelChange)="chargerSynthese(selectedEtabId)"
                  class="w-full text-xs p-2 border border-[#D7DBDE] rounded-[2px] bg-white focus:outline-none focus:border-[#005B94]"
                >
                  @for (etab of etablissements; track etab.id) {
                    <option [value]="etab.id">{{ etab.nom }}</option>
                  }
                </select>
              </div>
            }
          </div>
        </div>

        <!-- Indicateurs de Synthèse -->
        @if (!loading) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-[#4B5157] font-semibold uppercase tracking-wider">Apprenants Suivis</span>
              <div class="text-2xl font-bold text-[#1B1D1F] mt-1">{{ assiduiteData.length }}</div>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Taux Moyen de Présence</span>
              <div class="text-2xl font-bold text-emerald-700 mt-1">{{ getTauxMoyen() }}%</div>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-amber-700 font-semibold uppercase tracking-wider">Vigilance Décrochage (< 75%)</span>
              <div class="text-2xl font-bold text-amber-700 mt-1">{{ getApprenantsEnRisque() }}</div>
            </div>
          </div>
        } @else {
          <!-- Skeleton KPIs -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            @for (i of [1,2,3]; track i) {
              <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs animate-pulse">
                <div class="h-3 bg-slate-200 rounded w-1/2 mb-3"></div>
                <div class="h-6 bg-slate-200 rounded w-1/3"></div>
              </div>
            }
          </div>
        }

        <!-- Tableau d'Assiduité -->
        <div class="bg-white border border-[#D7DBDE] rounded-[2px] shadow-2xs overflow-hidden">
          @if (loading) {
            <!-- Skeleton Tableau -->
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-[#D7DBDE] text-[#4B5157] font-semibold uppercase text-[11px] tracking-wider">
                    <th class="py-3 px-4">Apprenant</th>
                    <th class="py-3 px-4">Email</th>
                    <th class="py-3 px-4 text-center">Séances</th>
                    <th class="py-3 px-4 text-center">Présences</th>
                    <th class="py-3 px-4 text-center">Absences</th>
                    <th class="py-3 px-4 text-right">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  @for (i of [1,2,3,4,5,6]; track i) {
                    <tr class="border-b border-gray-50 animate-pulse">
                      <td class="py-3 px-4"><div class="h-3 bg-slate-200 rounded w-28"></div></td>
                      <td class="py-3 px-4"><div class="h-3 bg-slate-100 rounded w-36"></div></td>
                      <td class="py-3 px-4 text-center"><div class="h-3 bg-slate-100 rounded w-8 mx-auto"></div></td>
                      <td class="py-3 px-4 text-center"><div class="h-3 bg-slate-100 rounded w-8 mx-auto"></div></td>
                      <td class="py-3 px-4 text-center"><div class="h-3 bg-slate-100 rounded w-8 mx-auto"></div></td>
                      <td class="py-3 px-4"><div class="h-3 bg-slate-200 rounded w-16 ml-auto"></div></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-[#D7DBDE] text-[#4B5157] font-semibold uppercase text-[11px] tracking-wider">
                    <th class="py-3 px-4">Apprenant</th>
                    <th class="py-3 px-4">Email</th>
                    <th class="py-3 px-4 text-center">Séances Évaluées</th>
                    <th class="py-3 px-4 text-center">Présences</th>
                    <th class="py-3 px-4 text-center">Absences</th>
                    <th class="py-3 px-4 text-right">Taux d'Assiduité</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (item of assiduiteData; track item.apprenant.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <!-- Apprenant -->
                      <td class="py-3 px-4 font-bold text-[#1B1D1F]">
                        {{ item.apprenant.prenom }} {{ item.apprenant.nom }}
                      </td>

                      <!-- Email -->
                      <td class="py-3 px-4 font-mono text-gray-600">
                        {{ item.apprenant.email }}
                      </td>

                      <!-- Total séances -->
                      <td class="py-3 px-4 text-center font-mono text-gray-700">
                        {{ item.total }}
                      </td>

                      <!-- Présent -->
                      <td class="py-3 px-4 text-center font-bold text-emerald-700 font-mono">
                        {{ item.present }}
                      </td>

                      <!-- Absent -->
                      <td class="py-3 px-4 text-center font-bold text-red-600 font-mono">
                        {{ item.absent }}
                      </td>

                      <!-- Taux -->
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <div class="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              class="h-full rounded-full transition-all"
                              [class]="item.taux >= 80 ? 'bg-emerald-500' : (item.taux >= 60 ? 'bg-amber-500' : 'bg-red-500')"
                              [style.width.%]="item.taux"
                            ></div>
                          </div>
                          <span
                            class="inline-block font-mono font-bold text-xs"
                            [class]="item.taux >= 80 ? 'text-emerald-700' : (item.taux >= 60 ? 'text-amber-700' : 'text-red-600')"
                          >
                            {{ item.taux }}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  }
                  @if (assiduiteData.length === 0) {
                    <tr>
                      <td colspan="6" class="py-8 text-center text-gray-400 italic">
                        Aucune donnée d'assiduité pour cet établissement.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="px-4 py-3 bg-slate-50 border-t border-[#D7DBDE] text-xs text-[#4B5157] flex justify-between items-center">
              <span>Total : {{ assiduiteData.length }} apprenants enregistrés</span>
            </div>
          }
        </div>

      </div>
    </app-main-layout>
  `,
})
export class AssiduiteComponent implements OnInit, OnDestroy {
  assiduiteData: AssiduiteSyntheseItem[] = [];
  etablissements: Etablissement[] = [];
  selectedEtabId = '';
  loading = true;
  isAdminCentre = false;

  private sseSub?: Subscription;
  private pollSub?: Subscription;

  constructor(
    private auth: AuthService,
    private seancesService: SeancesService,
    private etablissementsService: EtablissementsService,
    private notifications: NotificationsService,
  ) {}

  ngOnInit() {
    const user = this.auth.currentUser;
    this.isAdminCentre = user?.role === 'ADMIN_CENTRE';
    const initialEtabId = user?.etablissementId;

    if (this.isAdminCentre) {
      if (initialEtabId) {
        this.selectedEtabId = initialEtabId;
        this.chargerSynthese(initialEtabId);
      }
      this.etablissementsService.getAll().subscribe({
        next: (etabs) => {
          this.etablissements = etabs;
          if (!this.selectedEtabId && etabs.length > 0) {
            this.selectedEtabId = etabs[0].id;
            this.chargerSynthese(this.selectedEtabId);
          }
        },
        error: () => {
          if (!this.selectedEtabId) this.loading = false;
        },
      });
    } else if (initialEtabId) {
      this.selectedEtabId = initialEtabId;
      this.chargerSynthese(initialEtabId);
    } else {
      this.loading = false;
    }

    // ─── Flux Temps Réel SSE : Réception immédiate dès qu'un émargement est validé ───
    this.sseSub = this.notifications.messages().subscribe((msg) => {
      if (msg.type === 'ASSIDUITE_UPDATE' || msg.type === 'SEANCE_UPDATE') {
        const msgEtabId = msg.recipientEtablissementId || msg.data?.['etablissementId'];
        if (!msgEtabId || msgEtabId === this.selectedEtabId || this.isAdminCentre) {
          this.seancesService.invalidateAssiduiteCache();
          if (this.selectedEtabId) {
            this.chargerSynthese(this.selectedEtabId, true);
          }
        }
      }
    });

    this.startPolling();
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  /** Filet de sécurité périodique (60s) en cas de coupure SSE transitoire */
  private startPolling() {
    this.pollSub = timer(60_000, 60_000).pipe(
      switchMap(() => {
        if (!this.selectedEtabId) return of([]);
        return this.seancesService.getAssiduiteSynthese(this.selectedEtabId, true);
      })
    ).subscribe({
      next: (data) => {
        if (data) this.assiduiteData = data;
      },
    });
  }

  chargerSynthese(etablissementId: string, forceRefresh = false) {
    if (!etablissementId) return;
    this.loading = true;
    this.seancesService.getAssiduiteSynthese(etablissementId, forceRefresh).subscribe({
      next: (data) => {
        this.assiduiteData = data;
        this.loading = false;
      },
      error: () => {
        this.assiduiteData = [];
        this.loading = false;
      },
    });
  }

  getTauxMoyen(): number {
    if (this.assiduiteData.length === 0) return 100;
    const total = this.assiduiteData.reduce((acc, curr) => acc + curr.taux, 0);
    return Math.round(total / this.assiduiteData.length);
  }

  getApprenantsEnRisque(): number {
    return this.assiduiteData.filter((i) => i.taux < 75).length;
  }
}
