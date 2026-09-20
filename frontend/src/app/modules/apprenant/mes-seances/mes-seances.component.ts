import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApprenantService, ApprenantSeanceItem, ApprenantAssiduite } from '../../../core/services/apprenant.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-mes-seances',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-fade-in pb-12">
      <!-- TOP HEADER & REFRESH -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] text-[10px] font-bold uppercase tracking-wider">
              Planning & Présence
            </span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] font-heading mt-1">
            Emploi du temps & Assiduité
          </h1>
          <div class="barre"></div>
          <p class="text-xs text-[#4B5157] mt-1.5 max-w-2xl leading-relaxed">
            Consultez le planning de vos cours, ateliers en présentiel ou séances en visioconférence, et suivez votre taux d'émargement officiel.
          </p>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <!-- VIEW MODE SWITCHER (LISTE / CALENDRIER) -->
          <div class="inline-flex rounded-xs border border-[#D7DBDE] bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              (click)="viewMode = 'list'"
              class="px-3 py-1.5 text-xs font-bold rounded-xs transition-all flex items-center gap-1.5 cursor-pointer"
              [class]="viewMode === 'list' ? 'bg-[#1C75BC] text-white shadow-2xs' : 'text-[#4B5157] hover:text-[#1B1D1F]'"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Vue Liste</span>
            </button>
            <button
              type="button"
              (click)="viewMode = 'calendar'"
              class="px-3 py-1.5 text-xs font-bold rounded-xs transition-all flex items-center gap-1.5 cursor-pointer"
              [class]="viewMode === 'calendar' ? 'bg-[#1C75BC] text-white shadow-2xs' : 'text-[#4B5157] hover:text-[#1B1D1F]'"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Calendrier Hebdo</span>
            </button>
          </div>

          <button
            type="button"
            (click)="loadData()"
            [disabled]="loading"
            class="px-3.5 py-2 rounded-xs bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <svg
              class="w-3.5 h-3.5 text-[#1C75BC]"
              [class.animate-spin]="loading"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      <!-- KPI METRICS ASSIDUITE -->
      @if (assiduite) {
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <!-- Taux d'assiduité -->
          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs col-span-2 sm:col-span-1">
            <span class="text-[10px] uppercase font-bold text-[#4B5157]">Taux d'assiduité</span>
            <div class="flex items-baseline gap-2 mt-1">
              <span
                class="text-2xl sm:text-3xl font-black font-mono leading-none"
                [class]="assiduite.tauxAssiduite >= 80 ? 'text-[#276B44]' : assiduite.tauxAssiduite >= 60 ? 'text-[#F0791E]' : 'text-[#ED1C24]'"
              >
                {{ assiduite.tauxAssiduite }}%
              </span>
            </div>
            <p class="text-[10px] text-[#4B5157] mt-1.5">
              {{ assiduite.total }} séance{{ assiduite.total > 1 ? 's' : '' }} comptabilisée{{ assiduite.total > 1 ? 's' : '' }}
            </p>
          </div>

          <!-- Présences -->
          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs">
            <span class="text-[10px] uppercase font-bold text-[#276B44]">Présent</span>
            <p class="text-2xl font-black text-[#276B44] font-mono leading-none mt-1">
              {{ assiduite.presents }}
            </p>
            <p class="text-[10px] text-[#4B5157] mt-1.5">Émargement validé</p>
          </div>

          <!-- Retards -->
          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs">
            <span class="text-[10px] uppercase font-bold text-[#F0791E]">Retards</span>
            <p class="text-2xl font-black text-[#F0791E] font-mono leading-none mt-1">
              {{ assiduite.retards }}
            </p>
            <p class="text-[10px] text-[#4B5157] mt-1.5">Arrivée signalée</p>
          </div>

          <!-- Absences non justifiées -->
          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs">
            <span class="text-[10px] uppercase font-bold text-[#ED1C24]">Absences</span>
            <p class="text-2xl font-black text-[#ED1C24] font-mono leading-none mt-1">
              {{ assiduite.absents }}
            </p>
            <p class="text-[10px] text-[#4B5157] mt-1.5">Non justifiées</p>
          </div>

          <!-- Justifiées -->
          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs">
            <span class="text-[10px] uppercase font-bold text-[#1C75BC]">Justifiées</span>
            <p class="text-2xl font-black text-[#1C75BC] font-mono leading-none mt-1">
              {{ assiduite.justifies }}
            </p>
            <p class="text-[10px] text-[#4B5157] mt-1.5">Motif administratif</p>
          </div>
        </div>
      }

      <!-- BARRE DE COMMANDE & FILTRES (LISTE OU CALENDRIER) -->
      @if (viewMode === 'list') {
        <div class="flex items-center gap-2 border-b border-[#D7DBDE] pb-2">
          <button
            (click)="filter = 'all'"
            class="px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer"
            [class]="filter === 'all' ? 'bg-[#124F80] text-white shadow-2xs' : 'bg-white text-[#4B5157] hover:text-[#1B1D1F] border border-[#D7DBDE]'"
          >
            Toutes ({{ seances.length }})
          </button>
          <button
            (click)="filter = 'upcoming'"
            class="px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer"
            [class]="filter === 'upcoming' ? 'bg-[#124F80] text-white shadow-2xs' : 'bg-white text-[#4B5157] hover:text-[#1B1D1F] border border-[#D7DBDE]'"
          >
            À venir ({{ nbUpcoming }})
          </button>
          <button
            (click)="filter = 'past'"
            class="px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer"
            [class]="filter === 'past' ? 'bg-[#124F80] text-white shadow-2xs' : 'bg-white text-[#4B5157] hover:text-[#1B1D1F] border border-[#D7DBDE]'"
          >
            Passées ({{ nbPast }})
          </button>
        </div>
      } @else {
        <!-- NAVIGATION CALENDRIER HEBDOMADAIRE -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="previousWeek()"
              class="w-8 h-8 rounded-xs border border-[#D7DBDE] bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
              title="Semaine précédente"
            >
              ◀
            </button>
            <button
              type="button"
              (click)="currentWeek()"
              class="px-3 py-1.5 rounded-xs border border-[#D7DBDE] bg-white hover:bg-[#F5F6F7] text-[#1C75BC] text-xs font-bold shadow-2xs cursor-pointer"
            >
              Cette semaine
            </button>
            <button
              type="button"
              (click)="nextWeek()"
              class="w-8 h-8 rounded-xs border border-[#D7DBDE] bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
              title="Semaine suivante"
            >
              ▶
            </button>
          </div>

          <span class="text-xs sm:text-sm font-bold text-[#1B1D1F] font-heading">
            {{ weekLabel }}
          </span>

          <span class="text-xs text-[#4B5157] font-mono">
            {{ weekSeancesCount }} cours programmé{{ weekSeancesCount > 1 ? 's' : '' }} cette semaine
          </span>
        </div>
      }

      <!-- SÉANCES VIEW (LISTE OU CALENDRIER HEBDOMADAIRE) -->
      @if (loading) {
        <div class="p-16 text-center text-[#4B5157] bg-white border border-[#D7DBDE] rounded-xs shadow-xs">
          <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-xs font-semibold">Chargement des séances et de l'émargement...</p>
        </div>
      } @else if (viewMode === 'list') {
        <!-- ─── VUE 1 : LISTE CHRONOLOGIQUE ────────────────────────────── -->
        @if (filteredSeances.length === 0) {
          <div class="p-12 text-center bg-white border border-[#D7DBDE] rounded-xs space-y-3 shadow-xs">
            <div class="w-12 h-12 rounded-xs bg-[#E7F1FA] text-[#1C75BC] flex items-center justify-center mx-auto border border-[#1C75BC]/30">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-sm font-bold text-[#1B1D1F]">Aucune séance trouvée</h3>
            <p class="text-xs text-[#4B5157] max-w-sm mx-auto">
              {{ filter === 'upcoming' ? 'Aucune séance future programmée pour le moment.' : filter === 'past' ? 'Aucun historique de séance passée.' : 'Aucune séance programmée pour vos formations actives.' }}
            </p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (s of filteredSeances; track s.id) {
              <div
                (click)="openSeanceModal(s)"
                class="p-4 sm:p-5 bg-white border border-[#D7DBDE] rounded-xs shadow-xs hover:border-[#1C75BC] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                [class.border-l-4]="true"
                [class.border-l-[#276B44]]="s.presence?.statut === 'PRESENT'"
                [class.border-l-[#ED1C24]]="s.presence?.statut === 'ABSENT'"
                [class.border-l-[#F0791E]]="s.presence?.statut === 'RETARD'"
                [class.border-l-[#1C75BC]]="s.presence?.statut === 'JUSTIFIE'"
                [class.border-l-[#D7DBDE]]="!s.presence?.statut"
              >
                <!-- LEFT: Date Badge & Title -->
                <div class="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <!-- Date Box -->
                  <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xs bg-[#F5F6F7] border border-[#D7DBDE] flex flex-col items-center justify-center shrink-0 text-center font-mono">
                    <span class="text-[10px] text-[#4B5157] uppercase font-bold leading-none">
                      {{ s.dateHeureDebut | date:'MMM' }}
                    </span>
                    <span class="text-base sm:text-lg font-black text-[#1B1D1F] leading-none mt-0.5">
                      {{ s.dateHeureDebut | date:'dd' }}
                    </span>
                  </div>

                  <!-- Info Block -->
                  <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] text-[10px] font-bold uppercase">
                        {{ s.formationTitre }}
                      </span>
                      @if (s.moduleTitre) {
                        <span class="text-[10px] text-[#4B5157] font-semibold">
                          · {{ s.moduleTitre }}
                        </span>
                      }
                    </div>

                    <h3 class="text-sm font-bold text-[#1B1D1F] truncate group-hover:text-[#1C75BC] transition-colors">
                      {{ s.titreActivite }}
                    </h3>

                    <!-- Metadata Details -->
                    <div class="flex items-center gap-4 text-xs text-[#4B5157] flex-wrap pt-0.5">
                      <!-- Horaires -->
                      <span class="flex items-center gap-1 font-mono text-[11px]">
                        <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{{ s.dateHeureDebut | date:'HH:mm' }} - {{ s.dateHeureFin | date:'HH:mm' }}</span>
                      </span>

                      <!-- Formateur -->
                      @if (s.formateurNom) {
                        <span class="flex items-center gap-1 text-[11px]">
                          <svg class="w-3.5 h-3.5 text-[#4B5157]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{{ s.formateurNom }}</span>
                        </span>
                      }

                      <!-- Salle ou Visio -->
                      @if (isVisio(s)) {
                        <span class="flex items-center gap-1 text-[11px] text-[#1C75BC] font-semibold">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Visioconférence en ligne</span>
                        </span>
                      } @else if (s.salleOuLien) {
                        <span class="flex items-center gap-1 text-[11px]">
                          <svg class="w-3.5 h-3.5 text-[#4B5157]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>Lieu : {{ s.salleOuLien }}</span>
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- RIGHT: Status Tag & Action -->
                <div class="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#D7DBDE]" (click)="$event.stopPropagation()">
                  <!-- Attendance Status -->
                  <div>
                    @if (s.presence?.statut === 'PRESENT') {
                      <span class="px-2.5 py-1 rounded-xs bg-[#E7F1EA] text-[#276B44] border border-[#276B44] text-xs font-bold flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Présent</span>
                      </span>
                    } @else if (s.presence?.statut === 'ABSENT') {
                      <span class="px-2.5 py-1 rounded-xs bg-[#FDE8E8] text-[#ED1C24] border border-[#ED1C24] text-xs font-bold flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Absent</span>
                      </span>
                    } @else if (s.presence?.statut === 'RETARD') {
                      <span class="px-2.5 py-1 rounded-xs bg-[#FDECDD] text-[#F0791E] border border-[#F0791E] text-xs font-bold flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>En retard</span>
                      </span>
                    } @else if (s.presence?.statut === 'JUSTIFIE') {
                      <span class="px-2.5 py-1 rounded-xs bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] text-xs font-bold flex items-center gap-1">
                        <span>Justifié</span>
                      </span>
                    } @else {
                      <span class="px-2.5 py-1 rounded-xs bg-[#F5F6F7] text-[#4B5157] border border-[#D7DBDE] text-xs font-medium">
                        {{ isUpcoming(s.dateHeureDebut) ? 'À venir' : 'Non émargé' }}
                      </span>
                    }
                  </div>

                  <!-- Visio Button if available -->
                  @if (isVisio(s) && s.salleOuLien) {
                    <a
                      [href]="s.salleOuLien"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-3.5 py-1.5 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Rejoindre</span>
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  } @else {
                    <button
                      type="button"
                      (click)="openSeanceModal(s)"
                      class="px-2.5 py-1 rounded-xs border border-[#D7DBDE] text-[11px] font-semibold text-[#4B5157] hover:bg-[#F5F6F7] cursor-pointer"
                    >
                      Détails →
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <!-- ─── VUE 2 : CALENDRIER HEBDOMADAIRE ───────────────────────────── -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 animate-fade-in">
          @for (day of weekDays; track day.name) {
            <div
              class="border rounded-xs bg-white flex flex-col min-h-[320px] shadow-2xs transition-all"
              [class]="day.isToday ? 'border-[#1C75BC] ring-1 ring-[#1C75BC]' : 'border-[#D7DBDE]'"
            >
              <!-- En-tête du jour -->
              <div
                class="p-3 border-b flex items-center justify-between"
                [class]="day.isToday ? 'bg-[#E7F1FA] border-[#1C75BC]' : 'bg-[#F5F6F7] border-[#D7DBDE]'"
              >
                <div>
                  <span class="text-xs font-bold block" [class]="day.isToday ? 'text-[#1C75BC]' : 'text-[#1B1D1F]'">
                    {{ day.name }}
                  </span>
                  <span class="text-[10px] text-[#71787E] font-mono">
                    {{ day.date | date:'dd MMM' }}
                  </span>
                </div>
                @if (day.isToday) {
                  <span class="px-1.5 py-0.5 rounded-xs bg-[#1C75BC] text-white text-[9px] font-bold uppercase tracking-wider">
                    Aujourd'hui
                  </span>
                }
              </div>

              <!-- Séances du jour -->
              <div class="p-2 space-y-2 flex-1 overflow-y-auto">
                @if (day.seances.length === 0) {
                  <div class="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-3 text-slate-400">
                    <span class="text-[11px] text-[#9AA1A8] italic">Aucun cours</span>
                  </div>
                } @else {
                  @for (s of day.seances; track s.id) {
                    <div
                      (click)="openSeanceModal(s)"
                      class="p-2.5 rounded-xs border transition-all text-left cursor-pointer hover:shadow-xs group space-y-1.5"
                      [class]="s.presence?.statut === 'PRESENT' ? 'bg-[#E7F1EA]/50 border-[#276B44] border-l-3' : s.presence?.statut === 'ABSENT' ? 'bg-[#FDE8E8]/50 border-[#ED1C24] border-l-3' : s.presence?.statut === 'RETARD' ? 'bg-[#FDECDD]/50 border-[#F0791E] border-l-3' : 'bg-[#F9FAFB] border-[#D7DBDE] hover:border-[#1C75BC] border-l-3 border-l-[#1C75BC]'"
                    >
                      <!-- Horaires -->
                      <div class="flex items-center justify-between gap-1 text-[10px] font-mono font-bold text-[#1B1D1F]">
                        <span>{{ s.dateHeureDebut | date:'HH:mm' }} - {{ s.dateHeureFin | date:'HH:mm' }}</span>
                        @if (isVisio(s)) {
                          <span class="text-[9px] px-1 py-0.2 bg-[#E7F1FA] text-[#1C75BC] rounded-xs font-sans font-semibold">Visio</span>
                        }
                      </div>

                      <!-- Titre -->
                      <p class="text-xs font-bold text-[#1B1D1F] line-clamp-2 group-hover:text-[#1C75BC] transition-colors leading-snug">
                        {{ s.titreActivite }}
                      </p>

                      <!-- Formation / Module -->
                      <p class="text-[10px] text-[#71787E] truncate">
                        {{ s.formationTitre }}
                      </p>

                      <!-- Statut ou Salle -->
                      <div class="flex items-center justify-between text-[10px] pt-1 border-t border-[#D7DBDE]/60">
                        <span class="text-[#4B5157] truncate max-w-[100px]">
                          {{ s.formateurNom || (s.salleOuLien || 'En direct') }}
                        </span>
                        @if (s.presence?.statut) {
                          <span class="font-bold text-[10px]" [class]="s.presence?.statut === 'PRESENT' ? 'text-[#276B44]' : s.presence?.statut === 'ABSENT' ? 'text-[#ED1C24]' : 'text-[#F0791E]'">
                            {{ s.presence?.statut === 'PRESENT' ? '✓ Présent' : s.presence?.statut === 'ABSENT' ? '✗ Absent' : 'Retard' }}
                          </span>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- ─── MODAL DÉTAILS DE LA SÉANCE ──────────────────────────────────── -->
      @if (selectedSeanceModal) {
        <div
          class="fixed inset-0 bg-[#1B1D1F]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          (click)="closeSeanceModal()"
        >
          <div
            class="bg-white border border-[#D7DBDE] rounded-xs max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-start justify-between gap-3 border-b border-[#D7DBDE] pb-4">
              <div>
                <span class="px-2 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] text-[10px] font-bold uppercase">
                  {{ selectedSeanceModal.formationTitre }}
                </span>
                <h3 class="text-base font-bold text-[#1B1D1F] mt-1">
                  {{ selectedSeanceModal.titreActivite }}
                </h3>
                @if (selectedSeanceModal.moduleTitre) {
                  <p class="text-xs text-[#4B5157]">Module : {{ selectedSeanceModal.moduleTitre }}</p>
                }
              </div>
              <button
                type="button"
                (click)="closeSeanceModal()"
                class="w-7 h-7 rounded-xs bg-[#F5F6F7] hover:bg-[#D7DBDE] text-[#1B1D1F] flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <!-- Infos de déroulement -->
            <div class="space-y-3 text-xs">
              <div class="p-3 bg-[#F5F6F7] rounded-xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[#71787E] font-medium">Date & Horaires :</span>
                  <span class="font-bold text-[#1B1D1F] font-mono">
                    {{ selectedSeanceModal.dateHeureDebut | date:'dd/MM/yyyy' }} ({{ selectedSeanceModal.dateHeureDebut | date:'HH:mm' }} - {{ selectedSeanceModal.dateHeureFin | date:'HH:mm' }})
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-[#71787E] font-medium">Enseignant / Formateur :</span>
                  <span class="font-bold text-[#1B1D1F]">{{ selectedSeanceModal.formateurNom || 'Non assigné' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-[#71787E] font-medium">Format de la séance :</span>
                  <span class="font-bold" [class]="isVisio(selectedSeanceModal) ? 'text-[#1C75BC]' : 'text-[#1B1D1F]'">
                    {{ isVisio(selectedSeanceModal) ? 'Visioconférence en direct' : 'Présentiel (' + (selectedSeanceModal.salleOuLien || 'Salle non définie') + ')' }}
                  </span>
                </div>
              </div>

              <!-- Émargement & Assiduité -->
              <div class="p-3.5 border rounded-xs" [class]="selectedSeanceModal.presence?.statut === 'PRESENT' ? 'bg-[#E7F1EA] border-[#276B44]' : selectedSeanceModal.presence?.statut === 'ABSENT' ? 'bg-[#FDE8E8] border-[#ED1C24]' : selectedSeanceModal.presence?.statut === 'RETARD' ? 'bg-[#FDECDD] border-[#F0791E]' : 'bg-[#F5F6F7] border-[#D7DBDE]'">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs uppercase tracking-wider text-[#1B1D1F]">Statut d'émargement :</span>
                  <span class="px-2.5 py-1 rounded-xs font-bold text-xs" [class]="selectedSeanceModal.presence?.statut === 'PRESENT' ? 'bg-[#276B44] text-white' : selectedSeanceModal.presence?.statut === 'ABSENT' ? 'bg-[#ED1C24] text-white' : selectedSeanceModal.presence?.statut === 'RETARD' ? 'bg-[#F0791E] text-white' : 'bg-[#71787E] text-white'">
                    {{ selectedSeanceModal.presence?.statut || 'NON ÉMARGÉ' }}
                  </span>
                </div>
                @if (selectedSeanceModal.presence?.remarqueJustification) {
                  <p class="text-[11px] text-[#4B5157] mt-2 italic bg-white/70 p-2 rounded-xs">
                    Motif / Justification : « {{ selectedSeanceModal.presence!.remarqueJustification }} »
                  </p>
                }
              </div>
            </div>

            <!-- Actions Modal -->
            <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#D7DBDE]">
              <button
                type="button"
                (click)="closeSeanceModal()"
                class="px-4 py-2 rounded-xs border border-[#D7DBDE] text-xs font-semibold text-[#4B5157] hover:bg-[#F5F6F7] cursor-pointer"
              >
                Fermer
              </button>
              @if (isVisio(selectedSeanceModal) && selectedSeanceModal.salleOuLien) {
                <a
                  [href]="selectedSeanceModal.salleOuLien"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-5 py-2 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Rejoindre la visio</span>
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class MesSeancesComponent implements OnInit, OnDestroy {
  loading = true;
  seances: ApprenantSeanceItem[] = [];
  assiduite: ApprenantAssiduite | null = null;
  filter: 'all' | 'upcoming' | 'past' = 'all';
  viewMode: 'list' | 'calendar' = 'list';
  currentWeekMonday: Date = this.getMonday(new Date());
  selectedSeanceModal: ApprenantSeanceItem | null = null;

  private liveSub?: Subscription;
  private bootstrapSub?: Subscription;

  constructor(
    private apprenantService: ApprenantService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    // 1. Rendu instantané depuis le snapshot cache local (0ms !)
    const cachedSeances = this.apprenantService.getSeancesSnapshot();
    const cachedAssiduite = this.apprenantService.getAssiduiteSnapshot();
    if (cachedSeances) {
      this.seances = cachedSeances;
      this.loading = false;
    }
    if (cachedAssiduite) {
      this.assiduite = cachedAssiduite;
    }

    // 2. Synchronisation unifiée avec le flux bootstrap
    this.bootstrapSub = this.apprenantService.bootstrap$.subscribe((data) => {
      if (data?.seances) {
        this.seances = data.seances;
        this.loading = false;
      }
      if (data?.assiduite) {
        this.assiduite = data.assiduite;
      }
    });

    // 3. Revalidation silencieuse en arrière-plan (SWR)
    this.loadData(cachedSeances === null);

    // 4. Synchronisation temps réel automatique
    this.liveSub = this.apprenantService.liveUpdates$.subscribe((evt) => {
      if (
        evt.type === 'SEANCE_UPDATE' ||
        evt.type === 'ASSIDUITE_UPDATE' ||
        evt.type === 'BROADCAST'
      ) {
        this.loadData(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.liveSub?.unsubscribe();
    this.bootstrapSub?.unsubscribe();
  }

  loadData(showSpinner = true): void {
    if (showSpinner) {
      this.loading = true;
    }
    this.apprenantService.getAssiduite().subscribe({
      next: (res) => { this.assiduite = res; },
      error: () => {},
    });

    this.apprenantService.getSeances().subscribe({
      next: (res) => {
        this.seances = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error('Impossible de charger les séances : ' + (err.error?.message || err.message));
      },
    });
  }

  // --- LOGIQUE CALENDRIER HEBDOMADAIRE ---
  getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  previousWeek(): void {
    const d = new Date(this.currentWeekMonday);
    d.setDate(d.getDate() - 7);
    this.currentWeekMonday = d;
  }

  nextWeek(): void {
    const d = new Date(this.currentWeekMonday);
    d.setDate(d.getDate() + 7);
    this.currentWeekMonday = d;
  }

  currentWeek(): void {
    this.currentWeekMonday = this.getMonday(new Date());
  }

  get weekDays(): Array<{ name: string; date: Date; isToday: boolean; seances: ApprenantSeanceItem[] }> {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const todayStr = new Date().toDateString();
    return days.map((name, index) => {
      const date = new Date(this.currentWeekMonday);
      date.setDate(date.getDate() + index);
      const isToday = date.toDateString() === todayStr;
      const seances = this.seances.filter((s) => {
        if (!s.dateHeureDebut) return false;
        const sDate = new Date(s.dateHeureDebut);
        return sDate.toDateString() === date.toDateString();
      }).sort((a, b) => new Date(a.dateHeureDebut).getTime() - new Date(b.dateHeureDebut).getTime());
      return { name, date, isToday, seances };
    });
  }

  get weekLabel(): string {
    const end = new Date(this.currentWeekMonday);
    end.setDate(end.getDate() + 5);
    const startStr = this.currentWeekMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `Semaine du ${startStr} au ${endStr}`;
  }

  get weekSeancesCount(): number {
    return this.weekDays.reduce((acc, d) => acc + d.seances.length, 0);
  }

  openSeanceModal(s: ApprenantSeanceItem): void {
    this.selectedSeanceModal = s;
  }

  closeSeanceModal(): void {
    this.selectedSeanceModal = null;
  }

  isVisio(s: ApprenantSeanceItem): boolean {
    return s.typeSession === 'VISIO' || (!!s.salleOuLien && (s.salleOuLien.startsWith('http://') || s.salleOuLien.startsWith('https://')));
  }

  isUpcoming(dateStr: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() > Date.now();
  }

  get nbUpcoming(): number {
    return this.seances.filter((s) => this.isUpcoming(s.dateHeureDebut)).length;
  }

  get nbPast(): number {
    return this.seances.filter((s) => !this.isUpcoming(s.dateHeureDebut)).length;
  }

  get filteredSeances(): ApprenantSeanceItem[] {
    if (this.filter === 'upcoming') {
      return this.seances.filter((s) => this.isUpcoming(s.dateHeureDebut));
    }
    if (this.filter === 'past') {
      return this.seances.filter((s) => !this.isUpcoming(s.dateHeureDebut));
    }
    return this.seances;
  }
}
