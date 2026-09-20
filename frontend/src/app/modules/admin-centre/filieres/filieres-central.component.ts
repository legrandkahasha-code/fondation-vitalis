import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PedagogieService } from '../../../core/services/pedagogie.service';
import { EtablissementsService } from '../../../core/services/etablissements.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { FiliereSuiviItem, FiliereSuiviDetail, Etablissement, FiliereReferentiel } from '../../../core/models';

@Component({
  selector: 'app-filieres-central',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="p-6 md:p-8 max-w-7xl mx-auto font-['Public_Sans',sans-serif] space-y-8 pb-16">
        
        <!-- En-tête Institutionnel Direction Générale -->
        <div class="bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-xs">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div class="text-[11px] uppercase font-bold tracking-[0.08em] text-[#1C75BC] flex items-center gap-1.5">
                <span>🌐</span> Administration Centrale · Direction Pédagogique Nationale
              </div>
              <h1 class="text-2xl md:text-3xl font-bold text-[#1B1D1F] mt-1 font-heading tracking-tight">
                Pilotage Central des Filières & Modules
              </h1>
              <div class="barre"></div>
              <p class="text-xs text-[#4B5157] mt-2 max-w-3xl leading-relaxed">
                Supervision nationale consolidée, gestion directe du Référentiel National des Filières, attribution centralisée aux antennes satellites, et suivi en temps réel des modules pédagogiques.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0 flex-wrap">
              @if (mainTab === 'referentiel') {
                <button
                  type="button"
                  (click)="ouvrirNouvelleFiliereModal()"
                  class="btn btn-primary text-xs font-semibold py-2.5 px-4 shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Nouvelle Filière Nationale</span>
                </button>
              } @else {
                <button
                  type="button"
                  (click)="showCreateModal = true"
                  class="btn btn-primary text-xs font-semibold py-2.5 px-4 shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Attribuer une Filière</span>
                </button>
              }
              <button
                type="button"
                (click)="mainTab === 'referentiel' ? chargerReferentielFilieres() : chargerDonnees()"
                [disabled]="loading || loadingReferentiel"
                class="btn btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <span [class.animate-spin]="loading || loadingReferentiel">🔄</span>
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- SÉLECTEUR D'ONGLETS PRINCIPAL : CLASSES VS RÉFÉRENTIEL          -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="flex items-center gap-3 border-b border-[#D7DBDE] pb-2 overflow-x-auto">
          <button
            type="button"
            (click)="mainTab = 'classes'"
            [class.border-b-2]="mainTab === 'classes'"
            [class.border-[#1C75BC]]="mainTab === 'classes'"
            [class.text-[#1C75BC]]="mainTab === 'classes'"
            [class.font-bold]="mainTab === 'classes'"
            class="px-4 py-2.5 text-xs text-[#4B5157] hover:text-[#1B1D1F] transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>🏛️</span>
            <span>Classes & Formations Déployées</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">{{ filieres.length }}</span>
          </button>

          <button
            type="button"
            (click)="mainTab = 'referentiel'"
            [class.border-b-2]="mainTab === 'referentiel'"
            [class.border-[#1C75BC]]="mainTab === 'referentiel'"
            [class.text-[#1C75BC]]="mainTab === 'referentiel'"
            [class.font-bold]="mainTab === 'referentiel'"
            class="px-4 py-2.5 text-xs text-[#4B5157] hover:text-[#1B1D1F] transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>📚</span>
            <span>Référentiel National des Filières</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-[#1C75BC] font-mono font-bold">{{ referentielFilieres.length }}</span>
          </button>
        </div>

        @if (mainTab === 'classes') {

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- KPIS GLOBAUX RÉSEAU                                            -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#124F80]">
            <p class="text-2xl md:text-3xl font-black text-[#124F80] font-mono leading-tight">{{ filieres.length }}</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Filières Réseau</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">toutes antennes</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#1C75BC]">
            <p class="text-2xl md:text-3xl font-black text-[#1C75BC] font-mono leading-tight">{{ totalApprenantsInscrits }}</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Effectif National</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">apprenants inscrits</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#F0791E]">
            <p class="text-2xl md:text-3xl font-black text-[#F0791E] font-mono leading-tight">{{ avancementMoyenGlobal }}%</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Complétion Moyenne</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">avancement des cours</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#276B44]">
            <p class="text-2xl md:text-3xl font-black text-[#276B44] font-mono leading-tight">{{ totalCertificatsDelivres }}</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Certificats Décrochés</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">titres officiels émis</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#124F80]">
            <p class="text-2xl md:text-3xl font-black text-[#124F80] font-mono leading-tight">{{ etablissementsActifsCount }}</p>
            <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Antennes Actives</p>
            <p class="text-[10px] text-[#4B5157] mt-0.5">déployant des filières</p>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- FILTRES, CLASSEMENT ET CONTRÔLE CENTRAL                        -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <div class="bg-white border border-[#D7DBDE] rounded-xs shadow-xs p-6 space-y-6">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#D7DBDE]">
            <div>
              <h2 class="text-lg font-bold text-[#1B1D1F] flex items-center gap-2">
                <span>📋</span> Répertoire Consolidé des Filières / Classes
                <span class="px-2 py-0.5 text-xs bg-[#E7F1FA] text-[#1C75BC] rounded-xs font-mono font-bold">
                  {{ filieresFiltrees.length }}
                </span>
              </h2>
              <p class="text-xs text-[#4B5157] mt-1">
                Filtrez et classez par établissement, statut ou formateur pour un pilotage proactif en temps réel.
              </p>
            </div>

            <!-- Barre de filtres multidimensionnels -->
            <div class="flex flex-wrap items-center gap-3">
              <!-- Filtre Établissement -->
              <div class="flex items-center gap-1.5 text-xs">
                <span class="text-[#4B5157] font-semibold">Établissement :</span>
                <select
                  [(ngModel)]="selectedEtablissementId"
                  (change)="onFilterChange()"
                  class="p-2 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] text-xs bg-white"
                >
                  <option value="ALL">Tous les établissements</option>
                  @for (e of etablissements; track e.id) {
                    <option [value]="e.id">{{ e.nom }} ({{ e.codeAntenne || 'N/A' }})</option>
                  }
                </select>
              </div>

              <!-- Filtre Statut -->
              <div class="flex items-center gap-1.5 text-xs">
                <span class="text-[#4B5157] font-semibold">Statut :</span>
                <select
                  [(ngModel)]="selectedStatut"
                  (change)="onFilterChange()"
                  class="p-2 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] text-xs bg-white"
                >
                  <option value="ALL">Tous statuts</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="OUVERTE">Ouverte</option>
                  <option value="EN_PREPARATION">En préparation</option>
                  <option value="CLOTUREE">Clôturée</option>
                </select>
              </div>

              <!-- Champ de recherche textuelle -->
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (input)="onFilterChange()"
                placeholder="Rechercher filière, code..."
                class="p-2 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] text-xs w-44 sm:w-56"
              />
            </div>
          </div>

          <!-- TABLEAU DE SUIVI NATIONAL -->
          @if (loading) {
            <div class="p-16 text-center text-[#4B5157]">
              <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p class="text-xs font-semibold">Synchronisation des filières nationales en temps réel...</p>
            </div>
          } @else if (filieresFiltrees.length === 0) {
            <div class="p-12 text-center bg-[#F5F6F7] rounded-xs border border-dashed border-[#D7DBDE]">
              <p class="text-sm font-semibold text-[#1B1D1F]">Aucune filière trouvée pour les critères sélectionnés.</p>
              <p class="text-xs text-[#4B5157] mt-1">Vous pouvez attribuer une nouvelle filière via le bouton ci-dessus.</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-[#F5F6F7] text-[#4B5157] uppercase font-bold border-b border-[#D7DBDE]">
                  <tr>
                    <th class="py-3 px-4">Établissement</th>
                    <th class="py-3 px-4">Filière / Classe</th>
                    <th class="py-3 px-4">Statut</th>
                    <th class="py-3 px-4 text-center">Effectif Inscrits</th>
                    <th class="py-3 px-4">Formateur(s) Référent(s)</th>
                    <th class="py-3 px-4 text-center">Modules & Cours</th>
                    <th class="py-3 px-4 text-center">Avancement</th>
                    <th class="py-3 px-4 text-center">Évaluations</th>
                    <th class="py-3 px-4 text-center">Certifications</th>
                    <th class="py-3 px-4 text-right">Contrôle</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#D7DBDE]">
                  @for (f of filieresFiltrees; track f.id) {
                    <tr class="hover:bg-[#F9FAFB] transition-colors">
                      <!-- Établissement -->
                      <td class="py-3 px-4">
                        <div class="font-bold text-[#1B1D1F]">{{ f.etablissement.nom }}</div>
                        <div class="text-[10px] text-[#4B5157] font-mono mt-0.5">
                          Code: {{ f.etablissement.codeAntenne }} {{ f.etablissement.pays ? '· ' + f.etablissement.pays : '' }}
                        </div>
                      </td>

                      <!-- Filière / Titre -->
                      <td class="py-3 px-4">
                        <div class="font-bold text-sm text-[#124F80]">{{ f.titre }}</div>
                        <div class="text-[11px] text-[#4B5157] mt-0.5 flex items-center gap-1.5">
                          @if (f.formationReferentiel?.filiere?.code) {
                            <span class="px-1.5 py-0.2 rounded-xs bg-[#E7F1FA] text-[#1C75BC] font-mono font-bold">
                              {{ f.formationReferentiel?.filiere?.code }}
                            </span>
                          }
                          @if (f.formationReferentiel?.niveau?.libelle) {
                            <span>{{ f.formationReferentiel?.niveau?.libelle }}</span>
                          }
                        </div>
                      </td>

                      <!-- Statut -->
                      <td class="py-3 px-4">
                        <span [class]="getStatutBadgeClass(f.statut)" class="px-2 py-0.5 rounded-xs font-bold text-[10px] uppercase">
                          {{ f.statut }}
                        </span>
                      </td>

                      <!-- Effectif Apprenants -->
                      <td class="py-3 px-4 text-center">
                        <span class="inline-flex items-center gap-1 font-bold text-sm text-[#124F80]">
                          <span>👥</span> {{ f.effectifApprenants }}
                        </span>
                        <div class="text-[10px] text-[#4B5157]">inscrits</div>
                      </td>

                      <!-- Formateurs assignés -->
                      <td class="py-3 px-4">
                        @if (f.formateurs && f.formateurs.length > 0) {
                          <div class="space-y-0.5">
                            @for (formateur of f.formateurs.slice(0, 2); track formateur.id) {
                              <div class="text-[#1B1D1F] font-medium flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-[#1C75BC]"></span>
                                <span>{{ formateur.prenom }} {{ formateur.nom }}</span>
                              </div>
                            }
                            @if (f.formateurs.length > 2) {
                              <span class="text-[10px] text-[#4B5157] italic">+{{ f.formateurs.length - 2 }} autre(s)</span>
                            }
                          </div>
                        } @else {
                          <span class="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-xs">Non assigné</span>
                        }
                      </td>

                      <!-- Modules & Cours -->
                      <td class="py-3 px-4 text-center">
                        <div class="font-bold text-[#1B1D1F]">{{ f.modulesCount }} modules</div>
                        <div class="text-[10px] text-[#4B5157]">{{ f.coursCount }} cours</div>
                      </td>

                      <!-- Avancement Moyen -->
                      <td class="py-3 px-4 text-center min-w-[110px]">
                        <div class="font-bold text-[#1B1D1F] font-mono">{{ f.avancementMoyen }}%</div>
                        <div class="w-full bg-[#D7DBDE] h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            class="h-1.5 rounded-full transition-all"
                            [class]="f.avancementMoyen >= 75 ? 'bg-[#276B44]' : 'bg-[#1C75BC]'"
                            [style.width.%]="f.avancementMoyen"
                          ></div>
                        </div>
                      </td>

                      <!-- Évaluations -->
                      <td class="py-3 px-4 text-center">
                        <div class="font-bold text-[#1B1D1F]">{{ f.evaluationsCount }} tests</div>
                        <div class="text-[10px] text-[#4B5157]">Moy: {{ f.moyenneGenerale }}/20</div>
                      </td>

                      <!-- Certifications délivrées -->
                      <td class="py-3 px-4 text-center">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E7F1EA] text-[#276B44] border border-[#276B44]/30 rounded-xs font-bold font-mono">
                          🎓 {{ f.certificatsCount }}
                        </span>
                      </td>

                      <!-- Action Contrôle Central -->
                      <td class="py-3 px-4 text-right">
                        <button
                          type="button"
                          (click)="ouvrirSuiviDetail(f.id)"
                          class="btn btn-secondary text-xs py-1 px-2.5 font-semibold shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Superviser</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
        }

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- ONGLET 2 : GESTION DU RÉFÉRENTIEL NATIONAL DES FILIÈRES         -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        @if (mainTab === 'referentiel') {
          <div class="space-y-6">
            <!-- Statistiques Référentiel -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#124F80]">
                <p class="text-2xl md:text-3xl font-black text-[#124F80] font-mono leading-tight">{{ referentielFilieres.length }}</p>
                <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Filières Référentielles</p>
                <p class="text-[10px] text-[#4B5157] mt-0.5">catalogue national</p>
              </div>

              <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#276B44]">
                <p class="text-2xl md:text-3xl font-black text-[#276B44] font-mono leading-tight">{{ filieresActivesCount }}</p>
                <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Filières Actives</p>
                <p class="text-[10px] text-[#4B5157] mt-0.5">disponibles pour rattachement</p>
              </div>

              <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#1C75BC]">
                <p class="text-2xl md:text-3xl font-black text-[#1C75BC] font-mono leading-tight">{{ totalClassesRattachees }}</p>
                <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Classes Rattachées</p>
                <p class="text-[10px] text-[#4B5157] mt-0.5">réparties en antennes</p>
              </div>

              <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center border-t-4 border-t-[#F0791E]">
                <p class="text-2xl md:text-3xl font-black text-[#F0791E] font-mono leading-tight">{{ totalModulesRattaches }}</p>
                <p class="text-[11px] font-bold text-[#1B1D1F] mt-1 uppercase tracking-wider">Modules Déployés</p>
                <p class="text-[10px] text-[#4B5157] mt-0.5">associés aux filières</p>
              </div>
            </div>

            <!-- Liste et Gestion des Filières -->
            <div class="bg-white border border-[#D7DBDE] rounded-xs shadow-xs p-6 space-y-6">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D7DBDE]">
                <div>
                  <h2 class="text-lg font-bold text-[#1B1D1F] flex items-center gap-2">
                    <span>📚</span> Répertoire National des Filières & Référentiels
                    <span class="px-2 py-0.5 text-xs bg-[#E7F1FA] text-[#1C75BC] rounded-xs font-mono font-bold">
                      {{ filieresReferentielFiltrees.length }}
                    </span>
                  </h2>
                  <p class="text-xs text-[#4B5157] mt-1">
                    Gérez directement les filières officielles que chaque antenne associe à ses formations et modules pédagogiques.
                  </p>
                </div>

                <div class="flex items-center gap-3">
                  <input
                    type="text"
                    [(ngModel)]="searchReferentielQuery"
                    placeholder="Rechercher code, libellé..."
                    class="p-2 border border-[#9AA1A8] rounded-xs text-xs focus:outline-none focus:border-[#1C75BC] w-64 bg-white"
                  />
                  <button
                    type="button"
                    (click)="ouvrirNouvelleFiliereModal()"
                    class="btn btn-primary text-xs font-semibold py-2 px-3 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>➕</span>
                    <span>Ajouter une Filière</span>
                  </button>
                </div>
              </div>

              @if (loadingReferentiel) {
                <div class="py-12 text-center text-[#4B5157]">
                  <div class="inline-block animate-spin text-2xl mb-2">🔄</div>
                  <p class="text-xs font-semibold">Chargement du référentiel national...</p>
                </div>
              } @else if (filieresReferentielFiltrees.length === 0) {
                <div class="py-12 text-center text-[#4B5157]">
                  <p class="text-sm font-semibold">Aucune filière trouvée dans le référentiel.</p>
                  <p class="text-xs mt-1">Cliquez sur « Ajouter une Filière » pour créer la première discipline nationale.</p>
                </div>
              } @else {
                <div class="overflow-x-auto border border-[#D7DBDE] rounded-xs">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-[#F5F6F7] text-[#1B1D1F] font-bold border-b border-[#D7DBDE]">
                      <tr>
                        <th class="py-3 px-4">Code</th>
                        <th class="py-3 px-4">Intitulé Officiel</th>
                        <th class="py-3 px-4">Description</th>
                        <th class="py-3 px-4 text-center">Ordre</th>
                        <th class="py-3 px-4 text-center">Classes Rattachées</th>
                        <th class="py-3 px-4 text-center">Statut</th>
                        <th class="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#D7DBDE]">
                      @for (fil of filieresReferentielFiltrees; track fil.id) {
                        <tr class="hover:bg-[#F9FAFB] transition-colors">
                          <td class="py-3 px-4">
                            <span class="px-2.5 py-1 rounded-xs bg-[#E7F1FA] text-[#1C75BC] font-mono font-bold text-xs border border-[#1C75BC]/30">
                              {{ fil.code }}
                            </span>
                          </td>
                          <td class="py-3 px-4 font-bold text-[#1B1D1F]">
                            {{ fil.libelle }}
                          </td>
                          <td class="py-3 px-4 text-[#4B5157] max-w-xs truncate">
                            {{ fil.description || '— Aucune description —' }}
                          </td>
                          <td class="py-3 px-4 text-center font-mono text-[#4B5157]">
                            {{ fil.ordre || 0 }}
                          </td>
                          <td class="py-3 px-4 text-center">
                            <span class="font-bold text-[#124F80]">
                              {{ getClassesCountForFiliere(fil.id) }}
                            </span>
                            <span class="text-[10px] text-slate-400 block">classe(s)</span>
                          </td>
                          <td class="py-3 px-4 text-center">
                            @if (fil.actif) {
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F1EA] text-[#276B44] border border-[#276B44]/30">
                                ● Active
                              </span>
                            } @else {
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-300">
                                ○ Inactive
                              </span>
                            }
                          </td>
                          <td class="py-3 px-4 text-right">
                            <div class="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                (click)="ouvrirModifierFiliereModal(fil)"
                                class="btn btn-ghost text-[11px] py-1 px-2 border border-[#D7DBDE] text-[#124F80] hover:bg-slate-50 cursor-pointer"
                                title="Modifier cette filière"
                              >
                                ✏️ Modifier
                              </button>
                              <button
                                type="button"
                                (click)="toggleActifFiliere(fil)"
                                class="btn btn-ghost text-[11px] py-1 px-2 border border-[#D7DBDE] hover:bg-slate-50 cursor-pointer"
                                [title]="fil.actif ? 'Désactiver' : 'Activer'"
                              >
                                {{ fil.actif ? '⏸️' : '▶️' }}
                              </button>
                              <button
                                type="button"
                                (click)="supprimerFiliere(fil)"
                                class="btn btn-ghost text-[11px] py-1 px-2 border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Supprimer ou désactiver"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        }

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- MODAL 1 : ATTRIBUTION / CRÉATION CENTRALE D'UNE FILIÈRE        -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        @if (showCreateModal) {
          <div class="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white rounded-xs border border-[#D7DBDE] shadow-2xl w-full max-w-xl overflow-hidden text-xs">
              <div class="p-5 border-b border-[#D7DBDE] bg-[#F5F6F7] flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-[#1B1D1F]">
                    Attribuer une Filière de Formation (Classe)
                  </h3>
                  <p class="text-[11px] text-[#4B5157] mt-0.5">
                    Déploiement centralisé d'une filière dans une antenne territoriale.
                  </p>
                </div>
                <button (click)="showCreateModal = false" class="text-gray-400 hover:text-gray-700 font-bold text-base cursor-pointer">
                  ✕
                </button>
              </div>

              <form (ngSubmit)="creerFiliereCentrale()" class="p-6 space-y-4">
                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Établissement Destinataire *</label>
                  <select
                    [(ngModel)]="nouvelleFiliere.etablissementId"
                    name="etablissementId"
                    required
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] bg-white"
                  >
                    <option value="">— Sélectionner l'antenne d'affectation —</option>
                    @for (e of etablissements; track e.id) {
                      <option [value]="e.id">{{ e.nom }} ({{ e.codeAntenne || 'N/A' }})</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Intitulé de la Filière / Classe *</label>
                  <input
                    type="text"
                    [(ngModel)]="nouvelleFiliere.titre"
                    name="titre"
                    required
                    placeholder="Ex: Génie Logiciel & Systèmes d'Information — Promo 2026"
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
                  />
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Filière Référentielle de Rattachement (Optionnel)</label>
                  <select
                    [(ngModel)]="nouvelleFiliere.formationReferentielId"
                    name="formationReferentielId"
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] bg-white"
                  >
                    <option value="">-- Sans rattachement officiel direct --</option>
                    @for (fil of referentielFilieres; track fil.id) {
                      <option [value]="fil.id">{{ fil.libelle }} ({{ fil.code }})</option>
                    }
                  </select>
                  <p class="text-[10px] text-slate-400 mt-1">Lie cette classe au tronc commun national pour standardiser les modules pédagogiques.</p>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Description pédagogique</label>
                  <textarea
                    rows="3"
                    [(ngModel)]="nouvelleFiliere.description"
                    name="description"
                    placeholder="Objectifs pédagogiques, compétences visées et débouchés certifiés..."
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
                  ></textarea>
                </div>

                <div class="p-4 border-t border-[#D7DBDE] bg-[#F5F6F7] flex items-center justify-end gap-3 -mx-6 -mb-6 mt-6">
                  <button
                    type="button"
                    (click)="showCreateModal = false"
                    class="btn btn-secondary text-xs py-2 px-4 font-semibold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    [disabled]="creatingFiliere || !nouvelleFiliere.etablissementId || !nouvelleFiliere.titre"
                    class="btn btn-primary text-xs py-2 px-4 font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{{ creatingFiliere ? 'Création en cours...' : 'Confirmer l\'attribution' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- MODAL 2 : SUPERVISION DÉTAILLÉE DE LA CLASSE                   -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        @if (selectedDetail) {
          <div class="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white rounded-xs border border-[#D7DBDE] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
              
              <!-- Header Modal -->
              <div class="p-6 border-b border-[#D7DBDE] bg-[#F5F6F7] flex items-start justify-between">
                <div>
                  <div class="text-[10px] font-bold uppercase tracking-wider text-[#1C75BC]">
                    Supervision Centrale · {{ selectedDetail.etablissement.nom }}
                  </div>
                  <h2 class="text-xl font-bold text-[#1B1D1F] mt-0.5">
                    {{ selectedDetail.titre }}
                  </h2>
                  <p class="text-xs text-[#4B5157] mt-1">
                    {{ selectedDetail.effectifApprenants }} apprenant(s) · {{ selectedDetail.modules.length }} module(s) · {{ selectedDetail.certificats.length }} certificat(s)
                  </p>
                </div>
                <button (click)="selectedDetail = null" class="text-gray-400 hover:text-gray-700 font-bold text-lg p-1 cursor-pointer">
                  ✕
                </button>
              </div>

              <!-- Onglets Modal -->
              <div class="flex overflow-x-auto border-b border-[#D7DBDE] px-4 md:px-6 bg-white gap-4 font-semibold scrollbar-thin">
                <button
                  (click)="detailTab = 'inscriptions'"
                  [class.text-[#1C75BC]]="detailTab === 'inscriptions'"
                  [class.border-b-2]="detailTab === 'inscriptions'"
                  [class.border-b-[#F0791E]]="detailTab === 'inscriptions'"
                  class="py-3 shrink-0 cursor-pointer hover:text-[#1C75BC] transition-all"
                >
                  👥 Inscriptions & Progression ({{ selectedDetail.apprenantsDetails.length }})
                </button>
                <button
                  (click)="detailTab = 'pedagogie'"
                  [class.text-[#1C75BC]]="detailTab === 'pedagogie'"
                  [class.border-b-2]="detailTab === 'pedagogie'"
                  [class.border-b-[#F0791E]]="detailTab === 'pedagogie'"
                  class="py-3 shrink-0 cursor-pointer hover:text-[#1C75BC] transition-all"
                >
                  📚 Modules & Évolution des Cours
                </button>
                <button
                  (click)="detailTab = 'evaluations'"
                  [class.text-[#1C75BC]]="detailTab === 'evaluations'"
                  [class.border-b-2]="detailTab === 'evaluations'"
                  [class.border-b-[#F0791E]]="detailTab === 'evaluations'"
                  class="py-3 shrink-0 cursor-pointer hover:text-[#1C75BC] transition-all"
                >
                  📝 Contrôles, Devoirs & Examens
                </button>
                <button
                  (click)="detailTab = 'certificats'"
                  [class.text-[#1C75BC]]="detailTab === 'certificats'"
                  [class.border-b-2]="detailTab === 'certificats'"
                  [class.border-b-[#F0791E]]="detailTab === 'certificats'"
                  class="py-3 shrink-0 cursor-pointer hover:text-[#1C75BC] transition-all"
                >
                  🎓 Certifications Délivrées ({{ selectedDetail.certificats.length }})
                </button>
              </div>

              <!-- Corps Modal -->
              <div class="p-4 md:p-6 overflow-y-auto flex-1 space-y-6">

                <!-- 1. INSCRIPTIONS DES APPRENANTS -->
                @if (detailTab === 'inscriptions') {
                  <div class="space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span class="font-bold text-[#1B1D1F]">Effectif et avancement des apprenants inscrits :</span>
                      <span class="text-[#4B5157]">Calculé en temps réel</span>
                    </div>

                    <div class="border border-[#D7DBDE] rounded-xs overflow-x-auto">
                      <table class="w-full text-left">
                        <thead class="bg-[#F5F6F7] text-[#4B5157] font-bold border-b border-[#D7DBDE]">
                          <tr>
                            <th class="py-2.5 px-3">Matricule</th>
                            <th class="py-2.5 px-3">Nom & Prénom</th>
                            <th class="py-2.5 px-3">Email</th>
                            <th class="py-2.5 px-3 text-center">Avancement</th>
                            <th class="py-2.5 px-3 text-center">Moyenne</th>
                            <th class="py-2.5 px-3 text-center">Certificat</th>
                            <th class="py-2.5 px-3 text-center">Statut</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-[#D7DBDE]">
                          @for (a of selectedDetail.apprenantsDetails; track a.inscriptionId) {
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
                                    ✓ {{ a.certificatNumero }}
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
                            <tr><td colspan="7" class="py-6 text-center text-gray-500">Aucun apprenant inscrit.</td></tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }

                <!-- 2. PÉDAGOGIE & MODULES -->
                @if (detailTab === 'pedagogie') {
                  <div class="space-y-4">
                    <div class="font-bold text-[#1B1D1F]">Arborescence des modules et avancement des cours :</div>
                    <div class="space-y-3">
                      @for (mod of selectedDetail.modules; track mod.id) {
                        <div class="p-4 border border-[#D7DBDE] rounded-xs bg-[#F9FAFB] space-y-3">
                          <div class="flex items-center justify-between">
                            <div class="font-bold text-sm text-[#1B1D1F]">
                              Module {{ mod.ordre }} : {{ mod.titre }}
                            </div>
                            <span class="px-2 py-0.5 bg-white border border-[#D7DBDE] rounded-xs text-[#4B5157]">
                              Coef. {{ mod.coefficient }}
                            </span>
                          </div>

                          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-[#4B5157]">
                            <div class="p-2 bg-white rounded-xs border border-[#D7DBDE]">
                              <strong>{{ mod.cours?.length ?? 0 }}</strong> cours / supports
                            </div>
                            <div class="p-2 bg-white rounded-xs border border-[#D7DBDE]">
                              <strong>{{ mod.evaluations?.length ?? 0 }}</strong> évaluations
                            </div>
                            <div class="p-2 bg-white rounded-xs border border-[#D7DBDE]">
                              <strong>{{ mod.quiz?.length ?? 0 }}</strong> quiz
                            </div>
                            <div class="p-2 bg-white rounded-xs border border-[#D7DBDE]">
                              <strong>{{ mod.devoirs?.length ?? 0 }}</strong> devoirs
                            </div>
                          </div>
                        </div>
                      }
                      @empty {
                        <p class="text-gray-500 italic">Aucun module configuré.</p>
                      }
                    </div>
                  </div>
                }

                <!-- 3. ÉVALUATIONS & EXAMENS -->
                @if (detailTab === 'evaluations') {
                  <div class="space-y-4">
                    <div class="font-bold text-[#1B1D1F]">Toutes les évaluations, devoirs et interrogations :</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      @for (mod of selectedDetail.modules; track mod.id) {
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

                <!-- 4. CERTIFICATIONS DÉLIVRÉES -->
                @if (detailTab === 'certificats') {
                  <div class="space-y-4">
                    <div class="font-bold text-[#1B1D1F]">Certificats officiels délivrés pour cette filière :</div>
                    <div class="border border-[#D7DBDE] rounded-xs overflow-hidden">
                      <table class="w-full text-left">
                        <thead class="bg-[#F5F6F7] text-[#4B5157] font-bold border-b border-[#D7DBDE]">
                          <tr>
                            <th class="py-2.5 px-3">Numéro de Série</th>
                            <th class="py-2.5 px-3">Titulaire</th>
                            <th class="py-2.5 px-3 text-center">Moyenne</th>
                            <th class="py-2.5 px-3 text-center">Date d'Émission</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-[#D7DBDE]">
                          @for (c of selectedDetail.certificats; track c.id) {
                            <tr class="hover:bg-[#F9FAFB]">
                              <td class="py-2.5 px-3 font-mono font-bold text-[#276B44]">{{ c.numeroSerie }}</td>
                              <td class="py-2.5 px-3 font-semibold text-[#1B1D1F]">
                                {{ c.utilisateur?.prenom }} {{ c.utilisateur?.nom }}
                              </td>
                              <td class="py-2.5 px-3 text-center font-bold text-[#1C75BC]">
                                {{ c.moyenneGenerale }}/20
                              </td>
                              <td class="py-2.5 px-3 text-center text-[#4B5157]">
                                {{ c.dateEmission | date:'dd/MM/yyyy' }}
                              </td>
                            </tr>
                          }
                          @empty {
                            <tr><td colspan="4" class="py-6 text-center text-gray-500">Aucun certificat encore délivré pour cette classe.</td></tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }

              </div>

              <!-- Footer Modal -->
              <div class="p-4 border-t border-[#D7DBDE] bg-[#F5F6F7] flex justify-end">
                <button
                  type="button"
                  (click)="selectedDetail = null"
                  class="btn btn-secondary text-xs py-1.5 px-4 font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        }

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- MODAL 3 : CRÉER / MODIFIER UNE FILIÈRE RÉFÉRENTIELLE          -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        @if (showFiliereModal) {
          <div class="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white rounded-xs border border-[#D7DBDE] shadow-2xl w-full max-w-lg overflow-hidden text-xs">
              <div class="p-5 border-b border-[#D7DBDE] bg-[#F5F6F7] flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-[#1B1D1F]">
                    {{ isEditingFiliere ? 'Modifier la Filière Référentielle' : 'Ajouter une Filière Nationale' }}
                  </h3>
                  <p class="text-[11px] text-[#4B5157] mt-0.5">
                    Référentiel national des compétences et spécialités officielles.
                  </p>
                </div>
                <button (click)="showFiliereModal = false" class="text-gray-400 hover:text-gray-700 font-bold text-base cursor-pointer">
                  ✕
                </button>
              </div>

              <form (ngSubmit)="sauvegarderFiliere()" class="p-6 space-y-4">
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Code National *</label>
                    <input
                      type="text"
                      [(ngModel)]="filiereForm.code"
                      name="code"
                      required
                      placeholder="Ex: INFO, ELEC"
                      class="w-full p-2.5 border border-[#9AA1A8] rounded-xs font-mono font-bold uppercase focus:outline-none focus:border-[#1C75BC]"
                    />
                  </div>
                  <div class="col-span-2">
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Intitulé Officiel *</label>
                    <input
                      type="text"
                      [(ngModel)]="filiereForm.libelle"
                      name="libelle"
                      required
                      placeholder="Ex: Informatique & Réseaux"
                      class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
                    />
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Description & Spécialités</label>
                  <textarea
                    rows="3"
                    [(ngModel)]="filiereForm.description"
                    name="description"
                    placeholder="Description du programme cadre, débouchés visés et compétences nationales..."
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
                  ></textarea>
                </div>

                <div class="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Ordre d'affichage</label>
                    <input
                      type="number"
                      [(ngModel)]="filiereForm.ordre"
                      name="ordre"
                      class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
                    />
                  </div>
                  <div class="pt-5">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [(ngModel)]="filiereForm.actif"
                        name="actif"
                        class="w-4 h-4 text-[#1C75BC] rounded-xs"
                      />
                      <span class="font-semibold text-[#1B1D1F]">Filière active</span>
                    </label>
                  </div>
                </div>

                <div class="p-4 border-t border-[#D7DBDE] bg-[#F5F6F7] flex items-center justify-end gap-3 -mx-6 -mb-6 mt-6">
                  <button
                    type="button"
                    (click)="showFiliereModal = false"
                    class="btn btn-secondary text-xs py-2 px-4 font-semibold cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    [disabled]="isSavingFiliere || !filiereForm.code || !filiereForm.libelle"
                    class="btn btn-primary text-xs py-2 px-4 font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{{ isSavingFiliere ? 'Sauvegarde...' : 'Enregistrer la Filière' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

      </div>
    </app-main-layout>
  `,
})
export class FilieresCentralComponent implements OnInit, OnDestroy {
  filieres: FiliereSuiviItem[] = [];
  etablissements: Etablissement[] = [];
  loading = false;

  // Navigation principale
  mainTab: 'classes' | 'referentiel' = 'classes';

  // Référentiel National des Filières
  referentielFilieres: FiliereReferentiel[] = [];
  loadingReferentiel = false;
  searchReferentielQuery = '';

  // Modale Filière Référentiel
  showFiliereModal = false;
  isEditingFiliere = false;
  isSavingFiliere = false;
  filiereForm = {
    id: '',
    code: '',
    libelle: '',
    description: '',
    ordre: 0,
    actif: true,
  };

  // Filtres Classes
  selectedEtablissementId = 'ALL';
  selectedStatut = 'ALL';
  searchQuery = '';

  // Modal Création / Attribution
  showCreateModal = false;
  creatingFiliere = false;
  nouvelleFiliere = {
    etablissementId: '',
    titre: '',
    description: '',
    formationReferentielId: '',
  };

  // Modal Détail
  selectedDetail: FiliereSuiviDetail | null = null;
  detailTab: 'inscriptions' | 'pedagogie' | 'evaluations' | 'certificats' = 'inscriptions';

  private notifSub: Subscription | null = null;

  constructor(
    private pedagogie: PedagogieService,
    private etablissementsService: EtablissementsService,
    private notifications: NotificationsService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.chargerDonnees();
    this.chargerEtablissements();
    this.chargerReferentielFilieres();

    // Auto-refresh en temps réel sur les événements SSE
    this.notifSub = this.notifications.messages().subscribe({
      next: (msg) => {
        if (msg && (msg.type === 'FILIERE_UPDATE' || msg.type === 'FORMATION_UPDATE')) {
          this.chargerDonnees();
          this.chargerReferentielFilieres();
        }
      },
    });
  }

  ngOnDestroy() {
    this.notifSub?.unsubscribe();
  }

  chargerDonnees() {
    this.loading = true;
    const params: any = {};
    if (this.selectedEtablissementId !== 'ALL') params.etablissementId = this.selectedEtablissementId;
    if (this.selectedStatut !== 'ALL') params.statut = this.selectedStatut;
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();

    this.pedagogie.getFilieresSuivi(params).subscribe({
      next: (data) => {
        this.filieres = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Erreur lors du chargement des filières.');
      },
    });
  }

  chargerEtablissements() {
    this.etablissementsService.getAll().subscribe({
      next: (etabs) => (this.etablissements = etabs),
      error: () => {},
    });
  }

  chargerReferentielFilieres() {
    this.loadingReferentiel = true;
    this.pedagogie.getReferentielFilieres(true).subscribe({
      next: (fils) => {
        this.referentielFilieres = fils || [];
        this.loadingReferentiel = false;
      },
      error: () => {
        this.loadingReferentiel = false;
        this.toast.error('Erreur lors du chargement des filières du référentiel.');
      },
    });
  }

  get filieresReferentielFiltrees(): FiliereReferentiel[] {
    if (!this.searchReferentielQuery.trim()) return this.referentielFilieres;
    const q = this.searchReferentielQuery.toLowerCase().trim();
    return this.referentielFilieres.filter(
      (f) =>
        f.code?.toLowerCase().includes(q) ||
        f.libelle?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q),
    );
  }

  get filieresActivesCount(): number {
    return this.referentielFilieres.filter((f) => f.actif).length;
  }

  get totalClassesRattachees(): number {
    return this.filieres.filter((f) => !!f.formationReferentiel?.filiere?.id).length;
  }

  get totalModulesRattaches(): number {
    return this.filieres.reduce((acc, f) => acc + (f.modulesCount || 0), 0);
  }

  getClassesCountForFiliere(filiereId: string): number {
    return this.filieres.filter((f) => f.formationReferentiel?.filiere?.id === filiereId).length;
  }

  ouvrirNouvelleFiliereModal() {
    this.isEditingFiliere = false;
    this.filiereForm = {
      id: '',
      code: '',
      libelle: '',
      description: '',
      ordre: this.referentielFilieres.length + 1,
      actif: true,
    };
    this.showFiliereModal = true;
  }

  ouvrirModifierFiliereModal(fil: FiliereReferentiel) {
    this.isEditingFiliere = true;
    this.filiereForm = {
      id: fil.id,
      code: fil.code,
      libelle: fil.libelle,
      description: fil.description || '',
      ordre: fil.ordre || 0,
      actif: fil.actif ?? true,
    };
    this.showFiliereModal = true;
  }

  sauvegarderFiliere() {
    if (!this.filiereForm.code.trim() || !this.filiereForm.libelle.trim()) {
      this.toast.info('Le code et le libellé sont obligatoires.');
      return;
    }

    this.isSavingFiliere = true;

    if (this.isEditingFiliere) {
      this.pedagogie
        .updateFiliere(this.filiereForm.id, {
          code: this.filiereForm.code.trim().toUpperCase(),
          libelle: this.filiereForm.libelle.trim(),
          description: this.filiereForm.description.trim() || undefined,
          ordre: Number(this.filiereForm.ordre) || 0,
          actif: this.filiereForm.actif,
        })
        .subscribe({
          next: () => {
            this.isSavingFiliere = false;
            this.showFiliereModal = false;
            this.toast.success('Filière mise à jour avec succès.');
            this.chargerReferentielFilieres();
            this.chargerDonnees();
          },
          error: (err) => {
            this.isSavingFiliere = false;
            this.toast.error(err?.error?.message || 'Erreur lors de la mise à jour de la filière.');
          },
        });
    } else {
      this.pedagogie
        .createFiliere({
          code: this.filiereForm.code.trim().toUpperCase(),
          libelle: this.filiereForm.libelle.trim(),
          description: this.filiereForm.description.trim() || undefined,
          ordre: Number(this.filiereForm.ordre) || 0,
        })
        .subscribe({
          next: () => {
            this.isSavingFiliere = false;
            this.showFiliereModal = false;
            this.toast.success('Nouvelle filière créée avec succès dans le référentiel.');
            this.chargerReferentielFilieres();
            this.chargerDonnees();
          },
          error: (err) => {
            this.isSavingFiliere = false;
            this.toast.error(err?.error?.message || 'Erreur lors de la création de la filière.');
          },
        });
    }
  }

  toggleActifFiliere(fil: FiliereReferentiel) {
    const nouveauStatut = !fil.actif;
    this.pedagogie.updateFiliere(fil.id, { actif: nouveauStatut }).subscribe({
      next: () => {
        fil.actif = nouveauStatut;
        this.toast.success(`Filière ${nouveauStatut ? 'activée' : 'désactivée'} avec succès.`);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Erreur lors du changement de statut.');
      },
    });
  }

  supprimerFiliere(fil: FiliereReferentiel) {
    const conf = confirm(`Êtes-vous sûr de vouloir supprimer ou désactiver la filière "${fil.libelle}" (${fil.code}) ?`);
    if (!conf) return;

    this.pedagogie.deleteFiliere(fil.id).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Filière mise à jour avec succès.');
        this.chargerReferentielFilieres();
        this.chargerDonnees();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Impossible de supprimer cette filière.');
      },
    });
  }

  onFilterChange() {
    this.chargerDonnees();
  }

  get totalApprenantsInscrits(): number {
    return this.filieres.reduce((acc, f) => acc + (f.effectifApprenants || 0), 0);
  }

  get avancementMoyenGlobal(): number {
    if (this.filieres.length === 0) return 0;
    const sum = this.filieres.reduce((acc, f) => acc + (f.avancementMoyen || 0), 0);
    return Math.round(sum / this.filieres.length);
  }

  get totalCertificatsDelivres(): number {
    return this.filieres.reduce((acc, f) => acc + (f.certificatsCount || 0), 0);
  }

  get etablissementsActifsCount(): number {
    const ids = new Set(this.filieres.map((f) => f.etablissementId));
    return ids.size;
  }

  get filieresFiltrees(): FiliereSuiviItem[] {
    return this.filieres;
  }

  creerFiliereCentrale() {
    if (!this.nouvelleFiliere.etablissementId || !this.nouvelleFiliere.titre.trim()) return;

    this.creatingFiliere = true;
    this.pedagogie
      .createFormation({
        titre: this.nouvelleFiliere.titre.trim(),
        description: this.nouvelleFiliere.description.trim(),
        etablissementId: this.nouvelleFiliere.etablissementId,
        formationReferentielId: this.nouvelleFiliere.formationReferentielId || undefined,
      })
      .subscribe({
        next: () => {
          this.creatingFiliere = false;
          this.showCreateModal = false;
          this.nouvelleFiliere = { etablissementId: '', titre: '', description: '', formationReferentielId: '' };
          this.toast.success('Filière attribuée avec succès à l\'établissement.');
          this.chargerDonnees();
        },
        error: (err) => {
          this.creatingFiliere = false;
          this.toast.error(err?.error?.message || 'Erreur lors de l\'attribution de la filière.');
        },
      });
  }

  ouvrirSuiviDetail(formationId: string) {
    this.pedagogie.getFiliereSuiviDetail(formationId).subscribe({
      next: (detail) => {
        this.selectedDetail = detail;
        this.detailTab = 'inscriptions';
      },
      error: () => {
        this.toast.error('Impossible de charger le suivi de cette classe.');
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
