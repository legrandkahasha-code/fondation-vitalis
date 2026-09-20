import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ApprenantService, ApprenantQuizItem } from '../../../../core/services/apprenant.service';
import { DevoirsService } from '../../../../core/services/devoirs.service';
import { ToastService } from '../../../../core/services/toast.service';

interface DevoirItem {
  id: string;
  titre: string;
  consignes: string | null;
  dateLimite: string | null;
  moduleTitre: string;
  formationTitre: string;
  soumission: {
    id: string;
    fileUrl: string;
    note: number | null;
    commentaire: string | null;
    dateDepot: string;
  } | null;
}

type DevoirFilterStatus = 'TOUS' | 'A_RENDRE' | 'DEPOSES' | 'NOTES';
type EvaluationTab = 'DEVOIRS' | 'QUIZ';

@Component({
  selector: 'app-depot-devoir',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6 sm:space-y-8 animate-fade-in pb-12 min-w-0">
      <!-- HEADER OFFICIEL VITALIS CENTER -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[#1B1D1F] font-heading">Centre des Évaluations & Contrôle Continu</h1>
          <div class="barre"></div>
          <p class="text-xs text-[#4B5157] mt-2">
            Espace pédagogique officiel : travaux pratiques encadrés par le corps professoral et quiz de validation des connaissances.
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <span class="inline-flex items-center rounded-xs bg-[#E7F1EA] px-2.5 py-1 text-xs font-semibold text-[#276B44] border border-[#276B44] shadow-2xs">
            <span class="mr-1.5 inline-block h-2 w-2 rounded-xs bg-[#276B44] animate-pulse"></span>
            Synchronisation SSE active
          </span>
          <span class="text-xs font-bold text-[#1B1D1F] bg-white border border-[#D7DBDE] px-3 py-1 rounded-xs shadow-2xs font-mono">
            {{ activeTab === 'DEVOIRS' ? devoirs.length + ' devoir(s)' : quizList.length + ' quiz' }}
          </span>
        </div>
      </div>

      <!-- ONGLETS DE NAVIGATION : DEVOIRS / QUIZ -->
      <div class="flex items-center gap-2 border-b border-[#D7DBDE] overflow-x-auto whitespace-nowrap pb-0.5">
        <button
          type="button"
          (click)="switchTab('DEVOIRS')"
          class="px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0"
          [class]="activeTab === 'DEVOIRS' ? 'border-[#1C75BC] text-[#1C75BC]' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Devoirs & Travaux Pratiques</span>
          <span
            class="px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-bold"
            [class]="kpiARendre > 0 ? 'bg-[#FDECDD] text-[#F0791E] border border-[#F0791E]' : 'bg-[#F5F6F7] text-[#4B5157] border border-[#D7DBDE]'"
          >
            {{ devoirs.length }}
          </span>
        </button>

        <button
          type="button"
          (click)="switchTab('QUIZ')"
          class="px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0"
          [class]="activeTab === 'QUIZ' ? 'border-[#1C75BC] text-[#1C75BC]' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Quiz & Évaluations en ligne</span>
          <span
            class="px-1.5 py-0.5 rounded-xs text-[10px] font-mono font-bold"
            [class]="kpiQuizAPasser > 0 ? 'bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]' : 'bg-[#F5F6F7] text-[#4B5157] border border-[#D7DBDE]'"
          >
            {{ quizList.length }}
          </span>
        </button>
      </div>

      <!-- ─── CONTENU ONGLETS ────────────────────────────────────────────── -->
      @if (activeTab === 'DEVOIRS') {
        <div class="space-y-6 sm:space-y-8 animate-fade-in">
        <!-- BANDEAU DE 4 KPIS INTERACTIFS (FILTRES EN 1 CLIC CONFORMES À LA CHARTE) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <!-- 1. TOUS -->
        <button
          type="button"
          (click)="setFilter('TOUS')"
          class="p-3.5 sm:p-4 rounded-xs border text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
          [class]="filterStatus === 'TOUS' ? 'bg-[#E7F1FA] border-[#1C75BC] border-l-4 border-l-[#1C75BC]' : 'bg-white border-[#D7DBDE] hover:border-[#1C75BC] hover:bg-[#F5F6F7]'"
        >
          <div class="flex items-center justify-between text-xs text-[#4B5157] font-semibold">
            <span>Tous les devoirs</span>
            <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-2xl font-black text-[#1B1D1F] font-mono">{{ kpiTotal }}</span>
            <span class="text-[11px] text-[#71787E] uppercase font-bold tracking-wider">Totalité</span>
          </div>
        </button>

        <!-- 2. À RENDRE -->
        <button
          type="button"
          (click)="setFilter('A_RENDRE')"
          class="p-3.5 sm:p-4 rounded-xs border text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
          [class]="filterStatus === 'A_RENDRE' ? 'bg-[#FDECDD] border-[#F0791E] border-l-4 border-l-[#F0791E]' : 'bg-white border-[#D7DBDE] hover:border-[#F0791E] hover:bg-[#F5F6F7]'"
        >
          <div class="flex items-center justify-between text-xs font-semibold" [class]="kpiARendre > 0 ? 'text-[#F0791E]' : 'text-[#4B5157]'">
            <span>À rendre</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#FDECDD] text-[#F0791E] border border-[#F0791E] font-bold uppercase tracking-wider">Action</span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-2xl font-black font-mono" [class]="kpiARendre > 0 ? 'text-[#F0791E]' : 'text-[#1B1D1F]'">{{ kpiARendre }}</span>
            <span class="text-[11px] text-[#71787E] uppercase font-bold tracking-wider">En attente</span>
          </div>
        </button>

        <!-- 3. DÉPOSÉS / EN EXAMEN -->
        <button
          type="button"
          (click)="setFilter('DEPOSES')"
          class="p-3.5 sm:p-4 rounded-xs border text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
          [class]="filterStatus === 'DEPOSES' ? 'bg-[#E7F1FA] border-[#1C75BC] border-l-4 border-l-[#1C75BC]' : 'bg-white border-[#D7DBDE] hover:border-[#1C75BC] hover:bg-[#F5F6F7]'"
        >
          <div class="flex items-center justify-between text-xs text-[#1C75BC] font-semibold">
            <span>En correction</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] font-bold uppercase tracking-wider">Déposés</span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-2xl font-black text-[#1C75BC] font-mono">{{ kpiDeposes }}</span>
            <span class="text-[11px] text-[#71787E] uppercase font-bold tracking-wider">Évaluation</span>
          </div>
        </button>

        <!-- 4. NOTÉS & VALIDÉS -->
        <button
          type="button"
          (click)="setFilter('NOTES')"
          class="p-3.5 sm:p-4 rounded-xs border text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
          [class]="filterStatus === 'NOTES' ? 'bg-[#E7F1EA] border-[#276B44] border-l-4 border-l-[#276B44]' : 'bg-white border-[#D7DBDE] hover:border-[#276B44] hover:bg-[#F5F6F7]'"
        >
          <div class="flex items-center justify-between text-xs text-[#276B44] font-semibold">
            <span>Corrigés & Notés</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#E7F1EA] text-[#276B44] border border-[#276B44] font-bold font-mono">
              {{ moyenneGenerale !== null ? moyenneGenerale + '/20' : 'Évalué' }}
            </span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-2xl font-black text-[#276B44] font-mono">{{ kpiNotes }}</span>
            <span class="text-[11px] text-[#71787E] uppercase font-bold tracking-wider">Terminés</span>
          </div>
        </button>
      </div>

      <!-- ÉTAT DE CHARGEMENT -->
      @if (loading) {
        <div class="p-16 text-center text-[#4B5157] bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
          <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-xs animate-spin mb-3"></div>
          <p class="text-xs font-semibold text-[#4B5157]">Chargement des données académiques...</p>
        </div>
      } @else if (devoirs.length === 0) {
        <div class="p-12 text-center bg-white border border-[#D7DBDE] rounded-xs text-[#4B5157] space-y-3 shadow-2xs">
          <div class="w-12 h-12 mx-auto rounded-xs bg-[#F5F6F7] flex items-center justify-center border border-[#D7DBDE]">
            <svg class="w-6 h-6 text-[#9AA1A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-[#1B1D1F]">Aucun devoir assigné</h3>
          <p class="text-xs text-[#4B5157]">Vous n'avez aucun travail pratique en attente actuellement sur vos formations actives.</p>
        </div>
      } @else {
        <!-- BARRE D'OUTILS : RECHERCHE & COMPTEUR -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
          <div class="relative flex-1 max-w-md">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71787E]">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Rechercher par titre de devoir, module ou formation..."
              class="w-full pl-9 pr-8 py-2 text-xs bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-[#1B1D1F] focus:border-[#1C75BC] focus:bg-white focus:outline-none transition-all font-sans"
            />
            @if (searchQuery) {
              <button
                type="button"
                (click)="searchQuery = ''"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71787E] hover:text-[#1B1D1F] cursor-pointer text-xs"
              >
                ✕
              </button>
            }
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto text-xs text-[#4B5157]">
            <span class="font-bold text-[#1B1D1F] font-mono">{{ filteredDevoirs.length }}</span>
            <span>résultat{{ filteredDevoirs.length === 1 ? '' : 's' }}</span>
            @if (filterStatus !== 'TOUS' || searchQuery) {
              <button
                type="button"
                (click)="resetFilters()"
                class="text-[11px] text-[#1C75BC] hover:underline font-semibold cursor-pointer ml-1"
              >
                (Réinitialiser)
              </button>
            }
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          <!-- GAUCHE : LISTE DES DEVOIRS (1 col) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between pb-1 border-b border-[#D7DBDE]">
              <h2 class="text-xs font-bold text-[#4B5157] uppercase tracking-wider">
                Liste des devoirs
              </h2>
              <span class="text-[11px] text-[#71787E] font-medium">
                {{ currentDevoirIndex + 1 }} / {{ filteredDevoirs.length }} sélectionné
              </span>
            </div>

            <!-- Si aucun résultat filtré -->
            @if (filteredDevoirs.length === 0) {
              <div class="p-6 bg-white border border-[#D7DBDE] rounded-xs text-center text-xs text-[#4B5157] space-y-2">
                <p class="font-medium">Aucun devoir ne correspond à ce filtre.</p>
                <button
                  type="button"
                  (click)="resetFilters()"
                  class="text-xs text-[#1C75BC] font-bold hover:underline cursor-pointer"
                >
                  Afficher tous les devoirs
                </button>
              </div>
            }

            <div class="max-h-[340px] sm:max-h-[420px] lg:max-h-[640px] overflow-y-auto space-y-2.5 pr-1">
              @for (d of filteredDevoirs; track d.id; let i = $index) {
                <button
                  type="button"
                  (click)="selectDevoir(d, true)"
                  class="w-full text-left p-3.5 sm:p-4 border transition-all rounded-xs shadow-2xs relative cursor-pointer block group focus:outline-none focus:ring-2 focus:ring-[#1C75BC]"
                  [class]="selectedDevoir?.id === d.id ? 'bg-[#E7F1FA] border-[#1C75BC] border-l-4 border-l-[#F0791E]' : 'bg-white border-[#D7DBDE] hover:bg-[#F5F6F7] hover:border-[#1C75BC]'"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider shrink-0"
                          [class]="d.soumission?.note !== null && d.soumission?.note !== undefined ? 'bg-[#E7F1EA] text-[#276B44] border border-[#276B44]' : d.soumission ? 'bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]' : isOverdue(d.dateLimite) ? 'bg-[#FDE6E6] text-[#ED1C24] border border-[#ED1C24]' : 'bg-[#FDECDD] text-[#F0791E] border border-[#F0791E]'">
                      {{ d.soumission?.note !== null && d.soumission?.note !== undefined ? 'Noté : ' + d.soumission?.note + '/20' : d.soumission ? 'Déposé' : isOverdue(d.dateLimite) ? 'En retard' : 'À rendre' }}
                    </span>
                    <span class="text-[10px] text-[#4B5157] font-mono shrink-0" [title]="d.dateLimite ? 'Date limite : ' + (d.dateLimite | date:'dd/MM/yyyy HH:mm') : ''">
                      {{ getTimeRemaining(d.dateLimite) }}
                    </span>
                  </div>

                  <h3 class="text-xs font-bold text-[#1B1D1F] mt-2 line-clamp-1 group-hover:text-[#1C75BC] transition-colors">{{ d.titre }}</h3>
                  <p class="text-[11px] text-[#4B5157] mt-0.5 truncate">{{ d.formationTitre }} · {{ d.moduleTitre }}</p>

                  <div class="mt-2.5 pt-2 border-t border-[#D7DBDE]/60 flex items-center justify-between text-[11px]">
                    <span class="font-medium" [class]="selectedDevoir?.id === d.id ? 'text-[#F0791E] font-bold' : 'text-[#71787E]'">
                      {{ selectedDevoir?.id === d.id ? '● En consultation' : 'Devoir #' + (i + 1) }}
                    </span>
                    <span class="text-[#1C75BC] font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                      {{ selectedDevoir?.id === d.id ? 'Affiché' : 'Consulter' }} →
                    </span>
                  </div>
                </button>
              }
            </div>
          </div>

          <!-- DROITE : FICHE DÉTAILLÉE DU DEVOIR & ZONE DE DÉPÔT (2 cols) -->
          <div id="devoirDetailPanel" class="lg:col-span-2">
            @if (selectedDevoir) {
              <div class="p-4 sm:p-6 md:p-8 bg-white border border-[#D7DBDE] rounded-xs space-y-6 animate-fade-in shadow-xs">
                <!-- BANDEAU DE NAVIGATION RAPIDE ENTRE DEVOIRS -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#D7DBDE]">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2.5 py-0.5 rounded-xs bg-[#1C75BC] text-white text-[10px] font-bold uppercase tracking-wider">
                      Devoir {{ currentDevoirIndex + 1 }} sur {{ filteredDevoirs.length }}
                    </span>
                    <span class="text-xs text-[#1B1D1F] font-semibold">{{ selectedDevoir.formationTitre }}</span>
                    <span class="text-[#D7DBDE]">·</span>
                    <span class="text-xs text-[#4B5157]">{{ selectedDevoir.moduleTitre }}</span>
                  </div>

                  <!-- Boutons Précédent / Suivant -->
                  <div class="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      (click)="selectPrevious()"
                      [disabled]="currentDevoirIndex <= 0"
                      class="px-2.5 py-1 text-xs font-semibold rounded-xs border border-[#D7DBDE] bg-[#F5F6F7] hover:bg-[#E7F1FA] text-[#1B1D1F] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Devoir précédent"
                    >
                      ← Précédent
                    </button>
                    <button
                      type="button"
                      (click)="selectNext()"
                      [disabled]="currentDevoirIndex >= filteredDevoirs.length - 1"
                      class="px-2.5 py-1 text-xs font-semibold rounded-xs border border-[#D7DBDE] bg-[#F5F6F7] hover:bg-[#E7F1FA] text-[#1B1D1F] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Devoir suivant"
                    >
                      Suivant →
                    </button>
                  </div>
                </div>

                <!-- STEPPER DU CYCLE DE VIE DU DEVOIR (WORKFLOW 4 ÉTAPES CHARTE VITALIS) -->
                <div class="p-3 sm:p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs">
                  <div class="text-[10px] font-bold text-[#4B5157] uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Avancement de l'évaluation</span>
                    <span class="font-mono text-[#71787E]">Réf : DEV-{{ selectedDevoir.id.slice(0, 8) }}</span>
                  </div>
                  <div class="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <!-- Étape 1 : Assigné -->
                    <div class="space-y-1">
                      <div class="h-1.5 rounded-xs bg-[#276B44]"></div>
                      <span class="font-bold text-[#276B44]">1. Assigné</span>
                    </div>

                    <!-- Étape 2 : Déposé -->
                    <div class="space-y-1">
                      <div class="h-1.5 rounded-xs" [class]="selectedDevoir.soumission ? 'bg-[#276B44]' : 'bg-[#D7DBDE]'"></div>
                      <span class="font-medium" [class]="selectedDevoir.soumission ? 'font-bold text-[#276B44]' : 'text-[#71787E]'">
                        {{ selectedDevoir.soumission ? '2. Déposé' : '2. Dépôt' }}
                      </span>
                    </div>

                    <!-- Étape 3 : En correction -->
                    <div class="space-y-1">
                      <div class="h-1.5 rounded-xs" [class]="selectedDevoir.soumission ? (selectedDevoir.soumission.note !== null ? 'bg-[#276B44]' : 'bg-[#1C75BC] animate-pulse') : 'bg-[#D7DBDE]'"></div>
                      <span class="font-medium" [class]="selectedDevoir.soumission ? (selectedDevoir.soumission.note !== null ? 'font-bold text-[#276B44]' : 'font-bold text-[#1C75BC]') : 'text-[#71787E]'">
                        {{ selectedDevoir.soumission?.note !== null ? '3. Examiné' : '3. Correction' }}
                      </span>
                    </div>

                    <!-- Étape 4 : Noté -->
                    <div class="space-y-1">
                      <div class="h-1.5 rounded-xs" [class]="selectedDevoir.soumission?.note !== null ? 'bg-[#276B44]' : 'bg-[#D7DBDE]'"></div>
                      <span class="font-medium" [class]="selectedDevoir.soumission?.note !== null ? 'font-bold text-[#276B44]' : 'text-[#71787E]'">
                        {{ selectedDevoir.soumission?.note !== null ? '4. Noté' : '4. Note finale' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- EN-TÊTE DU DEVOIR SÉLECTIONNÉ -->
                <div class="space-y-2">
                  <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <h2 class="text-xl sm:text-2xl font-bold text-[#1B1D1F] leading-snug">{{ selectedDevoir.titre }}</h2>
                    <span class="rounded-xs px-3 py-1 text-xs font-bold shrink-0 self-start border font-mono"
                          [class]="selectedDevoir.soumission?.note !== null ? 'bg-[#E7F1EA] text-[#276B44] border-[#276B44]' : selectedDevoir.soumission ? 'bg-[#E7F1FA] text-[#1C75BC] border-[#1C75BC]' : isOverdue(selectedDevoir.dateLimite) ? 'bg-[#FDE6E6] text-[#ED1C24] border-[#ED1C24]' : 'bg-[#FDECDD] text-[#F0791E] border-[#F0791E]'">
                      {{ selectedDevoir.soumission?.note !== null ? 'CORRIGÉ' : selectedDevoir.soumission ? 'SOUMIS · EN ATTENTE' : isOverdue(selectedDevoir.dateLimite) ? 'HORS DÉLAI' : 'À SOUMETTRE' }}
                    </span>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-[#4B5157] flex-wrap">
                    <span class="flex items-center gap-1.5 font-medium">
                      <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Date limite : <strong>{{ selectedDevoir.dateLimite ? (selectedDevoir.dateLimite | date:'dd MMMM yyyy à HH:mm') : 'Illimitée' }}</strong></span>
                    </span>
                    <span class="px-2 py-0.5 rounded-xs text-[11px] font-semibold"
                          [class]="isOverdue(selectedDevoir.dateLimite) ? 'bg-[#FDE6E6] text-[#ED1C24] border border-[#ED1C24]' : 'bg-[#F5F6F7] text-[#4B5157] border border-[#D7DBDE]'">
                      {{ getTimeRemaining(selectedDevoir.dateLimite) }}
                    </span>
                  </div>
                </div>

                <!-- CONSIGNES OFFICIELLES -->
                <div class="space-y-2">
                  <h4 class="text-xs font-bold text-[#4B5157] uppercase tracking-wider flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Consignes et Objectifs Pédagogiques</span>
                  </h4>
                  <div class="p-4 sm:p-5 bg-white border border-[#D7DBDE] rounded-xs text-xs text-[#1B1D1F] leading-relaxed whitespace-pre-line shadow-2xs">
                    {{ selectedDevoir.consignes || 'Veuillez réaliser le travail demandé par votre formateur et soumettre votre fichier numérique ci-dessous.' }}
                  </div>
                </div>

                <!-- SECTION RETOUR FORMATEUR & NOTE ATTRIBUÉE (SI NOTÉ) -->
                @if (selectedDevoir.soumission && selectedDevoir.soumission.note !== null) {
                  <div class="p-5 sm:p-6 rounded-xs bg-[#E7F1EA] border border-[#276B44] border-l-4 border-l-[#276B44] space-y-4 shadow-xs">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <!-- Cartouche de note institutionnel -->
                      <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-xs bg-white text-[#276B44] border-2 border-[#276B44] flex flex-col items-center justify-center font-mono shadow-2xs shrink-0">
                          <span class="text-xl font-black leading-none">{{ selectedDevoir.soumission.note }}</span>
                          <span class="text-[10px] text-[#4B5157] font-sans font-bold mt-0.5">/ 20</span>
                        </div>
                        <div>
                          <span class="inline-block px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#276B44] text-white uppercase tracking-wider">
                            Mention : {{ getMention(selectedDevoir.soumission.note) }}
                          </span>
                          <h4 class="text-sm font-bold text-[#1B1D1F] mt-1">Évaluation Validée</h4>
                          <p class="text-[11px] text-[#4B5157]">Enregistrée le {{ selectedDevoir.soumission.dateDepot | date:'dd/MM/yyyy à HH:mm' }}</p>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                        <button
                          type="button"
                          (click)="openFilePreview(selectedDevoir.soumission.fileUrl, selectedDevoir.titre)"
                          class="px-3.5 py-2 bg-[#276B44] text-white hover:bg-[#1e5435] rounded-xs text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Aperçu intégré</span>
                        </button>
                        <a
                          [href]="selectedDevoir.soumission.fileUrl"
                          target="_blank"
                          class="px-3.5 py-2 bg-white hover:bg-[#F5F6F7] border border-[#276B44] rounded-xs text-xs font-bold text-[#276B44] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <svg class="w-3.5 h-3.5 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Télécharger</span>
                        </a>
                      </div>
                    </div>

                    <!-- Remarque du formateur -->
                    @if (selectedDevoir.soumission.commentaire) {
                      <div class="p-3.5 bg-white rounded-xs border border-[#276B44]/40 shadow-2xs text-xs space-y-1">
                        <span class="text-[10px] font-bold text-[#71787E] uppercase tracking-wider block">
                          Appréciation pédagogique :
                        </span>
                        <p class="italic text-[#1B1D1F] font-medium whitespace-pre-line leading-relaxed">
                          « {{ selectedDevoir.soumission.commentaire }} »
                        </p>
                      </div>
                    }
                  </div>
                }

                <!-- ÉTAT : DÉPOSÉ MAIS EN ATTENTE DE CORRECTION -->
                @if (selectedDevoir.soumission && selectedDevoir.soumission.note === null) {
                  <div class="p-4 sm:p-5 rounded-xs bg-[#E7F1FA] border border-[#1C75BC] border-l-4 border-l-[#1C75BC] space-y-3 shadow-xs">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xs bg-white text-[#1C75BC] flex items-center justify-center border border-[#1C75BC] shrink-0">
                          <svg class="w-5 h-5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 class="text-xs sm:text-sm font-bold text-[#1B1D1F]">Travail déposé · En cours d'évaluation</h4>
                          <p class="text-[11px] text-[#4B5157] mt-0.5 font-mono">Remis le {{ selectedDevoir.soumission.dateDepot | date:'dd/MM/yyyy à HH:mm' }}</p>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                        <button
                          type="button"
                          (click)="openFilePreview(selectedDevoir.soumission.fileUrl, selectedDevoir.titre)"
                          class="px-3.5 py-1.5 bg-[#1C75BC] text-white hover:bg-[#124F80] rounded-xs text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Aperçu intégré</span>
                        </button>
                        <a
                          [href]="selectedDevoir.soumission.fileUrl"
                          target="_blank"
                          class="px-3.5 py-1.5 bg-white hover:bg-[#F5F6F7] border border-[#1C75BC] rounded-xs text-xs font-bold text-[#1C75BC] flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Télécharger</span>
                        </a>
                      </div>
                    </div>
                    <p class="text-xs text-[#4B5157] leading-relaxed">
                      Votre document est enregistré. Dès que l'évaluation sera effectuée, la note et les observations apparaîtront ici et vous recevrez une alerte en direct. Vous pouvez le remplacer ci-dessous si nécessaire avant la notation.
                    </p>
                  </div>
                }

                <!-- BANDEAU INSTITUTIONNEL NOTICE (RÈGLES D'INTÉGRITÉ ACADÉMIQUE) -->
                <div class="notice">
                  <strong>Consignes institutionnelles d'évaluation</strong>
                  Les travaux déposés doivent être personnels et originaux. Assurez-vous que votre document comporte votre nom complet et matricule apprenant.
                </div>

                <!-- ZONE DE DÉPÔT (DROPZONE) CONFORME CHARTE VITALIS -->
                @if (!selectedDevoir.soumission || selectedDevoir.soumission.note === null) {
                  <div class="space-y-4 pt-2 border-t border-[#D7DBDE]">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 class="text-xs font-bold text-[#1B1D1F] uppercase tracking-wider flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>{{ selectedDevoir.soumission ? 'Remplacer mon document déposé' : 'Déposer mon travail pratique' }}</span>
                      </h4>
                      <div class="flex items-center gap-1.5 text-[10px] text-[#4B5157]">
                        <span class="px-1.5 py-0.5 rounded-xs bg-[#F5F6F7] border border-[#D7DBDE] font-mono font-bold">PDF</span>
                        <span class="px-1.5 py-0.5 rounded-xs bg-[#F5F6F7] border border-[#D7DBDE] font-mono font-bold">DOCX</span>
                        <span class="px-1.5 py-0.5 rounded-xs bg-[#F5F6F7] border border-[#D7DBDE] font-mono font-bold">ZIP</span>
                        <span class="text-[#71787E]">· Max 10 Mo</span>
                      </div>
                    </div>

                    <!-- DROPZONE GLISSER-DÉPOSER -->
                    <div
                      (dragover)="onDragOver($event)"
                      (dragleave)="onDragLeave($event)"
                      (drop)="onDrop($event)"
                      class="border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 rounded-xs"
                      [class]="isDragging ? 'border-[#1C75BC] bg-[#E7F1FA]' : 'border-[#D7DBDE] hover:border-[#1C75BC] bg-[#F5F6F7]'"
                      (click)="fileInput.click()"
                    >
                      <input
                        #fileInput
                        type="file"
                        (change)="onFileSelected($event)"
                        class="hidden"
                        accept=".pdf,.doc,.docx,.zip,.rar,.txt"
                      />

                      <div class="w-12 h-12 rounded-xs bg-white text-[#1C75BC] flex items-center justify-center border border-[#D7DBDE] shadow-2xs">
                        <svg class="w-6 h-6 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>

                      <div class="text-center space-y-1">
                        <p class="text-xs font-semibold text-[#1B1D1F]">
                          Glissez-déposez votre document ici, ou <span class="text-[#1C75BC] font-bold underline">parcourez vos fichiers</span>
                        </p>
                        <p class="text-[11px] text-[#71787E]">Format recommandé : Document PDF avec votre nom et matricule</p>
                      </div>
                    </div>

                    <!-- CARTE DE PRÉVISUALISATION DU FICHIER SÉLECTIONNÉ -->
                    @if (selectedFile) {
                      <div class="p-3.5 bg-white border border-[#1C75BC] rounded-xs shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-8 h-8 rounded-xs bg-[#E7F1FA] text-[#1C75BC] flex items-center justify-center border border-[#1C75BC] shrink-0">
                            <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div class="min-w-0">
                            <p class="text-xs font-bold text-[#1B1D1F] truncate">{{ selectedFile.name }}</p>
                            <p class="text-[10px] text-[#71787E] font-mono">{{ formatFileSize(selectedFile.size) }}</p>
                          </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            (click)="selectedFile = null; $event.stopPropagation()"
                            class="px-2.5 py-1.5 text-xs text-[#ED1C24] hover:bg-[#FDE6E6] rounded-xs border border-[#ED1C24] font-semibold cursor-pointer transition-colors"
                          >
                            ✕ Annuler
                          </button>
                          <button
                            type="button"
                            (click)="uploadDevoir()"
                            [disabled]="uploading"
                            class="px-5 py-2 rounded-xs bg-[#F0791E] hover:bg-[#d96612] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          >
                            @if (uploading) {
                              <span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-xs animate-spin"></span>
                              <span>Transmission en cours...</span>
                            } @else {
                              <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span>Confirmer le dépôt</span>
                            }
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  } @else if (activeTab === 'QUIZ') {
        <div class="space-y-6 sm:space-y-8 animate-fade-in">
          <!-- BANDEAU DE 4 KPIS QUIZ -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <!-- 1. TOTAL QUIZ -->
            <button
              type="button"
              (click)="setQuizFilter('TOUS')"
              class="p-3.5 sm:p-4 rounded-xs border text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
              [class]="quizFilterStatus === 'TOUS' ? 'bg-[#E7F1FA] border-[#1C75BC] border-l-4 border-l-[#1C75BC]' : 'bg-white border-[#D7DBDE] hover:border-[#1C75BC] hover:bg-[#F5F6F7]'"
            >
              <div class="flex items-center justify-between text-xs text-[#4B5157] font-semibold">
                <span>Tous les quiz</span>
                <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl font-black text-[#1B1D1F] font-mono">{{ kpiQuizTotal }}</span>
                <span class="text-[11px] text-[#71787E] uppercase font-bold tracking-wider">Totalité</span>
              </div>
            </button>

            <!-- 2. À PASSER -->
            <button
              type="button"
              (click)="setQuizFilter('A_PASSER')"
              class="p-3.5 sm:p-4 rounded-xs border text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
              [class]="quizFilterStatus === 'A_PASSER' ? 'bg-[#FDECDD] border-[#F0791E] border-l-4 border-l-[#F0791E]' : 'bg-white border-[#D7DBDE] hover:border-[#F0791E] hover:bg-[#F5F6F7]'"
            >
              <div class="flex items-center justify-between text-xs font-semibold" [class]="kpiQuizAPasser > 0 ? 'text-[#F0791E]' : 'text-[#4B5157]'">
                <span>À passer</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#FDECDD] text-[#F0791E] border border-[#F0791E] font-bold uppercase tracking-wider">Action</span>
              </div>
              <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl font-black font-mono" [class]="kpiQuizAPasser > 0 ? 'text-[#F0791E]' : 'text-[#1B1D1F]'">{{ kpiQuizAPasser }}</span>
                <span class="text-[11px] text-[#71787E] uppercase font-bold tracking-wider">En attente</span>
              </div>
            </button>

            <!-- 3. VALIDÉS -->
            <button
              type="button"
              (click)="setQuizFilter('VALIDES')"
              class="p-3.5 sm:p-4 rounded-xs border text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
              [class]="quizFilterStatus === 'VALIDES' ? 'bg-[#E7F1EA] border-[#276B44] border-l-4 border-l-[#276B44]' : 'bg-white border-[#D7DBDE] hover:border-[#276B44] hover:bg-[#F5F6F7]'"
            >
              <div class="flex items-center justify-between text-xs text-[#276B44] font-semibold">
                <span>Validés (≥ 50%)</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#E7F1EA] text-[#276B44] border border-[#276B44] font-bold uppercase tracking-wider">Réussis</span>
              </div>
              <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl font-black text-[#276B44] font-mono">{{ kpiQuizValides }}</span>
                <span class="text-[11px] text-[#71787E] uppercase font-bold tracking-wider">Succès</span>
              </div>
            </button>

            <!-- 4. MOYENNE QUIZ -->
            <div class="p-3.5 sm:p-4 rounded-xs border border-[#D7DBDE] bg-white shadow-2xs flex flex-col justify-between">
              <div class="flex items-center justify-between text-xs text-[#4B5157] font-semibold">
                <span>Moyenne Quiz</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] font-bold font-mono">
                  {{ moyenneQuiz !== null ? moyenneQuiz + '%' : 'N/A' }}
                </span>
              </div>
              <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl font-black text-[#1C75BC] font-mono">{{ moyenneQuiz !== null ? moyenneQuiz + '%' : '-' }}</span>
                <span class="text-[11px] text-[#71787E] uppercase font-bold tracking-wider">Performance</span>
              </div>
            </div>
          </div>

          <!-- BARRE DE RECHERCHE QUIZ -->
          <div class="p-3 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="relative w-full sm:max-w-md">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71787E]">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                [(ngModel)]="quizSearchQuery"
                placeholder="Rechercher par titre de quiz, module ou formation..."
                class="w-full pl-9 pr-3 py-1.5 rounded-xs border border-[#D7DBDE] text-xs text-[#1B1D1F] placeholder-[#71787E] focus:outline-none focus:border-[#1C75BC] focus:ring-1 focus:ring-[#1C75BC] transition-all bg-[#F5F6F7] focus:bg-white"
              />
            </div>

            <div class="flex items-center gap-2 self-end sm:self-auto text-xs text-[#4B5157]">
              <span>Affichage : <strong>{{ filteredQuiz.length }}</strong> sur {{ quizList.length }} quiz</span>
            </div>
          </div>

          <!-- LISTE DES CARTES QUIZ -->
          @if (loadingQuiz) {
            <div class="p-16 text-center text-[#4B5157] bg-white border border-[#D7DBDE] rounded-xs shadow-xs">
              <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p class="text-xs font-semibold text-[#4B5157]">Chargement des évaluations en ligne...</p>
            </div>
          } @else if (filteredQuiz.length === 0) {
            <div class="p-12 text-center bg-white border border-[#D7DBDE] rounded-xs space-y-3">
              <svg class="w-12 h-12 text-[#9AA1A8] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 class="text-sm font-bold text-[#1B1D1F]">Aucun quiz correspondant</h3>
              <p class="text-xs text-[#4B5157] max-w-sm mx-auto">
                Aucun quiz d'évaluation ne correspond à vos filtres actuels.
              </p>
              @if (quizFilterStatus !== 'TOUS' || quizSearchQuery.trim()) {
                <button
                  type="button"
                  (click)="quizFilterStatus = 'TOUS'; quizSearchQuery = ''"
                  class="px-4 py-2 bg-[#1C75BC] text-white text-xs font-bold rounded-xs cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              }
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (quiz of filteredQuiz; track quiz.id) {
                <div class="p-5 bg-white border border-[#D7DBDE] hover:border-[#1C75BC] rounded-xs shadow-2xs transition-all flex flex-col justify-between space-y-4">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                      <span class="px-2 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] text-[10px] font-bold uppercase tracking-wider">
                        {{ quiz.formationTitre }}
                      </span>
                      @if (quiz.tentative) {
                        <span class="px-2 py-0.5 rounded-xs text-[10px] font-bold font-mono border" [class]="quiz.tentative.score >= 50 ? 'bg-[#E7F1EA] text-[#276B44] border-[#276B44]' : 'bg-[#FDECEA] text-[#ED1C24] border-[#ED1C24]'">
                          {{ quiz.tentative.score }}% ({{ quiz.tentative.score >= 50 ? 'Validé' : 'Non validé' }})
                        </span>
                      } @else {
                        <span class="px-2 py-0.5 rounded-xs bg-[#FDECDD] text-[#F0791E] border border-[#F0791E] text-[10px] font-bold uppercase tracking-wider">
                          À passer
                        </span>
                      }
                    </div>

                    <h3 class="text-sm font-bold text-[#1B1D1F] leading-snug">{{ quiz.titre }}</h3>
                    <p class="text-xs text-[#4B5157]">Module : <strong>{{ quiz.moduleTitre }}</strong></p>

                    <div class="flex items-center gap-4 text-[11px] text-[#71787E] pt-1">
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{{ quiz.dureeMinutes ? quiz.dureeMinutes + ' min chrono' : 'Temps libre' }}</span>
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span>{{ quiz.nbQuestions }} questions</span>
                      </span>
                    </div>
                  </div>

                  <div class="pt-3 border-t border-[#D7DBDE] flex items-center justify-between gap-3">
                    @if (quiz.tentative) {
                      <span class="text-[11px] text-[#71787E] font-mono">
                        Passé le {{ quiz.tentative.datePassage | date:'dd/MM/yyyy' }}
                      </span>
                      <a
                        [routerLink]="['/apprenant/evaluations/quiz-player', quiz.id]"
                        (mouseenter)="prefetchQuiz(quiz.id)"
                        class="px-3.5 py-1.5 rounded-xs bg-[#E7F1FA] hover:bg-[#1C75BC] text-[#1C75BC] hover:text-white border border-[#1C75BC] text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Voir mon score</span>
                        <span>→</span>
                      </a>
                    } @else {
                      <span class="text-[11px] text-[#F0791E] font-semibold">
                        1 seule tentative autorisée
                      </span>
                      <a
                        [routerLink]="['/apprenant/evaluations/quiz-player', quiz.id]"
                        (mouseenter)="prefetchQuiz(quiz.id)"
                        class="px-4 py-2 rounded-xs bg-[#F0791E] hover:bg-[#d96612] text-white text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Commencer le test</span>
                        <span>→</span>
                      </a>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
      <!-- MODAL APERÇU IN-APP DE FICHIER -->
      @if (previewFileUrl) {
        <div
          class="fixed inset-0 bg-[#1B1D1F]/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          (click)="closePreview()"
        >
          <div
            class="bg-white rounded-xs max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl border border-[#D7DBDE] animate-scale-up overflow-hidden"
            (click)="$event.stopPropagation()"
          >
            <!-- Header -->
            <div class="p-4 border-b border-[#D7DBDE] flex items-center justify-between bg-[#F5F6F7]">
              <div class="flex items-center gap-2 min-w-0">
                <span class="px-2 py-0.5 rounded-xs bg-[#1C75BC] text-white text-[10px] font-bold uppercase shrink-0">Aperçu In-App</span>
                <span class="text-xs font-bold text-[#1B1D1F] truncate">{{ previewFileName || 'Fichier déposé' }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <a
                  [href]="previewFileUrl"
                  target="_blank"
                  download
                  class="px-3 py-1 rounded-xs bg-white border border-[#D7DBDE] text-xs font-bold text-[#1C75BC] hover:bg-[#E7F1FA] flex items-center gap-1 shadow-2xs"
                >
                  <span>Télécharger</span>
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
                <button
                  type="button"
                  (click)="closePreview()"
                  class="w-7 h-7 rounded-xs bg-white hover:bg-[#D7DBDE] text-[#1B1D1F] flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
                >
                  ✕
                </button>
              </div>
            </div>
            <!-- Content -->
            <div class="flex-1 p-2 bg-[#E7ECEF] overflow-hidden flex items-center justify-center">
              @if (isPdf(previewFileUrl)) {
                <iframe [src]="safePreviewUrl" class="w-full h-full rounded-xs border-0 bg-white"></iframe>
              } @else if (isImage(previewFileUrl)) {
                <img [src]="previewFileUrl" alt="Aperçu" class="max-w-full max-h-full object-contain rounded-xs shadow-md" />
              } @else {
                <div class="p-8 text-center bg-white rounded-xs border border-[#D7DBDE] max-w-md space-y-3 shadow-xs">
                  <svg class="w-12 h-12 text-[#1C75BC] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <h4 class="text-sm font-bold text-[#1B1D1F]">Fichier bureautique ou archive</h4>
                  <p class="text-xs text-[#4B5157]">Ce format de fichier (.docx, .zip) ne peut pas être rendu directement dans le navigateur, mais votre soumission est validée et archivée.</p>
                  <a [href]="previewFileUrl" target="_blank" download class="px-4 py-2 rounded-xs bg-[#1C75BC] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer">Télécharger le document</a>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DepotDevoirComponent implements OnInit, OnDestroy {
  // Onglets
  activeTab: EvaluationTab = 'DEVOIRS';

  // Devoirs State
  devoirs: DevoirItem[] = [];
  selectedDevoir: DevoirItem | null = null;
  loading = true;

  // In-App Previewer
  previewFileUrl: string | null = null;
  previewFileName: string | null = null;
  safePreviewUrl: SafeResourceUrl | null = null;

  // Filtres & Recherche Devoirs
  filterStatus: DevoirFilterStatus = 'TOUS';
  searchQuery = '';

  // Upload
  selectedFile: File | null = null;
  isDragging = false;
  uploading = false;

  // Quiz State
  quizList: ApprenantQuizItem[] = [];
  loadingQuiz = true;
  quizFilterStatus: 'TOUS' | 'A_PASSER' | 'VALIDES' = 'TOUS';
  quizSearchQuery = '';

  private liveSub?: Subscription;
  private bootstrapSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private apprenantService: ApprenantService,
    private devoirsService: DevoirsService,
    private toast: ToastService,
    private sanitizer: DomSanitizer,
  ) { }

  openFilePreview(url: string, fileName?: string): void {
    if (!url) return;
    this.previewFileUrl = url;
    this.previewFileName = fileName || 'Fichier déposé';
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  closePreview(): void {
    this.previewFileUrl = null;
    this.previewFileName = null;
    this.safePreviewUrl = null;
  }

  isPdf(url: string | null): boolean {
    return !!url && url.toLowerCase().includes('.pdf');
  }

  isImage(url: string | null): boolean {
    return !!url && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url.toLowerCase());
  }

  ngOnInit() {
    const targetDevoirId = this.route.snapshot.queryParamMap.get('devoirId');
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam && tabParam.toLowerCase() === 'quiz') {
      this.activeTab = 'QUIZ';
    }

    // 1. Rendu instantané devoirs depuis snapshot (0ms !)
    const cached = this.apprenantService.getDevoirsSnapshot();
    if (cached) {
      this.devoirs = cached as DevoirItem[];
      this.loading = false;
      this.selectInitial(targetDevoirId);
    }

    // 2. Revalidation devoirs en tâche de fond (SWR)
    this.loadAllDevoirs(cached === null, targetDevoirId);

    // 3. Rendu instantané quiz depuis snapshot (0ms !)
    const cachedQuiz = this.apprenantService.getAllQuizSnapshot();
    if (cachedQuiz) {
      this.quizList = cachedQuiz;
      this.loadingQuiz = false;
    }

    // 4. Revalidation quiz en tâche de fond
    this.loadAllQuiz(cachedQuiz === null);

    // 5. Rafraîchissement automatique SSE complet en temps réel
    this.liveSub = this.apprenantService.liveUpdates$.subscribe((event) => {
      if (
        event.type === 'DEVOIR_NOTE' ||
        event.type === 'DEVOIR_DEPOSE' ||
        event.type === 'NOTE_PUBLIEE' ||
        event.type === 'BROADCAST'
      ) {
        this.loadAllDevoirs(false, null);
      }
      if (event.type === 'QUIZ_SUBMITTED' || event.type === 'BROADCAST') {
        this.loadAllQuiz(false);
      }
    });

    // 6. Synchronisation bootstrap initial
    this.bootstrapSub = this.apprenantService.bootstrap$.subscribe((data) => {
      if (data?.devoirs && (!this.devoirs || this.devoirs.length === 0)) {
        this.devoirs = data.devoirs as DevoirItem[];
        this.loading = false;
        this.selectInitial(targetDevoirId);
      }
      if (data?.quiz && (!this.quizList || this.quizList.length === 0)) {
        this.quizList = data.quiz;
        this.loadingQuiz = false;
      }
    });
  }

  switchTab(tab: EvaluationTab) {
    this.activeTab = tab;
    if (tab === 'QUIZ') {
      const snapshot = this.apprenantService.getAllQuizSnapshot();
      if (snapshot && this.quizList.length === 0) {
        this.quizList = snapshot;
        this.loadingQuiz = false;
      }
      this.loadAllQuiz(this.quizList.length === 0);
    }
  }

  loadAllQuiz(showSpinner = true) {
    const snapshot = this.apprenantService.getAllQuizSnapshot();
    if (snapshot && this.quizList.length === 0) {
      this.quizList = snapshot;
      this.loadingQuiz = false;
    } else if (showSpinner && this.quizList.length === 0) {
      this.loadingQuiz = true;
    }

    this.apprenantService.getAllQuiz().subscribe({
      next: (list) => {
        this.quizList = list;
        this.loadingQuiz = false;
      },
      error: () => {
        this.loadingQuiz = false;
      },
    });
  }

  prefetchQuiz(quizId: string) {
    if (!this.apprenantService.getQuizSnapshot(quizId)) {
      this.apprenantService.getQuiz(quizId).subscribe({ error: () => {} });
    }
  }

  setQuizFilter(status: 'TOUS' | 'A_PASSER' | 'VALIDES') {
    this.quizFilterStatus = status;
  }

  get kpiQuizTotal(): number {
    return this.quizList.length;
  }

  get kpiQuizAPasser(): number {
    return this.quizList.filter((q) => !q.tentative).length;
  }

  get kpiQuizValides(): number {
    return this.quizList.filter((q) => q.tentative && q.tentative.score >= 50).length;
  }

  get moyenneQuiz(): number | null {
    const passed = this.quizList.filter((q) => q.tentative);
    if (passed.length === 0) return null;
    const sum = passed.reduce((acc, q) => acc + q.tentative!.score, 0);
    return Math.round((sum / passed.length) * 10) / 10;
  }

  get filteredQuiz(): ApprenantQuizItem[] {
    return this.quizList.filter((q) => {
      if (this.quizFilterStatus === 'A_PASSER' && q.tentative) return false;
      if (this.quizFilterStatus === 'VALIDES' && (!q.tentative || q.tentative.score < 50)) return false;

      if (this.quizSearchQuery.trim()) {
        const query = this.quizSearchQuery.toLowerCase().trim();
        const matchTitle = q.titre.toLowerCase().includes(query);
        const matchModule = q.moduleTitre.toLowerCase().includes(query);
        const matchFormation = q.formationTitre.toLowerCase().includes(query);
        if (!matchTitle && !matchModule && !matchFormation) return false;
      }
      return true;
    });
  }

  ngOnDestroy() {
    this.liveSub?.unsubscribe();
    this.bootstrapSub?.unsubscribe();
  }

  // --- GETTERS KPIS ---
  get kpiTotal(): number {
    return this.devoirs.length;
  }

  get kpiARendre(): number {
    return this.devoirs.filter((d) => !d.soumission).length;
  }

  get kpiDeposes(): number {
    return this.devoirs.filter((d) => d.soumission && d.soumission.note === null).length;
  }

  get kpiNotes(): number {
    return this.devoirs.filter((d) => d.soumission && d.soumission.note !== null).length;
  }

  get moyenneGenerale(): number | null {
    const notes = this.devoirs
      .filter((d) => d.soumission && d.soumission.note !== null)
      .map((d) => Number(d.soumission!.note));
    if (notes.length === 0) return null;
    const sum = notes.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / notes.length) * 10) / 10;
  }

  // --- FILTRAGE DYNAMIQUE ---
  get filteredDevoirs(): DevoirItem[] {
    return this.devoirs.filter((d) => {
      // Filtre de statut
      if (this.filterStatus === 'A_RENDRE' && d.soumission) return false;
      if (this.filterStatus === 'DEPOSES' && (!d.soumission || d.soumission.note !== null)) return false;
      if (this.filterStatus === 'NOTES' && (!d.soumission || d.soumission.note === null)) return false;

      // Filtre de recherche textuelle
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase().trim();
        const matchTitle = d.titre.toLowerCase().includes(query);
        const matchModule = d.moduleTitre.toLowerCase().includes(query);
        const matchFormation = d.formationTitre.toLowerCase().includes(query);
        const matchConsignes = d.consignes?.toLowerCase().includes(query);
        if (!matchTitle && !matchModule && !matchFormation && !matchConsignes) {
          return false;
        }
      }

      return true;
    });
  }

  get currentDevoirIndex(): number {
    if (!this.selectedDevoir || this.filteredDevoirs.length === 0) return 0;
    const idx = this.filteredDevoirs.findIndex((d) => d.id === this.selectedDevoir!.id);
    return idx >= 0 ? idx : 0;
  }

  setFilter(status: DevoirFilterStatus) {
    this.filterStatus = status;
    // Si le devoir actuellement sélectionné n'est plus dans la liste filtrée, sélectionner le premier
    if (this.filteredDevoirs.length > 0) {
      const match = this.filteredDevoirs.find((d) => d.id === this.selectedDevoir?.id);
      if (!match) {
        this.selectDevoir(this.filteredDevoirs[0], false);
      }
    }
  }

  resetFilters() {
    this.filterStatus = 'TOUS';
    this.searchQuery = '';
    if (this.devoirs.length > 0 && !this.selectedDevoir) {
      this.selectDevoir(this.devoirs[0], false);
    }
  }

  selectPrevious() {
    const idx = this.currentDevoirIndex;
    if (idx > 0) {
      this.selectDevoir(this.filteredDevoirs[idx - 1], true);
    }
  }

  selectNext() {
    const idx = this.currentDevoirIndex;
    if (idx < this.filteredDevoirs.length - 1) {
      this.selectDevoir(this.filteredDevoirs[idx + 1], true);
    }
  }

  loadAllDevoirs(showSpinner = true, targetDevoirId: string | null = null) {
    if (showSpinner) {
      this.loading = true;
    }

    // UNE SEULE requête SQL agrégée (remplace les anciennes N+1 boucles séquentielles)
    this.apprenantService.getAllDevoirs().subscribe({
      next: (data) => {
        this.devoirs = data as DevoirItem[];
        this.loading = false;

        // Si un devoir était déjà sélectionné, synchroniser avec la nouvelle référence reçue
        if (this.selectedDevoir) {
          const matching = this.devoirs.find((d) => d.id === this.selectedDevoir!.id);
          if (matching) {
            this.selectedDevoir = matching;
          } else if (this.devoirs.length > 0) {
            this.selectedDevoir = this.devoirs[0];
          }
        } else {
          this.selectInitial(targetDevoirId);
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Erreur lors du chargement des devoirs.');
      },
    });
  }

  private selectInitial(targetDevoirId: string | null) {
    if (!this.selectedDevoir) {
      if (targetDevoirId) {
        const match = this.devoirs.find((d) => d.id === targetDevoirId);
        if (match) this.selectDevoir(match, false);
      } else if (this.devoirs.length > 0) {
        this.selectDevoir(this.devoirs[0], false);
      }
    }
  }

  selectDevoir(d: DevoirItem, scrollToDetail = false) {
    this.selectedDevoir = d;
    this.selectedFile = null;

    // Sur écran mobile / tablette (< 1024px), faire défiler fluidement jusqu'au panneau de détail
    if (scrollToDetail && typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const panel = document.getElementById('devoirDetailPanel');
        if (panel) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  }

  isOverdue(dateLimite: string | null): boolean {
    if (!dateLimite) return false;
    return new Date() > new Date(dateLimite);
  }

  getTimeRemaining(dateLimite: string | null): string {
    if (!dateLimite) return 'Sans limite';
    const now = new Date();
    const target = new Date(dateLimite);
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return absDays === 1 ? 'Expiré hier' : `Expiré (J-${absDays})`;
    }
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Demain (J-1)';
    return `${diffDays}j restants`;
  }

  getMention(note: number | null): string {
    if (note === null) return '';
    if (note >= 16) return 'Très Bien';
    if (note >= 14) return 'Bien';
    if (note >= 12) return 'Assez Bien';
    if (note >= 10) return 'Passable';
    return 'Insuffisant';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.selectedFile = event.dataTransfer.files[0];
    }
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  uploadDevoir() {
    if (!this.selectedDevoir || !this.selectedFile) return;

    this.uploading = true;
    this.apprenantService.deposerDevoir(this.selectedDevoir.id, this.selectedFile).subscribe({
      next: (res) => {
        this.uploading = false;
        this.toast.success('Devoir déposé avec succès !');
        if (this.selectedDevoir) {
          const soum = {
            id: res.soumissionId,
            fileUrl: res.fileUrl,
            note: null,
            commentaire: null,
            dateDepot: res.dateDepot || new Date().toISOString(),
          };
          this.selectedDevoir.soumission = soum;
          const found = this.devoirs.find((d) => d.id === this.selectedDevoir?.id);
          if (found) {
            found.soumission = soum;
          }
        }
        this.selectedFile = null;
      },
      error: (err) => {
        this.uploading = false;
        this.toast.error(err.error?.message || 'Erreur lors du dépôt du devoir.');
      },
    });
  }
}
