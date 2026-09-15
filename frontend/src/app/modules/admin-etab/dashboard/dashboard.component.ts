import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { UtilisateursService } from '../../../core/services/utilisateurs.service';
import { PedagogieService } from '../../../core/services/pedagogie.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { KpiEtablissement, Utilisateur, FiliereSuiviItem, FiliereSuiviDetail } from '../../../core/models';

@Component({
  selector: 'app-admin-etab-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent, RouterLink],
  template: `
    <app-main-layout>
      <div class="p-6 md:p-8 max-w-7xl mx-auto font-['Public_Sans',sans-serif] space-y-8 pb-16">
        
        <!-- En-tête officiel de l'établissement -->
        <div class="bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-xs">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="text-[11px] uppercase font-bold tracking-[0.08em] text-[#1C75BC] flex items-center gap-1.5">
                <span>🏛️</span> Administration Établissement · Direction Locale
              </div>
              <h1 class="text-2xl md:text-3xl font-bold text-[#1B1D1F] mt-1 font-heading">
                Tableau de Bord de l'Établissement
              </h1>
              <div class="barre"></div>
              <p class="text-xs text-[#4B5157] mt-2 max-w-2xl leading-relaxed">
                Supervision des filières de formation attribuées par l'administration centrale, suivi des effectifs d'apprenants, des formateurs et des évaluations.
              </p>
            </div>
            <div class="flex items-center gap-3 shrink-0 flex-wrap">
              <a routerLink="/admin-etab/sessions-admission" class="btn btn-primary text-xs font-semibold py-2.5 px-4 shadow-xs flex items-center gap-1.5">
                <span>🎯</span> Gérer les Admissions
              </a>
              <button (click)="chargerDonnees()" [disabled]="loading" class="btn btn-ghost text-xs py-2 px-3 flex items-center gap-1">
                <span [class.animate-spin]="loading">🔄</span> Actualiser
              </button>
            </div>
          </div>
        </div>

        <!-- KPI SYNTHÉTIQUES DONT L'INDICATEUR DES FILIÈRES ATTRIBUÉES -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <!-- KPI 1 : Filières Attribuées (Spécification Expresse) -->
          <div class="p-4 bg-white border border-[#1C75BC]/40 rounded-xs shadow-xs text-center border-t-4 border-t-[#1C75BC]">
            <p class="text-2xl md:text-3xl font-black text-[#1C75BC] font-mono leading-tight">{{ filieres.length }}</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Filières Attribuées</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">par l'Admin Central</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#124F80]">
            <p class="text-2xl md:text-3xl font-black text-[#124F80] font-mono leading-tight">{{ totalApprenantsInscrits }}</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Apprenants Inscrits</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">dans les filières</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#276B44]">
            <p class="text-2xl md:text-3xl font-black text-[#276B44] font-mono leading-tight">{{ kpi?.tauxAssiduite ?? 0 }}%</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Assiduité Globale</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">présences aux cours</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#F0791E]">
            <p class="text-2xl md:text-3xl font-black text-[#F0791E] font-mono leading-tight">{{ kpi?.tauxCompletion ?? 0 }}%</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Avancement Moyen</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">complétion des cours</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#1C75BC]">
            <p class="text-2xl md:text-3xl font-black text-[#1C75BC] font-mono leading-tight">{{ kpi?.moyenneGenerale ?? 0 }}/20</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Moyenne Générale</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">toutes évaluations</p>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- SECTION CENTRALE : FILIÈRES ATTRIBUÉES À L'ÉTABLISSEMENT ("CLASSES") -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div id="filieres" class="bg-white border border-[#D7DBDE] rounded-xs shadow-xs p-6 space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D7DBDE]">
            <div>
              <h2 class="text-lg font-bold text-[#1B1D1F] flex items-center gap-2">
                <span>📚</span> Filières Attribuées à l'Établissement (Classes)
                <span class="px-2 py-0.5 text-xs bg-[#E7F1FA] text-[#1C75BC] rounded-xs font-mono font-bold">
                  {{ filieresFiltrees.length }}
                </span>
              </h2>
              <p class="text-xs text-[#4B5157] mt-1">
                Suivi du cycle de vie de chaque classe : effectif, formateurs référents, progression et évaluations.
              </p>
            </div>

            <!-- Filtres et recherche -->
            <div class="flex items-center gap-3">
              <input
                type="text"
                [(ngModel)]="filieresSearch"
                placeholder="Rechercher une filière..."
                class="text-xs p-2 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] w-48 sm:w-60"
              />
              <select
                [(ngModel)]="selectedStatut"
                class="text-xs p-2 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
              >
                <option value="ALL">Tous statuts</option>
                <option value="EN_COURS">En cours</option>
                <option value="OUVERTE">Ouverte</option>
                <option value="EN_PREPARATION">En préparation</option>
                <option value="CLOTUREE">Clôturée</option>
              </select>
            </div>
          </div>

          @if (loading) {
            <div class="p-12 text-center text-[#4B5157]">
              <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-2"></div>
              <p class="text-xs">Chargement des filières attribuées...</p>
            </div>
          } @else if (filieresFiltrees.length === 0) {
            <div class="p-8 text-center bg-[#F5F6F7] rounded-xs border border-dashed border-[#D7DBDE]">
              <p class="text-sm font-semibold text-[#1B1D1F]">Aucune filière ne correspond aux critères.</p>
              <p class="text-xs text-[#4B5157] mt-1">Contactez l'administration centrale si une filière doit être raccordée à votre antenne.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-[#F5F6F7] text-[#4B5157] uppercase font-bold border-b border-[#D7DBDE]">
                  <tr>
                    <th class="py-3 px-4">Filière / Classe</th>
                    <th class="py-3 px-4">Statut</th>
                    <th class="py-3 px-4 text-center">Effectif Apprenants</th>
                    <th class="py-3 px-4">Formateur(s) Assigné(s)</th>
                    <th class="py-3 px-4 text-center">Avancement</th>
                    <th class="py-3 px-4 text-center">Évaluations</th>
                    <th class="py-3 px-4 text-center">Certificats</th>
                    <th class="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#D7DBDE]">
                  @for (f of filieresFiltrees; track f.id) {
                    <tr class="hover:bg-[#F9FAFB] transition-colors">
                      <td class="py-3 px-4">
                        <div class="font-bold text-[#1B1D1F] text-sm">{{ f.titre }}</div>
                        <div class="text-[11px] text-[#4B5157] flex items-center gap-2 mt-0.5">
                          @if (f.formationReferentiel?.filiere?.code) {
                            <span class="font-mono font-bold text-[#1C75BC]">{{ f.formationReferentiel?.filiere?.code }}</span>
                            <span>·</span>
                          }
                          <span>{{ f.modulesCount }} modules</span>
                          <span>·</span>
                          <span>{{ f.coursCount }} cours</span>
                        </div>
                      </td>

                      <td class="py-3 px-4">
                        <span [class]="getStatutBadgeClass(f.statut)" class="px-2 py-0.5 rounded-xs font-bold text-[10px] uppercase">
                          {{ f.statut }}
                        </span>
                      </td>

                      <td class="py-3 px-4 text-center">
                        <span class="inline-flex items-center gap-1 font-bold text-sm text-[#124F80]">
                          <span>👥</span> {{ f.effectifApprenants }}
                        </span>
                        <div class="text-[10px] text-[#4B5157]">inscrits</div>
                      </td>

                      <td class="py-3 px-4">
                        @if (f.formateurs && f.formateurs.length > 0) {
                          <div class="space-y-1">
                            @for (formateur of f.formateurs.slice(0, 2); track formateur.id) {
                              <div class="flex items-center gap-1.5 text-[#1B1D1F]">
                                <span class="w-1.5 h-1.5 rounded-full bg-[#1C75BC]"></span>
                                <span class="font-medium">{{ formateur.prenom }} {{ formateur.nom }}</span>
                              </div>
                            }
                            @if (f.formateurs.length > 2) {
                              <span class="text-[10px] text-[#4B5157] italic">+{{ f.formateurs.length - 2 }} autre(s)</span>
                            }
                          </div>
                        } @else {
                          <span class="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-xs">Non assigné</span>
                        }
                      </td>

                      <td class="py-3 px-4 text-center min-w-[120px]">
                        <div class="font-bold text-[#1B1D1F] text-xs font-mono">{{ f.avancementMoyen }}%</div>
                        <div class="w-full bg-[#D7DBDE] h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            class="h-1.5 rounded-full transition-all"
                            [class]="f.avancementMoyen >= 75 ? 'bg-[#276B44]' : 'bg-[#1C75BC]'"
                            [style.width.%]="f.avancementMoyen"
                          ></div>
                        </div>
                      </td>

                      <td class="py-3 px-4 text-center">
                        <div class="font-bold text-[#1B1D1F]">{{ f.evaluationsCount }}</div>
                        <div class="text-[10px] text-[#4B5157]">Moy: {{ f.moyenneGenerale }}/20</div>
                      </td>

                      <td class="py-3 px-4 text-center">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E7F1EA] text-[#276B44] rounded-xs font-bold font-mono">
                          🎓 {{ f.certificatsCount }}
                        </span>
                      </td>

                      <td class="py-3 px-4 text-right">
                        <button
                          type="button"
                          (click)="ouvrirSuiviFiliere(f.id)"
                          class="btn btn-secondary text-xs py-1.5 px-3 font-semibold shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Suivre l'évolution</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- TIROIR / MODAL DE SUIVI DÉTAILLÉ DE LA FILIÈRE SÉLECTIONNÉE     -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        @if (selectedFiliere) {
          <div class="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white rounded-xs border border-[#D7DBDE] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              
              <!-- Modal Header -->
              <div class="p-6 border-b border-[#D7DBDE] bg-[#F5F6F7] flex items-start justify-between">
                <div>
                  <div class="text-[10px] font-bold uppercase tracking-wider text-[#1C75BC]">
                    Suivi Pédagogique et Évolution de la Classe
                  </div>
                  <h2 class="text-xl font-bold text-[#1B1D1F] mt-0.5">
                    {{ selectedFiliere.titre }}
                  </h2>
                  <p class="text-xs text-[#4B5157] mt-1">
                    {{ selectedFiliere.etablissement.nom }} · {{ selectedFiliere.effectifApprenants }} apprenant(s) inscrit(s)
                  </p>
                </div>
                <button
                  (click)="selectedFiliere = null"
                  class="text-gray-400 hover:text-gray-700 font-bold text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <!-- Onglets du modal -->
              <div class="flex overflow-x-auto border-b border-[#D7DBDE] px-4 md:px-6 bg-white gap-4 text-xs font-semibold scrollbar-thin">
                <button
                  (click)="modalTab = 'apprenants'"
                  [class.text-[#1C75BC]]="modalTab === 'apprenants'"
                  [class.border-b-2]="modalTab === 'apprenants'"
                  [class.border-b-[#F0791E]]="modalTab === 'apprenants'"
                  class="py-3 shrink-0 cursor-pointer hover:text-[#1C75BC] transition-all"
                >
                  👥 Inscriptions & Roster ({{ selectedFiliere.apprenantsDetails.length }})
                </button>
                <button
                  (click)="modalTab = 'modules'"
                  [class.text-[#1C75BC]]="modalTab === 'modules'"
                  [class.border-b-2]="modalTab === 'modules'"
                  [class.border-b-[#F0791E]]="modalTab === 'modules'"
                  class="py-3 shrink-0 cursor-pointer hover:text-[#1C75BC] transition-all"
                >
                  📚 Modules en cours ({{ selectedFiliere.modules.length }})
                </button>
                <button
                  (click)="modalTab = 'evaluations'"
                  [class.text-[#1C75BC]]="modalTab === 'evaluations'"
                  [class.border-b-2]="modalTab === 'evaluations'"
                  [class.border-b-[#F0791E]]="modalTab === 'evaluations'"
                  class="py-3 shrink-0 cursor-pointer hover:text-[#1C75BC] transition-all"
                >
                  📝 Évaluations & Notes
                </button>
              </div>

              <!-- Modal Body -->
              <div class="p-4 md:p-6 overflow-y-auto flex-1 space-y-6 text-xs">

                <!-- 1. ROSTER DES APPRENANTS -->
                @if (modalTab === 'apprenants') {
                  <div class="space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span class="font-bold text-[#1B1D1F]">Roster des apprenants de la filière</span>
                      <span class="text-[11px] text-[#4B5157]">Suivi individuel de complétion et notes</span>
                    </div>

                    <div class="border border-[#D7DBDE] rounded-xs overflow-x-auto">
                      <table class="w-full text-left">
                        <thead class="bg-[#F5F6F7] text-[#4B5157] font-bold border-b border-[#D7DBDE]">
                          <tr>
                            <th class="py-2.5 px-3">Matricule</th>
                            <th class="py-2.5 px-3">Nom & Prénom</th>
                            <th class="py-2.5 px-3">Email</th>
                            <th class="py-2.5 px-3 text-center">Progression</th>
                            <th class="py-2.5 px-3 text-center">Moyenne</th>
                            <th class="py-2.5 px-3 text-center">Certificat</th>
                            <th class="py-2.5 px-3 text-center">Statut</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-[#D7DBDE]">
                          @for (a of selectedFiliere.apprenantsDetails; track a.inscriptionId) {
                            <tr class="hover:bg-[#F9FAFB]">
                              <td class="py-2.5 px-3 font-mono font-bold text-[#1C75BC]">{{ a.matricule }}</td>
                              <td class="py-2.5 px-3 font-bold text-[#1B1D1F]">{{ a.prenom }} {{ a.nom }}</td>
                              <td class="py-2.5 px-3 text-[#4B5157]">{{ a.email }}</td>
                              <td class="py-2.5 px-3 text-center">
                                <span class="font-mono font-bold">{{ a.progressionPct }}%</span>
                                <div class="w-16 mx-auto bg-gray-200 h-1 rounded-full mt-1">
                                  <div class="h-1 rounded-full bg-[#1C75BC]" [style.width.%]="a.progressionPct"></div>
                                </div>
                              </td>
                              <td class="py-2.5 px-3 text-center font-bold">
                                <span [class]="a.moyenne >= 10 ? 'text-[#276B44]' : 'text-amber-600'">
                                  {{ a.moyenne }}/20
                                </span>
                              </td>
                              <td class="py-2.5 px-3 text-center">
                                @if (a.certificatEmis) {
                                  <span class="px-2 py-0.5 bg-[#E7F1EA] text-[#276B44] rounded-xs font-mono font-bold">
                                    ✓ {{ a.certificatNumero || 'Émis' }}
                                  </span>
                                } @else {
                                  <span class="text-gray-400">—</span>
                                }
                              </td>
                              <td class="py-2.5 px-3 text-center">
                                <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-xs font-bold text-[10px]">
                                  {{ a.statut }}
                                </span>
                              </td>
                            </tr>
                          }
                          @empty {
                            <tr>
                              <td colspan="7" class="py-6 text-center text-gray-500">
                                Aucun apprenant n'est encore inscrit dans cette classe.
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }

                <!-- 2. MODULES EN COURS -->
                @if (modalTab === 'modules') {
                  <div class="space-y-4">
                    <div class="font-bold text-[#1B1D1F]">Modules pédagogiques constituant le cursus :</div>
                    <div class="space-y-3">
                      @for (mod of selectedFiliere.modules; track mod.id) {
                        <div class="p-4 border border-[#D7DBDE] rounded-xs bg-[#F9FAFB] space-y-2">
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-sm text-[#1B1D1F]">
                              Module {{ mod.ordre }} : {{ mod.titre }}
                            </span>
                            <span class="text-xs text-[#4B5157]">Coef. {{ mod.coefficient }}</span>
                          </div>
                          <div class="flex items-center gap-4 text-xs text-[#4B5157]">
                            <span>📖 {{ mod.cours?.length ?? 0 }} cours / leçons</span>
                            <span>📝 {{ mod.evaluations?.length ?? 0 }} évaluations</span>
                            <span>❓ {{ mod.quiz?.length ?? 0 }} quiz</span>
                            <span>📑 {{ mod.devoirs?.length ?? 0 }} devoirs</span>
                          </div>
                        </div>
                      }
                      @empty {
                        <p class="text-gray-500 italic">Aucun module configuré pour l'instant.</p>
                      }
                    </div>
                  </div>
                }

                <!-- 3. ÉVALUATIONS & NOTES -->
                @if (modalTab === 'evaluations') {
                  <div class="space-y-4">
                    <div class="font-bold text-[#1B1D1F]">Contrôles, devoirs et évaluations de la filière :</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      @for (mod of selectedFiliere.modules; track mod.id) {
                        @for (ev of mod.evaluations; track ev.id) {
                          <div class="p-3 border border-[#D7DBDE] rounded-xs bg-white space-y-1">
                            <div class="flex items-center justify-between font-semibold text-[#1B1D1F]">
                              <span>{{ ev.titre }}</span>
                              <span class="text-[#1C75BC] font-mono">/{{ ev.noteMaximale }}</span>
                            </div>
                            <div class="text-[11px] text-[#4B5157]">Module : {{ mod.titre }}</div>
                            <div class="text-[11px] text-[#276B44]">
                              {{ ev.notes?.length ?? 0 }} note(s) saisie(s)
                            </div>
                          </div>
                        }
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Modal Footer -->
              <div class="p-4 border-t border-[#D7DBDE] bg-[#F5F6F7] flex justify-end">
                <button
                  type="button"
                  (click)="selectedFiliere = null"
                  class="btn btn-secondary text-xs py-1.5 px-4 font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        }

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- UTILISATEURS DE L'ÉTABLISSEMENT (CONSERVÉ INTACT SANS RÉGRESSION) -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="bg-white border border-[#D7DBDE] rounded-xs shadow-xs p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-base text-[#1B1D1F] flex items-center gap-2">
              <span>👥</span> Utilisateurs rattachés à l'établissement
            </h3>
            <a routerLink="/admin-etab/utilisateurs" class="text-xs text-[#1C75BC] hover:underline font-semibold">
              Gérer les comptes →
            </a>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead class="bg-[#F5F6F7] text-[#4B5157] font-bold border-b border-[#D7DBDE]">
                <tr>
                  <th class="py-2.5 px-3">Nom & Prénom</th>
                  <th class="py-2.5 px-3">Email</th>
                  <th class="py-2.5 px-3">Rôle</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#D7DBDE]">
                @for (u of users; track u.id) {
                  <tr class="hover:bg-[#F9FAFB]">
                    <td class="py-2 px-3 font-semibold text-[#1B1D1F]">{{ u.prenom }} {{ u.nom }}</td>
                    <td class="py-2 px-3 text-[#4B5157]">{{ u.email }}</td>
                    <td class="py-2 px-3">
                      <span class="badge badge-formateur text-[10px]">{{ u.role }}</span>
                    </td>
                  </tr>
                }
                @empty {
                  <tr><td colspan="3" class="p-4 text-center text-gray-500">Aucun utilisateur trouvé.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </app-main-layout>
  `,
})
export class AdminEtabDashboardComponent implements OnInit {
  kpi: KpiEtablissement | null = null;
  users: Utilisateur[] = [];
  filieres: FiliereSuiviItem[] = [];
  loading = false;
  filieresSearch = '';
  selectedStatut = 'ALL';

