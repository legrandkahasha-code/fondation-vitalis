import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';
import { PedagogieService, FeuilleNotesResponse, LigneFeuilleNotes } from '../../../core/services/pedagogie.service';
import { FormateurBootstrapService } from '../../../core/services/formateur-bootstrap.service';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationsService, NotificationPayload } from '../../../core/services/notifications.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Formation, Module, Evaluation } from '../../../core/models';

export interface LigneEditable extends LigneFeuilleNotes {
  originalValeur: number | null;
  currentValeur: number | null;
  isDirty: boolean;
  isSaving: boolean;
  errorMsg?: string;
}

type FilterStatusType = 'TOUS' | 'NOTES' | 'EN_ATTENTE' | 'AJOURNES';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="space-y-6 animate-fade-in pb-16 min-w-0">

        <!-- ══════════ EN-TÊTE INSTITUTIONNEL VITALIS CENTER ══════════ -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D7DBDE] pb-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] text-[10px] font-bold uppercase tracking-wider">
                Espace Formateur · Évaluations & Notes
              </span>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#E7F1EA] text-[#276B44] text-[10px] font-bold">
                <span class="w-1.5 h-1.5 rounded-full bg-[#276B44] animate-pulse"></span>
                Norme BR-03 Active
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] font-heading mt-1">
              Saisie & Délibération des Évaluations
            </h1>
            <div class="w-16 h-1 bg-[#F0791E] mt-2 mb-2 rounded-xs"></div>
            <p class="text-xs text-[#4B5157] max-w-2xl leading-relaxed">
              Feuille d'émargement des notes, contrôle continu et examens officiels. Les notes saisies alimentent directement le calcul des moyennes pondérées pour la délivrance des certificats.
            </p>
          </div>

          <!-- ACTIONS HAUT DE PAGE -->
          <div class="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            @if (selectedEvaluationId && feuilleNotes) {
              <!-- EXPORT CSV -->
              <button
                type="button"
                (click)="exporterCsv()"
                class="px-3.5 py-2 rounded-xs bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Exporter le relevé en format CSV pour Excel"
              >
                <svg class="w-4 h-4 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export CSV</span>
              </button>

              <!-- IMPRESSION PV -->
              <button
                type="button"
                (click)="imprimerPv()"
                class="px-3.5 py-2 rounded-xs bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Imprimer le Procès-Verbal de Délibération"
              >
                <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimer PV</span>
              </button>

              <!-- SAUVEGARDE GLOBALE PAR LOT -->
              <button
                type="button"
                (click)="enregistrerTout()"
                [disabled]="savingBatch || modifiedCount === 0"
                class="px-4 py-2 rounded-xs bg-[#F0791E] hover:bg-[#d96612] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (savingBatch) {
                  <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Enregistrement...</span>
                } @else {
                  <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Enregistrer tout ({{ modifiedCount }})</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- ══════════ FILTRES HIÉRARCHIQUES : FORMATION -> MODULE -> ÉVALUATION ══════════ -->
        <div class="bg-white border border-[#D7DBDE] rounded-xs p-5 shadow-2xs space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

            <!-- 1. Sélection Formation -->
            <div>
              <label class="block text-xs font-bold text-[#1B1D1F] uppercase tracking-wider mb-1.5">
                1. Formation
              </label>
              <select
                class="w-full px-3 py-2 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs font-medium text-[#1B1D1F] focus:outline-none focus:border-[#1C75BC] focus:bg-white transition-all cursor-pointer"
                [(ngModel)]="selectedFormationId"
                (change)="onFormationChange()"
              >
                <option value="">— Sélectionner une formation —</option>
                @for (f of formations; track f.id) {
                  <option [value]="f.id">{{ f.titre }}</option>
                }
              </select>
            </div>

            <!-- 2. Sélection Module -->
            <div>
              <label class="block text-xs font-bold text-[#1B1D1F] uppercase tracking-wider mb-1.5">
                2. Module du programme
              </label>
              <select
                class="w-full px-3 py-2 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs font-medium text-[#1B1D1F] focus:outline-none focus:border-[#1C75BC] focus:bg-white transition-all cursor-pointer disabled:opacity-50"
                [(ngModel)]="selectedModuleId"
                (change)="onModuleChange()"
                [disabled]="!selectedFormationId || loadingModules"
              >
                @if (loadingModules) {
                  <option value="">Chargement des modules...</option>
                } @else if (modules.length === 0) {
                  <option value="">— Aucun module configuré —</option>
                } @else {
                  <option value="">— Choisir un module ({{ modules.length }}) —</option>
                  @for (m of modules; track m.id) {
                    <option [value]="m.id">Module {{ m.ordre }} : {{ m.titre }} (Coeff. {{ m.coefficient || 1 }})</option>
                  }
                }
              </select>
            </div>

            <!-- 3. Sélection Évaluation + Création -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-bold text-[#1B1D1F] uppercase tracking-wider">
                  3. Épreuve / Évaluation
                </label>
                @if (selectedModuleId) {
                  <button
                    type="button"
                    (click)="ouvrirModalNouvelleEval()"
                    class="text-[11px] font-bold text-[#1C75BC] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Nouvelle épreuve</span>
                  </button>
                }
              </div>

              <select
                class="w-full px-3 py-2 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs font-medium text-[#1B1D1F] focus:outline-none focus:border-[#1C75BC] focus:bg-white transition-all cursor-pointer disabled:opacity-50"
                [(ngModel)]="selectedEvaluationId"
                (change)="onEvaluationChange()"
                [disabled]="!selectedModuleId || loadingEvaluations"
              >
                @if (loadingEvaluations) {
                  <option value="">Chargement des évaluations...</option>
                } @else if (evaluations.length === 0) {
                  <option value="">— Aucune évaluation dans ce module —</option>
                } @else {
                  <option value="">— Choisir une épreuve ({{ evaluations.length }}) —</option>
                  @for (e of evaluations; track e.id) {
                    <option [value]="e.id">{{ e.titre }} (sur {{ e.noteMaximale || 20 }})</option>
                  }
                }
              </select>
            </div>

          </div>

          <!-- BANDEAU D'AIDE SI AUCUNE ÉVALUATION N'EST ENCORE CHOISIE -->
          @if (!selectedEvaluationId && selectedModuleId && evaluations.length === 0 && !loadingEvaluations) {
            <div class="p-3.5 bg-[#FDECDD] border border-[#F0791E] rounded-xs flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2.5">
                <span class="text-base">⚠️</span>
                <span class="text-[#1B1D1F]">Ce module ne contient pas encore d'épreuve d'évaluation.</span>
              </div>
              <button
                type="button"
                (click)="ouvrirModalNouvelleEval()"
                class="px-3 py-1.5 bg-[#F0791E] text-white font-bold rounded-xs shadow-2xs hover:bg-[#d96612] cursor-pointer"
              >
                Créer la première épreuve
              </button>
            </div>
          }
        </div>

        <!-- ══════════ KPI DASHBOARD DE LA CLASSE (Si évaluation sélectionnée) ══════════ -->
        @if (selectedEvaluationId && feuilleNotes) {
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">

            <!-- Effectif total -->
            <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
              <span class="text-[10px] uppercase font-bold text-[#4B5157]">Effectif Inscrit</span>
              <p class="text-2xl font-black text-[#1B1D1F] font-mono leading-none mt-1">
                {{ feuilleNotes.kpis.totalInscrits }}
              </p>
              <p class="text-[10px] text-[#71787E] mt-1">Apprenants assignés</p>
            </div>

            <!-- Notes saisies (Complétude) -->
            <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
              <span class="text-[10px] uppercase font-bold text-[#4B5157]">Copies Corrigées</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-2xl font-black font-mono leading-none text-[#1C75BC]">
                  {{ feuilleNotes.kpis.totalNotes }}
                </span>
                <span class="text-xs font-mono text-[#71787E]">/ {{ feuilleNotes.kpis.totalInscrits }}</span>
              </div>
              <div class="w-full bg-[#E5E7EB] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  class="bg-[#1C75BC] h-full transition-all duration-500"
                  [style.width.%]="feuilleNotes.kpis.totalInscrits > 0 ? (feuilleNotes.kpis.totalNotes / feuilleNotes.kpis.totalInscrits) * 100 : 0"
                ></div>
              </div>
            </div>

            <!-- Moyenne de la classe -->
            <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
              <span class="text-[10px] uppercase font-bold text-[#4B5157]">Moyenne Classe</span>
              <p
                class="text-2xl font-black font-mono leading-none mt-1"
                [class]="feuilleNotes.kpis.moyenneClasse >= 10 ? 'text-[#276B44]' : 'text-[#ED1C24]'"
              >
                {{ feuilleNotes.kpis.totalNotes > 0 ? feuilleNotes.kpis.moyenneClasse.toFixed(2) : '—' }} <span class="text-xs font-normal">/20</span>
              </p>
              <p class="text-[10px] text-[#71787E] mt-1">
                {{ feuilleNotes.kpis.moyenneClasse >= 10 ? 'Classe admissible' : 'Sous la moyenne' }}
              </p>
            </div>

            <!-- Taux de réussite -->
            <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
              <span class="text-[10px] uppercase font-bold text-[#4B5157]">Taux de Réussite</span>
              <p
                class="text-2xl font-black font-mono leading-none mt-1"
                [class]="feuilleNotes.kpis.tauxReussite >= 50 ? 'text-[#276B44]' : 'text-[#ED1C24]'"
              >
                {{ feuilleNotes.kpis.totalNotes > 0 ? feuilleNotes.kpis.tauxReussite + '%' : '—' }}
              </p>
              <p class="text-[10px] text-[#71787E] mt-1">Notes ≥ 10 / 20</p>
            </div>

            <!-- Note Min / Max -->
            <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs col-span-2 sm:col-span-1">
              <span class="text-[10px] uppercase font-bold text-[#4B5157]">Écart de Notes</span>
              <div class="flex items-center justify-between mt-1.5">
                <div>
                  <span class="text-[9px] uppercase font-mono text-[#71787E]">Min :</span>
                  <p class="text-sm font-bold font-mono text-[#ED1C24]">
                    {{ feuilleNotes.kpis.noteMin !== null ? feuilleNotes.kpis.noteMin.toFixed(1) : '—' }}
                  </p>
                </div>
                <div class="h-6 w-px bg-[#D7DBDE]"></div>
                <div>
                  <span class="text-[9px] uppercase font-mono text-[#71787E]">Max :</span>
                  <p class="text-sm font-bold font-mono text-[#276B44]">
                    {{ feuilleNotes.kpis.noteMax !== null ? feuilleNotes.kpis.noteMax.toFixed(1) : '—' }}
                  </p>
                </div>
              </div>
            </div>

          </div>

          <!-- ══════════ BARRE DE RECHERCHE ET FILTRES RAPIDES ══════════ -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
            <div class="relative flex-1">
              <svg class="w-4 h-4 text-[#4B5157] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Filtrer par nom, prénom ou matricule apprenant..."
                class="w-full pl-9 pr-8 py-2 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs text-[#1B1D1F] placeholder-[#4B5157] focus:outline-none focus:border-[#1C75BC] focus:bg-white transition-all font-sans"
              />
              @if (searchQuery) {
                <button
                  type="button"
                  (click)="searchQuery = ''"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4B5157] hover:text-[#1B1D1F] text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              }
            </div>

            <!-- Boutons de filtre d'état -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
              <button
                type="button"
                (click)="filterStatus = 'TOUS'"
                class="px-2.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer border"
                [class]="filterStatus === 'TOUS' ? 'bg-[#1C75BC] text-white border-[#1C75BC]' : 'bg-white text-[#4B5157] border-[#D7DBDE] hover:bg-[#F5F6F7]'"
              >
                Tous ({{ lignes.length }})
              </button>
              <button
                type="button"
                (click)="filterStatus = 'NOTES'"
                class="px-2.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer border"
                [class]="filterStatus === 'NOTES' ? 'bg-[#276B44] text-white border-[#276B44]' : 'bg-white text-[#4B5157] border-[#D7DBDE] hover:bg-[#F5F6F7]'"
              >
                Notés ({{ countNotes }})
              </button>
              <button
                type="button"
                (click)="filterStatus = 'EN_ATTENTE'"
                class="px-2.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer border"
                [class]="filterStatus === 'EN_ATTENTE' ? 'bg-[#F0791E] text-white border-[#F0791E]' : 'bg-white text-[#4B5157] border-[#D7DBDE] hover:bg-[#F5F6F7]'"
              >
                En attente ({{ countEnAttente }})
              </button>
              <button
                type="button"
                (click)="filterStatus = 'AJOURNES'"
                class="px-2.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer border"
                [class]="filterStatus === 'AJOURNES' ? 'bg-[#ED1C24] text-white border-[#ED1C24]' : 'bg-white text-[#4B5157] border-[#D7DBDE] hover:bg-[#F5F6F7]'"
              >
                Ajournés < 10 ({{ countAjournes }})
              </button>
            </div>
          </div>

          <!-- ══════════ TABLEAU MATRICIEL DES NOTES (GRADEBOOK) ══════════ -->
          <div class="bg-white border border-[#D7DBDE] rounded-xs shadow-2xs overflow-hidden">
            @if (loadingFeuille) {
              <div class="py-16 text-center space-y-3">
                <div class="w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p class="text-xs font-semibold text-[#4B5157]">Chargement de la feuille de notes officielle...</p>
              </div>
            } @else if (lignesFiltrees.length === 0) {
              <div class="py-16 text-center space-y-2">
                <span class="text-3xl">📋</span>
                <p class="text-sm font-bold text-[#1B1D1F]">Aucun apprenant correspondant</p>
                <p class="text-xs text-[#71787E]">Aucun apprenant ne correspond aux critères de filtre sélectionnés.</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="bg-[#124F80] text-white border-b border-[#0D3B61] text-[11px] font-bold uppercase tracking-wider">
                      <th class="py-3 px-4 w-12 text-center">N°</th>
                      <th class="py-3 px-4">Apprenant</th>
                      <th class="py-3 px-4 w-36 text-center">Note / 20</th>
                      <th class="py-3 px-4 w-32 text-center">Mention</th>
                      <th class="py-3 px-4 w-40">Statut Évaluation</th>
                      <th class="py-3 px-4 w-24 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#D7DBDE]">
                    @for (ligne of lignesFiltrees; track ligne.apprenantId; let idx = $index) {
                      <tr
                        class="hover:bg-[#F5F6F7] transition-colors"
                        [class.bg-[#E7F1FA]]="ligne.isDirty"
                      >
                        <!-- N° séquentiel -->
                        <td class="py-3 px-4 text-center font-mono text-[#71787E]">
                          {{ idx + 1 }}
                        </td>

                        <!-- Apprenant Info -->
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-[#1C75BC] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {{ ligne.prenom.charAt(0) }}{{ ligne.nom.charAt(0) }}
                            </div>
                            <div class="min-w-0">
                              <p class="font-bold text-[#1B1D1F] truncate text-xs">
                                {{ ligne.nom }} {{ ligne.prenom }}
                              </p>
                              <div class="flex items-center gap-2 text-[10px] text-[#4B5157] font-mono">
                                <span>{{ ligne.email }}</span>
                                @if (ligne.matricule) {
                                  <span class="px-1.5 py-0.2 bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] rounded-2xs font-bold">
                                    {{ ligne.matricule }}
                                  </span>
                                }
                              </div>
                            </div>
                          </div>
                        </td>

                        <!-- Note / 20 Input stylisé -->
                        <td class="py-3 px-4 text-center">
                          <div class="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              [(ngModel)]="ligne.currentValeur"
                              (ngModelChange)="onNoteInputChange(ligne)"
                              (keydown.enter)="sauvegarderLigne(ligne)"
                              placeholder="—"
                              class="w-20 px-2.5 py-1.5 text-center font-mono font-bold text-sm rounded-xs border transition-all focus:outline-none focus:ring-1"
                              [class]="getNoteInputClass(ligne)"
                            />
                            <span class="text-xs font-mono text-[#71787E]">/20</span>
                          </div>
                          @if (ligne.errorMsg) {
                            <p class="text-[10px] text-[#ED1C24] font-medium mt-1">{{ ligne.errorMsg }}</p>
                          }
                        </td>

                        <!-- Mention calculée -->
                        <td class="py-3 px-4 text-center">
                          @if (ligne.currentValeur !== null) {
                            <span
                              class="inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold font-mono tracking-wider"
                              [class]="getMentionBadgeClass(ligne.currentValeur)"
                            >
                              {{ getMentionLabel(ligne.currentValeur) }}
                            </span>
                          } @else {
                            <span class="text-[#71787E] text-[11px]">—</span>
                          }
                        </td>

                        <!-- Statut & Date -->
                        <td class="py-3 px-4">
                          @if (ligne.isDirty) {
                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] text-[10px] font-bold">
                              <span class="w-1.5 h-1.5 rounded-full bg-[#1C75BC] animate-ping"></span>
                              Non enregistré
                            </span>
                          } @else if (ligne.valeur !== null) {
                            <div>
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-[#E7F1EA] text-[#276B44] text-[10px] font-bold">
                                <span>✓</span> Noté
                              </span>
                              @if (ligne.dateNotation) {
                                <p class="text-[9px] text-[#71787E] font-mono mt-0.5">
                                  {{ ligne.dateNotation | date:'dd/MM/yyyy HH:mm' }}
                                </p>
                              }
                            </div>
                          } @else {
                            <span class="inline-block px-2 py-0.5 rounded-xs bg-[#F5F6F7] text-[#71787E] border border-[#D7DBDE] text-[10px] font-bold">
                              Non évalué
                            </span>
                          }
                        </td>

                        <!-- Action Rapide (Sauvegarder ligne) -->
                        <td class="py-3 px-4 text-center">
                          <button
                            type="button"
                            (click)="sauvegarderLigne(ligne)"
                            [disabled]="ligne.isSaving || !ligne.isDirty"
                            class="p-1.5 rounded-xs text-xs font-bold transition-all cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed"
                            [class]="ligne.isDirty ? 'bg-[#F0791E] text-white border-[#F0791E] shadow-2xs hover:bg-[#d96612]' : 'bg-white text-[#71787E] border-[#D7DBDE]'"
                            title="Enregistrer la note"
                          >
                            @if (ligne.isSaving) {
                              <span class="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            } @else {
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            }
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

        <!-- ══════════ MODAL CRÉATION NOUVELLE ÉVALUATION ══════════ -->
        @if (showNewEvalModal) {
          <div class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white border-2 border-[#1C75BC] rounded-xs max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up">
              <div class="flex items-start justify-between gap-3 border-b border-[#D7DBDE] pb-4">
                <div>
                  <span class="px-2 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] text-[10px] font-bold uppercase">
                    Nouveau contrôle continu
                  </span>
                  <h3 class="text-base font-bold text-[#1B1D1F] font-heading mt-1">
                    Créer une Épreuve d'Évaluation
                  </h3>
                </div>
                <button
                  type="button"
                  (click)="showNewEvalModal = false"
                  class="w-7 h-7 rounded-xs bg-[#F5F6F7] hover:bg-[#D7DBDE] text-[#1B1D1F] flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div class="space-y-4 text-xs">
                <div>
                  <label class="block font-bold text-[#1B1D1F] mb-1">Intitulé de l'épreuve *</label>
                  <input
                    type="text"
                    [(ngModel)]="newEvalTitre"
                    placeholder="Ex : Examen de fin de module, Contrôle Continu n°2..."
                    class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs font-medium text-[#1B1D1F] focus:border-[#1C75BC] outline-none"
                  />
                </div>

                <div>
                  <label class="block font-bold text-[#1B1D1F] mb-1">Barème de notation (Note maximale) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    [(ngModel)]="newEvalNoteMax"
                    class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs font-mono font-bold text-[#1B1D1F] focus:border-[#1C75BC] outline-none"
                  />
                  <p class="text-[10px] text-[#71787E] mt-1">Standard académique : 20 points.</p>
                </div>
              </div>

              <div class="pt-4 border-t border-[#D7DBDE] flex items-center justify-end gap-2">
                <button
                  type="button"
                  (click)="showNewEvalModal = false"
                  class="px-4 py-2 rounded-xs border border-[#D7DBDE] text-xs font-semibold text-[#4B5157] hover:bg-[#F5F6F7] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  (click)="confirmerCreationEval()"
                  [disabled]="creatingEval || !newEvalTitre.trim()"
                  class="px-5 py-2 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  @if (creatingEval) {
                    <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Création...</span>
                  } @else {
                    <span>Valider & Saisir les notes</span>
                  }
                </button>
              </div>
            </div>
          </div>
        }

      </div>
    </app-main-layout>
  `,
  styles: [`
    @media print {
      body * {
        visibility: hidden !important;
      }
      table, table * {
        visibility: visible !important;
      }
      table {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
    }
  `],
})
export class NotesComponent implements OnInit, OnDestroy {
  // Sélecteurs
  formations: Formation[] = [];
  modules: Module[] = [];
  evaluations: Evaluation[] = [];

  selectedFormationId = '';
  selectedModuleId = '';
  selectedEvaluationId = '';

  // Données de notation
  feuilleNotes: FeuilleNotesResponse | null = null;
  lignes: LigneEditable[] = [];

  // États de chargement
  loadingModules = false;
  loadingEvaluations = false;
  loadingFeuille = false;
  savingBatch = false;

  // Filtres & Recherche
  searchQuery = '';
  filterStatus: FilterStatusType = 'TOUS';

  // Modal Nouvelle Évaluation
  showNewEvalModal = false;
  newEvalTitre = '';
  newEvalNoteMax = 20;
  creatingEval = false;

  private liveSub?: Subscription;

  constructor(
    private pedagogie: PedagogieService,
    private formateurBootstrap: FormateurBootstrapService,
    private notifications: NotificationsService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    // 1. Hydratation immédiate depuis le cache bootstrap
    const cachedBootstrap = this.formateurBootstrap.bootstrap$.value;
    if (cachedBootstrap?.formations?.length) {
      this.formations = cachedBootstrap.formations;
      this.autoSelectFirstFormation();
    } else {
      this.formateurBootstrap.formations$.subscribe((f) => {
        if (f && f.length > 0 && this.formations.length === 0) {
          this.formations = f;
          this.autoSelectFirstFormation();
        }
      });
      this.pedagogie.getFormations().subscribe({
        next: (f) => {
          this.formations = f;
          this.autoSelectFirstFormation();
        },
      });
    }

    // 2. Écoute des notifications SSE temps réel pour recharger automatiquement la feuille avec anti-rebond
    this.liveSub = this.notifications.messages().pipe(
      filter((evt: NotificationPayload) => {
        if (!evt) return false;
        if (evt.type === 'FORMATION_UPDATE') return true;
        if (evt.type === 'DEVOIR_NOTE' || evt.type === 'NOTE_PUBLIEE') {
          // Si l'événement cible une évaluation précise et différente de celle actuellement sélectionnée, ignorer
          const eventEvalId = evt.data ? (evt.data as any)['evaluationId'] : null;
          if (eventEvalId && this.selectedEvaluationId && eventEvalId !== this.selectedEvaluationId) {
            return false;
          }
          return true;
        }
        return false;
      }),
      debounceTime(400),
    ).subscribe(() => {
      // Éviter d'écraser la saisie en direct si le formateur a des modifications non enregistrées
      const hasUnsavedChanges = this.lignes.some((l) => l.isDirty);
      if (this.selectedEvaluationId && !this.savingBatch && !hasUnsavedChanges) {
        this.chargerFeuilleNotes(true);
      }
    });
  }

  ngOnDestroy() {
    this.liveSub?.unsubscribe();
  }

  private autoSelectFirstFormation() {
    if (!this.selectedFormationId && this.formations.length > 0) {
      this.selectedFormationId = this.formations[0].id;
      this.onFormationChange();
    }
  }

  onFormationChange() {
    this.modules = [];
    this.evaluations = [];
    this.selectedModuleId = '';
    this.selectedEvaluationId = '';
    this.feuilleNotes = null;
    this.lignes = [];

    if (!this.selectedFormationId) return;

    // Résolution immédiate en mémoire si les modules sont déjà disponibles (0ms)
    const currentFormation = this.formations.find((f) => f.id === this.selectedFormationId);
    if (currentFormation?.modules && currentFormation.modules.length > 0) {
      this.modules = [...currentFormation.modules].sort((a, b) => a.ordre - b.ordre);
      if (this.modules.length > 0) {
        this.selectedModuleId = this.modules[0].id;
        this.onModuleChange();
        return;
      }
    }

    this.loadingModules = true;
    this.pedagogie.getFormation(this.selectedFormationId).subscribe({
      next: (f) => {
        this.loadingModules = false;
        this.modules = f.modules ? [...f.modules].sort((a, b) => a.ordre - b.ordre) : [];
        if (this.modules.length > 0) {
          this.selectedModuleId = this.modules[0].id;
          this.onModuleChange();
        }
      },
      error: () => {
        this.loadingModules = false;
        this.toast.error('Erreur lors du chargement des modules de la formation.');
      },
    });
  }

  onModuleChange() {
    this.evaluations = [];
    this.selectedEvaluationId = '';
    this.feuilleNotes = null;
    this.lignes = [];

    if (!this.selectedModuleId) return;

    // Résolution immédiate en mémoire si les évaluations sont déjà préchargées (0ms)
    const currentModule = this.modules.find((m) => m.id === this.selectedModuleId);
    if (currentModule?.evaluations && currentModule.evaluations.length > 0) {
      this.evaluations = currentModule.evaluations;
      this.selectedEvaluationId = this.evaluations[0].id;
      this.onEvaluationChange();
      return;
    }

    this.loadingEvaluations = true;
    this.pedagogie.getEvaluations(this.selectedModuleId).subscribe({
      next: (ev) => {
        this.loadingEvaluations = false;
        this.evaluations = ev;
        if (this.evaluations.length > 0) {
          this.selectedEvaluationId = this.evaluations[0].id;
          this.onEvaluationChange();
        }
      },
      error: () => {
        this.loadingEvaluations = false;
        this.toast.error('Erreur lors du chargement des évaluations.');
      },
    });
  }

  onEvaluationChange() {
    if (!this.selectedEvaluationId) {
      this.feuilleNotes = null;
      this.lignes = [];
      return;
    }
    this.chargerFeuilleNotes();
  }

  chargerFeuilleNotes(silent = false) {
    if (!silent) this.loadingFeuille = true;
    this.pedagogie.getFeuilleNotes(this.selectedEvaluationId).subscribe({
      next: (data) => {
        this.loadingFeuille = false;
        this.feuilleNotes = data;
        this.lignes = data.lignes.map((l) => ({
          ...l,
          originalValeur: l.valeur,
          currentValeur: l.valeur,
          isDirty: false,
          isSaving: false,
        }));
      },
      error: (err) => {
        this.loadingFeuille = false;
        this.toast.error(err.error?.message || 'Erreur lors du chargement de la feuille de notes.');
      },
    });
  }

  onNoteInputChange(ligne: LigneEditable) {
    ligne.errorMsg = undefined;
    if (ligne.currentValeur === null || isNaN(ligne.currentValeur)) {
      ligne.isDirty = ligne.originalValeur !== null;
      return;
    }

    if (ligne.currentValeur < 0 || ligne.currentValeur > 20) {
      ligne.errorMsg = 'Note entre 0 et 20';
      ligne.isDirty = false;
      return;
    }

    ligne.isDirty = ligne.currentValeur !== ligne.originalValeur;
  }

  getNoteInputClass(ligne: LigneEditable): string {
    if (ligne.errorMsg) return 'border-[#ED1C24] bg-[#FDE8E8] text-[#ED1C24]';
    if (ligne.isDirty) return 'border-[#1C75BC] bg-[#E7F1FA] text-[#1C75BC]';
    if (ligne.currentValeur === null || isNaN(ligne.currentValeur)) return 'border-[#D7DBDE] bg-[#F5F6F7] text-[#71787E]';
    if (ligne.currentValeur >= 10) return 'border-[#276B44] bg-[#E7F1EA] text-[#276B44]';
    return 'border-[#ED1C24] bg-[#FDE8E8] text-[#ED1C24]';
  }

  getMentionLabel(note: number): string {
    if (note >= 16) return 'Très Bien';
    if (note >= 14) return 'Bien';
    if (note >= 12) return 'Assez Bien';
    if (note >= 10) return 'Passable';
    return 'Ajourné';
  }

  getMentionBadgeClass(note: number): string {
    if (note >= 16) return 'bg-[#1A4731] text-white border border-[#276B44]';
    if (note >= 14) return 'bg-[#E7F1EA] text-[#276B44] border border-[#276B44]';
    if (note >= 12) return 'bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]';
    if (note >= 10) return 'bg-[#FDECDD] text-[#F0791E] border border-[#F0791E]';
    return 'bg-[#FDE8E8] text-[#ED1C24] border border-[#ED1C24]';
  }

  sauvegarderLigne(ligne: LigneEditable) {
    if (!ligne.isDirty || ligne.currentValeur === null || isNaN(ligne.currentValeur) || ligne.errorMsg) {
      return;
    }

    ligne.isSaving = true;
    this.pedagogie.submitNote(this.selectedEvaluationId, ligne.apprenantId, ligne.currentValeur).subscribe({
      next: () => {
        ligne.isSaving = false;
        ligne.originalValeur = ligne.currentValeur;
        ligne.valeur = ligne.currentValeur;
        ligne.statut = 'NOTE';
        ligne.isDirty = false;
        ligne.dateNotation = new Date().toISOString();
        this.toast.success(`Note de ${ligne.prenom} ${ligne.nom} enregistrée (${ligne.currentValeur}/20).`);
        this.recalculerKpisLocaux();
      },
      error: (e) => {
        ligne.isSaving = false;
        this.toast.error(e.error?.message || 'Erreur lors de l\'enregistrement de la note.');
      },
    });
  }

  enregistrerTout() {
    const aEnregistrer = this.lignes
      .filter((l) => l.isDirty && l.currentValeur !== null && !isNaN(l.currentValeur) && !l.errorMsg)
      .map((l) => ({ utilisateurId: l.apprenantId, valeur: l.currentValeur as number }));

    if (aEnregistrer.length === 0) {
      this.toast.info('Aucune modification en attente.');
      return;
    }

    this.savingBatch = true;
    this.pedagogie.submitNotesBatch(this.selectedEvaluationId, aEnregistrer).subscribe({
      next: (res) => {
        this.savingBatch = false;
        this.lignes.forEach((l) => {
          if (l.isDirty && l.currentValeur !== null && !l.errorMsg) {
            l.originalValeur = l.currentValeur;
            l.valeur = l.currentValeur;
            l.statut = 'NOTE';
            l.isDirty = false;
            l.dateNotation = new Date().toISOString();
          }
        });
        this.toast.success(res.message || `${aEnregistrer.length} note(s) enregistrée(s) avec succès !`);
        this.recalculerKpisLocaux();
      },
      error: (e) => {
        this.savingBatch = false;
        this.toast.error(e.error?.message || 'Erreur lors de l\'enregistrement groupé des notes.');
      },
    });
  }

  private recalculerKpisLocaux() {
    if (!this.feuilleNotes) return;
    const notes = this.lignes.filter((l) => l.valeur !== null).map((l) => l.valeur as number);
    this.feuilleNotes.kpis.totalNotes = notes.length;
    this.feuilleNotes.kpis.totalInscrits = this.lignes.length;
    if (notes.length > 0) {
      const sum = notes.reduce((acc, v) => acc + v, 0);
      this.feuilleNotes.kpis.moyenneClasse = Math.round((sum / notes.length) * 100) / 100;
      this.feuilleNotes.kpis.noteMin = Math.min(...notes);
      this.feuilleNotes.kpis.noteMax = Math.max(...notes);
      this.feuilleNotes.kpis.tauxReussite = Math.round((notes.filter((v) => v >= 10).length / notes.length) * 100);
    } else {
      this.feuilleNotes.kpis.moyenneClasse = 0;
      this.feuilleNotes.kpis.noteMin = null;
      this.feuilleNotes.kpis.noteMax = null;
      this.feuilleNotes.kpis.tauxReussite = 0;
    }
  }

  // --- FILTRES COMPUTED ---
  get lignesFiltrees(): LigneEditable[] {
    let list = this.lignes;

    // Filtre d'état
    if (this.filterStatus === 'NOTES') {
      list = list.filter((l) => l.valeur !== null);
    } else if (this.filterStatus === 'EN_ATTENTE') {
      list = list.filter((l) => l.valeur === null);
    } else if (this.filterStatus === 'AJOURNES') {
      list = list.filter((l) => l.valeur !== null && l.valeur < 10);
    }

    // Filtre recherche textuelle
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter((l) =>
        l.nom.toLowerCase().includes(q) ||
        l.prenom.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.matricule && l.matricule.toLowerCase().includes(q))
      );
    }

    return list;
  }

  get modifiedCount(): number {
    return this.lignes.filter((l) => l.isDirty && l.currentValeur !== null && !l.errorMsg).length;
  }

  get countNotes(): number {
    return this.lignes.filter((l) => l.valeur !== null).length;
  }

  get countEnAttente(): number {
    return this.lignes.filter((l) => l.valeur === null).length;
  }

  get countAjournes(): number {
    return this.lignes.filter((l) => l.valeur !== null && l.valeur < 10).length;
  }

  // --- NOUVELLE ÉVALUATION MODAL ---
  ouvrirModalNouvelleEval() {
    this.newEvalTitre = '';
    this.newEvalNoteMax = 20;
    this.showNewEvalModal = true;
  }

  confirmerCreationEval() {
    if (!this.selectedModuleId || !this.newEvalTitre.trim()) return;

    this.creatingEval = true;
    this.pedagogie.createEvaluation(this.selectedModuleId, {
      titre: this.newEvalTitre.trim(),
      noteMaximale: Number(this.newEvalNoteMax) || 20,
    }).subscribe({
      next: (evalCreee) => {
        this.creatingEval = false;
        this.showNewEvalModal = false;
        this.toast.success(`Épreuve « ${evalCreee.titre} » créée avec succès !`);
        this.evaluations.push(evalCreee);
        const curMod = this.modules.find((m) => m.id === this.selectedModuleId);
        if (curMod) {
          curMod.evaluations = curMod.evaluations ? [...curMod.evaluations, evalCreee] : [evalCreee];
        }
        this.selectedEvaluationId = evalCreee.id;
        this.onEvaluationChange();
      },
      error: (e) => {
        this.creatingEval = false;
        this.toast.error(e.error?.message || 'Erreur lors de la création de l\'évaluation.');
      },
    });
  }

  // --- EXPORT CSV ---
  exporterCsv() {
    if (!this.feuilleNotes || this.lignes.length === 0) return;

    const evalTitre = this.feuilleNotes.evaluation.titre;
    const formationTitre = this.feuilleNotes.evaluation.formationTitre;
    const headers = ['N°', 'Matricule', 'Nom', 'Prenom', 'Email', 'Note_Sur_20', 'Mention', 'Statut', 'Date_Notation', 'Formateur'];
    
    const rows = this.lignes.map((l, idx) => [
      idx + 1,
      l.matricule || 'N/A',
      `"${l.nom}"`,
      `"${l.prenom}"`,
      l.email,
      l.valeur !== null ? l.valeur : 'Non evalue',
      l.valeur !== null ? this.getMentionLabel(l.valeur) : 'N/A',
      l.statut,
      l.dateNotation ? new Date(l.dateNotation).toLocaleString('fr-FR') : 'N/A',
      l.formateurNom ? `"${l.formateurNom}"` : 'N/A',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Releve_Notes_${evalTitre.replace(/[^a-z0-9]/gi, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.toast.success('Fichier CSV généré et téléchargé.');
  }

  // --- IMPRESSION PV ---
  imprimerPv() {
    window.print();
  }
}