  selectedFiliere: FiliereSuiviDetail | null = null;
  modalTab: 'apprenants' | 'modules' | 'evaluations' = 'apprenants';

  constructor(
    private auth: AuthService,
    private analytics: AnalyticsService,
    private usersService: UtilisateursService,
    private pedagogie: PedagogieService,
  ) {}

  ngOnInit() {
    this.chargerDonnees();
  }

  chargerDonnees() {
    const etabId = this.auth.currentUser?.etablissementId;
    if (!etabId) return;

    this.loading = true;
    this.analytics.getEtablissement(etabId).subscribe({
      next: (k) => (this.kpi = k),
      error: () => {},
    });

    this.usersService.getByEtablissement(etabId).subscribe({
      next: (u) => (this.users = u),
      error: () => {},
    });

    this.pedagogie.getFilieresSuivi({ etablissementId: etabId }).subscribe({
      next: (f) => {
        this.filieres = f;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get totalApprenantsInscrits(): number {
    return this.filieres.reduce((sum, f) => sum + (f.effectifApprenants || 0), 0);
  }

  get filieresFiltrees(): FiliereSuiviItem[] {
    return this.filieres.filter((f) => {
      const matchStatut = this.selectedStatut === 'ALL' || f.statut === this.selectedStatut;
      const q = this.filieresSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        f.titre.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.formationReferentiel?.filiere?.code && f.formationReferentiel.filiere.code.toLowerCase().includes(q));
      return matchStatut && matchSearch;
    });
  }

  ouvrirSuiviFiliere(formationId: string) {
    this.pedagogie.getFiliereSuiviDetail(formationId).subscribe({
      next: (detail) => {
        this.selectedFiliere = detail;
        this.modalTab = 'apprenants';
      },
    });
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'EN_COURS':
        return 'bg-[#E7F1EA] text-[#276B44] border border-[#276B44]';
      case 'OUVERTE':
        return 'bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]';
      case 'EN_PREPARATION':
        return 'bg-[#FDECDD] text-[#F0791E] border border-[#F0791E]';
      case 'CLOTUREE':
        return 'bg-gray-100 text-gray-700 border border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}
