import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
  ApprenantService,
  FormationArborescence,
  EligibiliteCertificat,
  CoursContenu,
  ReleveNotesBulletin,
} from '../../../../core/services/apprenant.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ReleveNotesModalComponent } from './releve-notes-modal.component';
import { CoursePlayerComponent } from './course-player.component';
import { CourseNotesComponent } from './course-notes.component';
import { CourseQaThreadComponent } from './course-qa-thread.component';

@Component({
  selector: 'app-formation-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReleveNotesModalComponent,
    CoursePlayerComponent,
    CourseNotesComponent,
    CourseQaThreadComponent,
  ],
  template: `
    <div class="space-y-8 animate-fade-in">
      <!-- TOP BREADCRUMB & ACTIONS -->
      <div class="flex items-center justify-between gap-3">
        <a
          routerLink="/apprenant/formations"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-white border border-[#D7DBDE] text-xs font-semibold text-[#1C75BC] hover:bg-[#E7F1FA] transition-all shadow-2xs cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour aux formations</span>
        </a>

        <div class="flex items-center gap-2">
          <!-- BOUTON RELEVÉ DE NOTES OFFICIEL -->
          <button
            type="button"
            (click)="ouvrirReleveNotes()"
            class="px-3 py-1.5 rounded-xs bg-white hover:bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Consulter le relevé de notes officiel de la formation"
          >
            <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="hidden sm:inline">Relevé de notes officiel</span>
            <span class="sm:hidden">Notes</span>
          </button>

          <!-- BOUTON ACTUALISER -->
          <button
            type="button"
            (click)="rechargerTout(true)"
            [disabled]="loading"
            class="px-3 py-1.5 rounded-xs bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="Rafraîchir les modules et progressions"
          >
            <svg
              class="w-3.5 h-3.5 text-[#1C75BC]"
              [class.animate-spin]="loading"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span class="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      @if (loading) {
        <div class="p-16 text-center text-[#4B5157] bg-white border border-[#D7DBDE] rounded-xs shadow-xs">
          <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-xs font-semibold text-[#4B5157]">Chargement de l'arborescence pédagogique...</p>
        </div>
      } @else if (data) {
        <!-- HERO FORMATION CARD -->
        <div class="p-6 md:p-8 bg-white border border-[#D7DBDE] rounded-xs space-y-6 shadow-xs">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div class="space-y-2 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-xs bg-[#E7F1FA] border border-[#1C75BC] text-[#1C75BC] text-xs font-bold uppercase tracking-wider">
                  {{ data.formation.etablissement.nom || 'Antenne Officielle' }}
                </span>
                @if (data.formation.certificat) {
                  <span class="px-2.5 py-0.5 rounded-xs bg-[#E7F1EA] text-[#276B44] border border-[#276B44] text-xs font-bold flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Certifié · {{ data.formation.certificat.numeroSerie }}</span>
                  </span>
                }
              </div>

              <h1 class="text-2xl md:text-3xl font-bold text-[#1B1D1F] font-heading">
                {{ data.formation.titre }}
              </h1>
              <div class="barre"></div>
              <p class="text-sm text-[#4B5157] leading-relaxed max-w-3xl pt-2">
                {{ data.formation.description || 'Formation professionnelle qualifiante de Vitalis Center EUP sous la tutelle du Ministère de la Formation Professionnelle.' }}
              </p>

              <!-- BOUTON SYLLABUS OFFICIEL -->
              <div class="pt-2 flex items-center gap-3">
                @if (data.formation.syllabusUrl) {
                  <a
                    [href]="data.formation.syllabusUrl"
                    target="_blank"
                    download
                    class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xs bg-[#E7F1FA] hover:bg-[#D4E8F8] text-[#1C75BC] border border-[#1C75BC] text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    title="Télécharger le syllabus officiel du cours"
                  >
                    <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Syllabus Officiel (PDF)</span>
                    <span class="text-[10px] opacity-75 font-normal">({{ data.formation.syllabusNomFichier || 'Télécharger' }})</span>
                  </a>
                } @else {
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#F5F6F7] text-[#4B5157] border border-[#D7DBDE] text-xs font-semibold"
                    title="Le syllabus officiel est en cours de cadrage par l'équipe pédagogique"
                  >
                    <svg class="w-3.5 h-3.5 text-[#71787E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Syllabus Officiel : En préparation</span>
                  </span>
                }
              </div>
            </div>

            <!-- GLOBAL PROGRESS GAUGE -->
            <div class="p-5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs flex flex-col items-center justify-center min-w-[180px] text-center shadow-2xs">
              <span class="text-3xl font-black font-mono" [class]="data.formation.progressionGlobale === 100 ? 'text-[#276B44]' : 'text-[#1C75BC]'">
                {{ data.formation.progressionGlobale }}%
              </span>
              <span class="text-xs font-semibold text-[#4B5157] mt-1">Complétion Globale</span>
              <div class="w-full bg-[#D7DBDE] h-1.5 mt-3 overflow-hidden rounded-full">
                <div
                  class="h-1.5 transition-all duration-500 rounded-full"
                  [class]="data.formation.progressionGlobale === 100 ? 'bg-[#276B44]' : 'bg-[#1C75BC]'"
                  [style.width.%]="data.formation.progressionGlobale"
                ></div>
              </div>
            </div>
          </div>

          <!-- GAMIFICATION MILESTONE PROGRESS BANNER -->
          @if (data.formation.progressionGlobale > 0) {
            <div
              class="p-3.5 rounded-xs border flex items-center gap-3 shadow-2xs transition-all"
              [class]="data.formation.progressionGlobale === 100 ? 'bg-[#E7F1EA] border-[#276B44] text-[#276B44]' :
                       data.formation.progressionGlobale >= 75 ? 'bg-[#E7F1FA] border-[#1C75BC] text-[#1C75BC]' :
                       data.formation.progressionGlobale >= 50 ? 'bg-[#FFF8E6] border-[#D97706] text-[#B45309]' :
                       'bg-[#F5F6F7] border-[#D7DBDE] text-[#4B5157]'"
            >
              <div class="text-xl">
                {{ data.formation.progressionGlobale === 100 ? '🏆' : data.formation.progressionGlobale >= 75 ? '🚀' : data.formation.progressionGlobale >= 50 ? '⭐' : '🌱' }}
              </div>
              <div class="flex-1 text-xs">
                <span class="font-bold">
                  {{ data.formation.progressionGlobale === 100 ? 'Cursus complété avec succès ! Toutes les leçons sont validées.' :
                     data.formation.progressionGlobale >= 75 ? 'Dernière ligne droite ! Plus de 75% du parcours académique validé.' :
                     data.formation.progressionGlobale >= 50 ? 'Cap des 50% franchi ! Vous êtes à mi-parcours de votre certification.' :
                     'Excellent démarrage ! 25% de la formation complétée.' }}
                </span>
                <span class="ml-2 text-[11px] opacity-80 font-mono">({{ data.formation.progressionGlobale }}% complété)</span>
              </div>
            </div>
          }

          <!-- ALERTE DES ÉCHÉANCES IMMINENTES DE LA FORMATION (STANDARDS CANVAS LMS / COURSERA) -->
          @if (devoirsUrgents.length > 0) {
            <div class="p-4 rounded-xs bg-[#FFF8E6] border border-[#D97706] text-[#B45309] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-xs bg-[#D97706] text-white flex items-center justify-center shrink-0 text-sm font-bold shadow-2xs">
                  ⏰
                </div>
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-[#B45309]">
                    Échéance(s) imminente(s) à surveiller
                  </h4>
                  <p class="text-xs text-[#1B1D1F] mt-0.5">
                    Vous avez <strong>{{ devoirsUrgents.length }} travail(aux) pratique(s)</strong> à rendre très prochainement dans cette formation :
                  </p>
                  <ul class="mt-1 space-y-1">
                    @for (u of devoirsUrgents; track u.id) {
                      <li class="text-[11px] flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full" [class]="u.estEnRetard ? 'bg-[#ED1C24]' : 'bg-[#D97706]'"></span>
                        <strong class="text-[#1B1D1F]">{{ u.titre }}</strong>
                        <span class="font-mono text-[10px]" [class]="u.estEnRetard ? 'text-[#ED1C24] font-bold' : 'text-[#71787E]'">
                          ({{ u.estEnRetard ? 'Délai dépassé !' : 'À rendre pour le ' + (u.dateLimite | date:'dd/MM à HH:mm') }})
                        </span>
                      </li>
                    }
                  </ul>
                </div>
              </div>

              <a
                routerLink="/apprenant/evaluations/depot-devoir"
                class="px-3.5 py-1.5 rounded-xs bg-[#D97706] hover:bg-[#b45309] text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <span>Accéder aux devoirs</span>
                <span>→</span>
              </a>
            </div>
          }

          <!-- BR-03 CERTIFICATION ELIGIBILITY BANNER -->
          @if (eligibilite) {
            <div
              class="p-5 border-l-4 rounded-xs border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-2xs"
              [class]="eligibilite.eligible ? 'bg-[#E7F1EA] border-l-[#276B44] border-[#D7DBDE]' : 'bg-[#FDECDD] border-l-[#F0791E] border-[#D7DBDE]'"
            >
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-xs flex items-center justify-center shrink-0" [class]="eligibilite.eligible ? 'bg-[#276B44] text-white' : 'bg-[#F0791E] text-white'">
                  @if (eligibilite.eligible) {
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  } @else {
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  }
                </div>
                <div>
                  <h2 class="text-xs font-bold uppercase tracking-wider" [class]="eligibilite.eligible ? 'text-[#276B44]' : 'text-[#F0791E]'">
                    {{ eligibilite.eligible ? 'Éligibilité au Certificat Validée (Règle BR-03)' : 'Conditions de Certification (Règle BR-03)' }}
                  </h2>
                  <div class="text-xs mt-1 leading-relaxed" [class]="eligibilite.eligible ? 'text-[#276B44]' : 'text-[#1B1D1F]'">
                    @if (eligibilite.dejaEmis) {
                      <span>Votre certificat officiel a été émis et est disponible au téléchargement direct.</span>
                    } @else if (eligibilite.eligible) {
                      <span>Félicitations ! Vous remplissez les critères (100% cours et moyenne $\ge$ 10/20). Votre certificat officiel est généré.</span>
                    } @else {
                      <span>{{ eligibilite.raison || 'Complétez l\'ensemble des cours et maintenez une moyenne $\ge$ 10/20 pour débloquer votre certificat.' }}</span>
                    }
                  </div>
                  <div class="flex items-center gap-4 text-[11px] text-[#4B5157] mt-2">
                    <span class="flex items-center gap-1 font-mono">
                      <span>Progression :</span>
                      <strong>{{ eligibilite.completionRate }}%</strong> / 100%
                    </span>
                    <span class="flex items-center gap-1 font-mono">
                      <span>Moyenne :</span>
                      <strong>{{ eligibilite.moyenne }} / 20</strong>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Actions Certificat BR-03 Fiabilisées (Sans 404) -->
              @if (eligibilite.dejaEmis && eligibilite.certificat) {
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <a
                    routerLink="/apprenant/certificats"
                    class="px-3.5 py-2.5 rounded-xs bg-white text-[#276B44] border border-[#276B44] hover:bg-[#E7F1EA] text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                    title="Voir dans le registre officiel des certificats"
                  >
                    <svg class="w-4 h-4 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Voir Certificat</span>
                  </a>

                  <button
                    type="button"
                    (click)="telechargerCertificat(eligibilite.certificat.id, eligibilite.certificat.numeroSerie)"
                    [disabled]="downloadingCert"
                    class="px-4 py-2.5 rounded-xs bg-[#276B44] hover:bg-[#1e5234] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60 transition-all"
                  >
                    @if (downloadingCert) {
                      <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Téléchargement...</span>
                    } @else {
                      <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Télécharger PDF</span>
                    }
                  </button>
                </div>
              } @else if (eligibilite.eligible && !eligibilite.dejaEmis) {
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <button
                    type="button"
                    (click)="genererMonCertificat()"
                    [disabled]="generatingCert"
                    class="px-4 py-2.5 rounded-xs bg-[#276B44] hover:bg-[#1e5234] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60 transition-all"
                  >
                    @if (generatingCert) {
                      <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Génération en cours...</span>
                    } @else {
                      <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span>Générer mon Certificat Officiel</span>
                    }
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- MODULES & ARBORESCENCE -->
        @if (data.modules.length === 0) {
          <div class="p-12 text-center bg-white border border-[#D7DBDE] rounded-xs space-y-4 shadow-xs">
            <div class="w-16 h-16 rounded-xs bg-[#FDECDD] text-[#F0791E] flex items-center justify-center mx-auto border border-[#F0791E]/30">
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div class="space-y-1">
              <h3 class="text-base font-bold text-[#1B1D1F]">Modules en cours de préparation</h3>
              <p class="text-xs text-[#4B5157] max-w-md mx-auto leading-relaxed">
                L'équipe pédagogique et les formateurs de votre établissement finalisent actuellement les supports et ressources de cette formation. Ils seront débloqués très prochainement.
              </p>
            </div>
            <div class="pt-2">
              <a
                routerLink="/apprenant/formations"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <span>Retourner à mes formations</span>
              </a>
            </div>
          </div>
        } @else {
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-bold text-[#1B1D1F] font-heading">
                  Modules de la Formation ({{ data.modules.length }})
                </h2>
                <div class="barre"></div>
              </div>
              <span class="text-xs text-[#4B5157]">Parcours chronologique</span>
            </div>

            <div class="space-y-4">
            @for (mod of data.modules; track mod.id; let modIdx = $index) {
              <div class="bg-white border border-[#D7DBDE] rounded-xs overflow-hidden transition-all shadow-xs">
                <!-- Module Header -->
                <div
                  (click)="toggleModule(mod.id)"
                  class="p-5 cursor-pointer hover:bg-[#F5F6F7] flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D7DBDE]"
                >
                  <div class="flex items-center gap-4 flex-1">
                    <div class="w-8 h-8 rounded-xs bg-[#E7F1FA] text-[#1C75BC] font-bold flex items-center justify-center text-xs border border-[#1C75BC] font-mono">
                      {{ mod.ordre }}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-sm font-bold text-[#1B1D1F]">{{ mod.titre }}</h3>
                        <span class="text-[10px] text-[#4B5157] font-semibold">Coeff. {{ mod.coefficient }}</span>
                      </div>
                      <div class="flex items-center gap-4 text-[11px] text-[#4B5157] mt-1">
                        <span class="flex items-center gap-1">
                          <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span>{{ mod.completedCours }}/{{ mod.totalCours }} cours</span>
                        </span>
                        <span class="flex items-center gap-1">
                          <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{{ mod.quiz.length }} quiz</span>
                        </span>
                        <span class="flex items-center gap-1">
                          <svg class="w-3.5 h-3.5 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span>{{ mod.devoirs.length }} devoirs</span>
                        </span>
                        @if (mod.evaluations && mod.evaluations.length > 0) {
                          <span class="flex items-center gap-1">
                            <svg class="w-3.5 h-3.5 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{{ mod.evaluations.length }} éval.</span>
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-4 justify-between md:justify-end">
                    <div class="flex items-center gap-2">
                      <span
                        class="px-2.5 py-0.5 rounded-xs text-[10px] font-bold uppercase"
                        [class]="mod.statut === 'termine' ? 'bg-[#E7F1EA] text-[#276B44] border border-[#276B44]' : mod.statut === 'en_cours' ? 'bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]' : 'bg-[#F5F6F7] text-[#4B5157] border border-[#D7DBDE]'"
                      >
                        {{ mod.statut === 'termine' ? 'Terminé' : mod.statut === 'en_cours' ? 'En cours' : 'Non commencé' }}
                      </span>
                      <span class="text-xs font-bold text-[#1B1D1F] min-w-[35px] text-right font-mono">{{ mod.pourcentage }}%</span>
                    </div>
                    <svg class="w-4 h-4 text-[#4B5157] transform transition-transform" [class.rotate-180]="isExpanded(mod.id)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <!-- Module Content Tree (if expanded) -->
                @if (isExpanded(mod.id)) {
                  <div class="p-5 bg-[#F5F6F7] space-y-6 animate-fade-in">
                    <!-- 1. COURS -->
                    <div class="space-y-2">
                      <h4 class="text-xs font-bold text-[#4B5157] uppercase tracking-wider flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Cours & Ressources Pédagogiques</span>
                      </h4>

                      @if (mod.cours.length === 0) {
                        <p class="text-xs text-[#4B5157] italic p-3 bg-white rounded-xs border border-[#D7DBDE]">
                          Aucun cours publié dans ce module pour le moment.
                        </p>
                      } @else {
                        <div class="space-y-2">
                          @for (c of mod.cours; track c.id) {
                            <div class="p-3 sm:p-3.5 bg-white border border-[#D7DBDE] rounded-xs shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-[#1C75BC] transition-all">
                              <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0" [class]="c.complete ? 'bg-[#E7F1EA] text-[#276B44]' : 'bg-[#E7F1FA] text-[#1C75BC]'">
                                  @if (c.complete) {
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  } @else {
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  }
                                </div>
                                <div class="min-w-0 flex-1">
                                  <p class="text-xs font-semibold text-[#1B1D1F] break-words">{{ c.titre }}</p>
                                  <div class="flex items-center gap-2 text-[10px] text-[#4B5157] mt-0.5 flex-wrap">
                                    @if (c.dureeMinutes) {
                                      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-[#F5F6F7] border border-[#D7DBDE] text-[#4B5157] font-semibold text-[10px]">
                                        <svg class="w-3 h-3 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>~{{ c.dureeMinutes }} min</span>
                                      </span>
                                    }
                                    @if (c.hasMedia) {
                                      <span class="px-1.5 py-0.2 rounded-xs bg-[#E7F1FA] text-[#1C75BC] font-semibold">Document / Média</span>
                                    }
                                    @if (c.complete) {
                                      <span class="text-[#276B44] font-semibold">Terminé le {{ c.dateTerminaison | date:'dd/MM/yyyy' }}</span>
                                    }
                                  </div>
                                </div>
                              </div>

                              <button
                                (click)="openCoursViewer(c.id)"
                                class="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer shrink-0"
                              >
                                <span>{{ c.complete ? 'Revoir' : 'Lire le cours' }}</span>
                                <span>→</span>
                              </button>
                            </div>
                          }
                        </div>
                      }
                    </div>

                    <!-- 2. QUIZ -->
                    @if (mod.quiz.length > 0) {
                      <div class="space-y-2 pt-2 border-t border-[#D7DBDE]">
                        <h4 class="text-xs font-bold text-[#4B5157] uppercase tracking-wider flex items-center gap-1.5">
                          <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Quiz d'Évaluation</span>
                        </h4>
                        <div class="space-y-2">
                          @for (q of mod.quiz; track q.id) {
                            <div class="p-3 sm:p-3.5 bg-white border border-[#D7DBDE] rounded-xs shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                              <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0" [class]="q.passe ? 'bg-[#E7F1EA] text-[#276B44]' : 'bg-[#E7F1FA] text-[#1C75BC]'">
                                  @if (q.passe) {
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  } @else {
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  }
                                </div>
                                <div class="min-w-0 flex-1">
                                  <p class="text-xs font-semibold text-[#1B1D1F] break-words">{{ q.titre }}</p>
                                  <p class="text-[10px] text-[#4B5157]">
                                    @if (q.passe) {
                                      <span class="text-[#276B44] font-bold font-mono">Score obtenu : {{ q.score }}%</span>
                                    } @else {
                                      <span>Durée : {{ q.dureeMinutes ? q.dureeMinutes + ' min' : 'Non chronométré' }}</span>
                                    }
                                  </p>
                                </div>
                              </div>

                              <a
                                [routerLink]="['/apprenant/evaluations/quiz-player', q.id]"
                                class="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xs text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 text-center cursor-pointer"
                                [class]="q.passe ? 'bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] hover:bg-[#D7DBDE]' : 'bg-[#1C75BC] text-white hover:bg-[#124F80] shadow-xs'"
                              >
                                <span>{{ q.passe ? 'Voir résultat' : 'Passer le Quiz' }}</span>
                                <span>→</span>
                              </a>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- 3. DEVOIRS -->
                    @if (mod.devoirs.length > 0) {
                      <div class="space-y-2 pt-2 border-t border-[#D7DBDE]">
                        <h4 class="text-xs font-bold text-[#4B5157] uppercase tracking-wider flex items-center gap-1.5">
                          <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span>Devoirs Pratiques</span>
                        </h4>
                        <div class="space-y-2">
                          @for (d of mod.devoirs; track d.id) {
                            <div class="p-3 sm:p-3.5 bg-white border border-[#D7DBDE] rounded-xs shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                              <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0" [class]="d.soumis ? 'bg-[#E7F1EA] text-[#276B44]' : 'bg-[#FDECDD] text-[#F0791E]'">
                                  @if (d.soumis) {
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  } @else {
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  }
                                </div>
                                <div class="min-w-0 flex-1">
                                  <p class="text-xs font-semibold text-[#1B1D1F] break-words">{{ d.titre }}</p>
                                  <p class="text-[10px] text-[#4B5157]">
                                    @if (d.note !== null) {
                                      <span class="text-[#276B44] font-bold font-mono">Note : {{ d.note }}/20</span>
                                    } @else if (d.soumis) {
                                      <span class="text-[#1C75BC] font-medium">Déposé le {{ d.dateDepot | date:'dd/MM/yyyy' }} · En attente de notation</span>
                                    } @else {
                                      <span [class]="d.estEnRetard ? 'text-[#ED1C24] font-bold' : 'text-[#4B5157]'">
                                        Date limite : {{ d.dateLimite ? (d.dateLimite | date:'dd/MM/yyyy à HH:mm') : 'Aucune' }}
                                      </span>
                                    }
                                  </p>
                                  @if (d.criteresEvaluation) {
                                    <div class="mt-1 flex items-start gap-1.5 text-[10px] bg-[#F5F6F7] p-2 rounded-xs border border-[#D7DBDE]">
                                      <span class="font-bold text-[#1C75BC] shrink-0">Critères d'évaluation :</span>
                                      <span class="text-[#1B1D1F] whitespace-pre-line">{{ d.criteresEvaluation }}</span>
                                    </div>
                                  }
                                </div>
                              </div>

                              <a
                                routerLink="/apprenant/evaluations/depot-devoir"
                                [queryParams]="{ devoirId: d.id }"
                                class="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xs bg-[#F0791E] hover:bg-[#d96612] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1 shrink-0 text-center cursor-pointer"
                              >
                                <span>{{ d.soumis ? 'Voir soumission' : 'Déposer mon travail' }}</span>
                                <span>→</span>
                              </a>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- 4. CONTRÔLES & ÉVALUATIONS CONTINUES -->
                    @if (mod.evaluations && mod.evaluations.length > 0) {
                      <div class="space-y-2 pt-2 border-t border-[#D7DBDE]">
                        <h4 class="text-xs font-bold text-[#4B5157] uppercase tracking-wider flex items-center gap-1.5">
                          <svg class="w-4 h-4 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Contrôles & Évaluations Continues</span>
                        </h4>
                        <div class="space-y-2">
                          @for (ev of mod.evaluations; track ev.id) {
                            <div class="p-3 sm:p-3.5 bg-white border border-[#D7DBDE] rounded-xs shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                              <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0" [class]="ev.note !== null ? 'bg-[#E7F1EA] text-[#276B44]' : 'bg-[#F5F6F7] text-[#4B5157]'">
                                  @if (ev.note !== null) {
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  } @else {
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  }
                                </div>
                                <div class="min-w-0 flex-1">
                                  <p class="text-xs font-semibold text-[#1B1D1F] break-words">{{ ev.titre }}</p>
                                  <p class="text-[10px] text-[#4B5157]">
                                    @if (ev.note !== null) {
                                      <span class="text-[#276B44] font-bold font-mono">Note : {{ ev.note }} / {{ ev.noteMaximale }}</span>
                                      @if (ev.dateNotation) {
                                        <span> · Noté le {{ ev.dateNotation | date:'dd/MM/yyyy' }}</span>
                                      }
                                    } @else {
                                      <span>Évaluation en cours · Barème : /{{ ev.noteMaximale }}</span>
                                    }
                                  </p>
                                </div>
                              </div>

                              <div class="flex items-center gap-2 shrink-0">
                                @if (ev.note !== null) {
                                  <span
                                    class="px-2.5 py-1 rounded-xs text-[10px] font-bold uppercase font-mono"
                                    [class]="(ev.note / ev.noteMaximale) >= 0.5 ? 'bg-[#E7F1EA] text-[#276B44] border border-[#276B44]' : 'bg-[#FDE8E8] text-[#ED1C24] border border-[#ED1C24]'"
                                  >
                                    {{ (ev.note / ev.noteMaximale) >= 0.5 ? 'Validé' : 'Insuffisant' }}
                                  </span>
                                } @else {
                                  <span class="px-2.5 py-1 rounded-xs bg-[#F5F6F7] text-[#4B5157] border border-[#D7DBDE] text-[10px] font-semibold">
                                    En attente
                                  </span>
                                }
                              </div>
                            </div>
                          }
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
    }

      <!-- MODAL / INTEGRATED COURS & MULTIMEDIA VIEWER -->
      @if (activeCours) {
        <div
          (click)="closeCoursViewer()"
          class="fixed inset-0 z-50 bg-[#1B1D1F]/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in"
        >
          <div
            (click)="$event.stopPropagation()"
            class="bg-white w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-[#D7DBDE] shadow-2xl rounded-xs"
          >
            <!-- Modal Header -->
            <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#D7DBDE] flex items-center justify-between bg-[#124F80] shrink-0 gap-3">
              <div class="min-w-0 flex-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#F0791E] truncate block">
                  {{ activeCours.module.titre }}
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white mt-0.5 truncate">{{ activeCours.titre }}</h2>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                @if (activeCours.fileUrl) {
                  <a
                    [href]="activeCours.fileUrl"
                    target="_blank"
                    class="px-2.5 sm:px-3 py-1.5 rounded-xs bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <span>↗</span>
                    <span class="hidden sm:inline">Plein écran</span>
                  </a>
                }
                <button
                  (click)="closeCoursViewer()"
                  class="w-7 h-7 sm:w-8 sm:h-8 rounded-xs bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Modal Nav Tabs -->
            <div class="px-4 sm:px-6 pt-2 sm:pt-3 border-b border-[#D7DBDE] bg-[#F5F6F7] flex items-center gap-2 shrink-0 overflow-x-auto">
              @if (activeCours.fileUrl) {
                <button
                  (click)="viewerTab = 'media'"
                  class="px-3 sm:px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  [class]="viewerTab === 'media' ? 'border-[#1C75BC] text-[#1C75BC] bg-white' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Support & Média</span>
                </button>
              }
              <button
                (click)="viewerTab = 'contenu'"
                class="px-3 sm:px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                [class]="viewerTab === 'contenu' ? 'border-[#1C75BC] text-[#1C75BC] bg-white' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Contenu du cours</span>
              </button>
              <button
                (click)="viewerTab = 'notes'"
                class="px-3 sm:px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                [class]="viewerTab === 'notes' ? 'border-[#1C75BC] text-[#1C75BC] bg-white' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Mes Notes d'Étude</span>
              </button>
              <button
                (click)="viewerTab = 'questions'"
                class="px-3 sm:px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                [class]="viewerTab === 'questions' ? 'border-[#1C75BC] text-[#1C75BC] bg-white' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Poser une Question</span>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
              <!-- MEDIA TAB -->
              @if (viewerTab === 'media' && activeCours.fileUrl) {
                <app-course-player
                  [cours]="activeCours"
                  [safeMediaUrl]="safeMediaUrl"
                  [marking]="marking"
                  (markComplete)="markAsRead($event)"
                  (timeUpdate)="onPlayerTimeUpdate($event)"
                  (timestampNote)="onPlayerTimestampNote($event)"
                ></app-course-player>
              }

              <!-- TEXT / CONTENT TAB -->
              @if (viewerTab === 'contenu') {
                @if (activeCours.contenu) {
                  <div class="bg-white p-6 md:p-8 border border-[#D7DBDE] rounded-xs shadow-xs">
                    <div class="prose prose-slate max-w-none text-xs leading-relaxed text-[#1B1D1F] whitespace-pre-line">
                      {{ activeCours.contenu }}
                    </div>
                  </div>
                } @else {
                  <p class="text-xs text-[#4B5157] italic text-center p-8 bg-white border border-[#D7DBDE] rounded-xs">
                    Aucun contenu textuel spécifique pour ce cours.
                  </p>
                }
              }

              <!-- PERSONAL NOTES TAB -->
              @if (viewerTab === 'notes') {
                <app-course-notes
                  [notes]="notesPersonnelles"
                  [currentVideoTime]="currentVideoTime"
                  [saving]="savingNotes"
                  (saveNotes)="onSaveNotes($event)"
                ></app-course-notes>
              }

              <!-- Q&A TAB -->
              @if (viewerTab === 'questions') {
                <app-course-qa-thread
                  [coursId]="activeCours.id"
                ></app-course-qa-thread>
              }
            </div>

            <!-- Modal Footer with Mark Progress -->
            <div class="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#D7DBDE] bg-[#F5F6F7] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div>
                @if (activeCours.complete) {
                  <span class="inline-flex items-center gap-1.5 text-xs font-bold text-[#276B44]">
                    <svg class="w-4 h-4 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Cours validé et complété</span>
                  </span>
                }
              </div>

              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <button
                  (click)="closeCoursViewer()"
                  class="w-full sm:w-auto px-4 py-2 rounded-xs bg-white hover:bg-[#D7DBDE] border border-[#D7DBDE] text-[#1B1D1F] text-xs font-bold transition-all shadow-2xs cursor-pointer text-center"
                >
                  Fermer
                </button>

                @if (!activeCours.complete) {
                  <button
                    (click)="markAsRead(activeCours.id)"
                    [disabled]="marking"
                    class="w-full sm:w-auto px-5 py-2 rounded-xs bg-[#276B44] hover:bg-[#1e5234] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <svg class="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{{ marking ? 'Validation...' : 'Marquer comme lu et terminé' }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- MODAL RELEVÉ DE NOTES OFFICIEL -->
      <!-- MODAL RELEVÉ DE NOTES OFFICIEL (Composant Standalone) -->
      <app-releve-notes-modal
        [isOpen]="releveNotesModalOpen"
        [loading]="loadingReleve"
        [releve]="releveBulletin"
        (close)="fermerReleveNotes()"
      ></app-releve-notes-modal>
    </div>
  `,
})
export class FormationDetailComponent implements OnInit, OnDestroy {
  formationId = '';
  data: FormationArborescence | null = null;
  eligibilite: EligibiliteCertificat | null = null;
  loading = true;
  expandedModules = new Set<string>();
  private liveSub: Subscription | null = null;

  // Relevé de notes officiel state
  releveNotesModalOpen = false;
  loadingReleve = false;
  releveBulletin: ReleveNotesBulletin | null = null;

  // Viewer state
  activeCours: CoursContenu | null = null;
  viewerTab: 'media' | 'contenu' | 'notes' | 'questions' = 'media';
  safeMediaUrl: SafeResourceUrl | null = null;
  marking = false;
  downloadingCert = false;
  generatingCert = false;
  notesPersonnelles = '';
  savingNotes = false;
  questionTexte = '';
  sendingQuestion = false;

  // Coursera/Udemy style video playback state
  currentVideoTime = 0;
  savedPlaybackTime = 0;
  selectedPlaybackRate = 1;

  get devoirsUrgents(): Array<{ id: string; titre: string; dateLimite: string | null; estEnRetard: boolean }> {
    if (!this.data) return [];
    const list: Array<{ id: string; titre: string; dateLimite: string | null; estEnRetard: boolean }> = [];
    const now = Date.now();
    for (const m of this.data.modules) {
      for (const d of m.devoirs) {
        if (!d.soumis && d.dateLimite) {
          const limit = new Date(d.dateLimite).getTime();
          const diffHours = (limit - now) / (1000 * 3600);
          if (diffHours < 48 || d.estEnRetard) {
            list.push({
              id: d.id,
              titre: d.titre,
              dateLimite: d.dateLimite,
              estEnRetard: d.estEnRetard || diffHours < 0,
            });
          }
        }
      }
    }
    return list;
  }

  constructor(
    private route: ActivatedRoute,
    private apprenantService: ApprenantService,
    private toast: ToastService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.formationId = this.route.snapshot.paramMap.get('id') || '';
    if (this.formationId) {
      // 1. Rendu instantané depuis le snapshot cache local (0ms !)
      const cached = this.apprenantService.getFormationModulesSnapshot(this.formationId);
      if (cached) {
        this.data = cached;
        if (cached.modules.length > 0) {
          this.expandedModules.add(cached.modules[0].id);
        }
        this.loading = false;
      }
      // 2. Revalidation en tâche de fond
      this.loadFormationTree(cached === null);
      this.loadEligibilite();

      // 3. Abonnement réactif temps réel SSE
      this.liveSub = this.apprenantService.liveUpdates$.subscribe(() => {
        this.loadFormationTree(false);
        this.loadEligibilite();
      });
    }
  }

  ngOnDestroy() {
    this.liveSub?.unsubscribe();
  }

  loadFormationTree(showSpinner = true) {
    if (showSpinner) {
      this.loading = true;
    }
    this.apprenantService.getFormationModules(this.formationId).subscribe({
      next: (res) => {
        this.data = res;
        // Expand first module by default if none expanded
        if (this.expandedModules.size === 0 && res.modules.length > 0) {
          this.expandedModules.add(res.modules[0].id);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Erreur lors du chargement de la formation.');
      },
    });
  }

  loadEligibilite() {
    this.apprenantService.getEligibiliteCertificat(this.formationId).subscribe({
      next: (res) => {
        this.eligibilite = res;
      },
      error: () => {},
    });
  }

  rechargerTout(isManual = false) {
    this.loadFormationTree(isManual);
    this.loadEligibilite();
    if (isManual) {
      this.toast.success('Détails de la formation actualisés avec succès.');
    }
  }

  telechargerCertificat(certificatId: string, numeroSerie: string) {
    if (this.downloadingCert) return;
    this.downloadingCert = true;

    this.apprenantService.telechargerCertificat(certificatId).subscribe({
      next: (blob: Blob) => {
        this.downloadingCert = false;
        if (!blob || blob.size === 0) {
          this.toast.error('Le document PDF est vide.');
          return;
        }
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${numeroSerie}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        this.toast.success(`Certificat ${numeroSerie} téléchargé avec succès.`);
      },
      error: (err) => {
        this.downloadingCert = false;
        console.error('Erreur téléchargement certificat:', err);
        this.toast.error('Erreur lors du téléchargement du certificat.');
      },
    });
  }

  genererMonCertificat(): void {
    if (this.generatingCert) return;
    this.generatingCert = true;
    this.apprenantService.genererCertificat(this.formationId).subscribe({
      next: (cert) => {
        this.generatingCert = false;
        this.toast.success(`Félicitations ! Votre certificat N° ${cert.numeroSerie} a été généré avec succès.`);
        this.loadEligibilite();
        this.loadFormationTree(false);
      },
      error: (err) => {
        this.generatingCert = false;
        this.toast.error(err.error?.message || 'Erreur lors de la génération du certificat.');
      },
    });
  }

  toggleModule(moduleId: string) {
    if (this.expandedModules.has(moduleId)) {
      this.expandedModules.delete(moduleId);
    } else {
      this.expandedModules.add(moduleId);
    }
  }

  isExpanded(moduleId: string): boolean {
    return this.expandedModules.has(moduleId);
  }

  openCoursViewer(coursId: string) {
    this.apprenantService.getCoursContenu(coursId).subscribe({
      next: (c) => {
        this.activeCours = c;
        this.viewerTab = c.fileUrl ? 'media' : 'contenu';
        this.safeMediaUrl = c.fileUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(c.fileUrl) : null;
        this.notesPersonnelles = c.notesPersonnelles || '';
        this.questionTexte = '';

        // Restauration de l'horodatage de lecture
        const saved = localStorage.getItem('playback_' + c.id);
        this.savedPlaybackTime = saved ? parseFloat(saved) : 0;
        this.currentVideoTime = 0;
        this.selectedPlaybackRate = 1;
      },
      error: () => {
        this.toast.error('Impossible de charger le contenu du cours.');
      },
    });
  }

  onVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video) {
      this.currentVideoTime = Math.floor(video.currentTime);
      if (this.activeCours && this.currentVideoTime > 3) {
        localStorage.setItem('playback_' + this.activeCours.id, this.currentVideoTime.toString());
      }
    }
  }

  setPlaybackRate(rate: number, videoEl: HTMLVideoElement): void {
    this.selectedPlaybackRate = rate;
    if (videoEl) {
      videoEl.playbackRate = rate;
    }
  }

  reprendreLecture(videoEl: HTMLVideoElement): void {
    if (videoEl && this.savedPlaybackTime > 0) {
      videoEl.currentTime = this.savedPlaybackTime;
      videoEl.play();
      this.toast.info(`Lecture reprise à ${this.formatVideoSeconds(this.savedPlaybackTime)}`);
      this.savedPlaybackTime = 0;
    }
  }

  formatVideoSeconds(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  onPlayerTimeUpdate(time: number): void {
    this.currentVideoTime = time;
  }

  onPlayerTimestampNote(time: number): void {
    this.currentVideoTime = time;
    this.viewerTab = 'notes';
    this.insererMinutageNotes();
  }

  onSaveNotes(newNotes: string): void {
    if (!this.activeCours) return;
    this.notesPersonnelles = newNotes;
    this.sauvegarderNotes();
  }

  insererMinutageNotes(): void {
    const tag = ` [⏱ ${this.formatVideoSeconds(this.currentVideoTime)}] `;
    this.notesPersonnelles = (this.notesPersonnelles || '') + tag;
    this.toast.success('Minutage inséré dans vos notes.');
  }

  sauvegarderNotes() {
    if (!this.activeCours) return;
    this.savingNotes = true;
    this.apprenantService.sauvegarderNotesPersonnelles(this.activeCours.id, this.notesPersonnelles).subscribe({
      next: () => {
        this.savingNotes = false;
        if (this.activeCours) this.activeCours.notesPersonnelles = this.notesPersonnelles;
        this.toast.success('Notes d\'étude enregistrées avec succès.');
      },
      error: () => {
        this.savingNotes = false;
        this.toast.error('Erreur lors de l\'enregistrement des notes.');
      },
    });
  }

  poserQuestion() {
    if (!this.activeCours || !this.questionTexte.trim()) return;
    this.sendingQuestion = true;
    this.apprenantService.poserQuestionCours(this.activeCours.id, this.questionTexte.trim()).subscribe({
      next: (res) => {
        this.sendingQuestion = false;
        this.questionTexte = '';
        this.toast.success(res.message || 'Question transmise à l\'équipe pédagogique.');
      },
      error: (err) => {
        this.sendingQuestion = false;
        this.toast.error(err.error?.message || 'Erreur lors de l\'envoi de la question.');
      },
    });
  }

  isPdf(url: string): boolean {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return clean.endsWith('.pdf');
  }

  isVideo(url: string): boolean {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.ogg');
  }

  isImage(url: string): boolean {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.png') || clean.endsWith('.webp') || clean.endsWith('.svg');
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.activeCours) {
      this.closeCoursViewer();
    }
  }

  closeCoursViewer() {
    this.activeCours = null;
    this.safeMediaUrl = null;
  }

  markAsRead(coursId: string) {
    this.marking = true;

    // --- MISE À JOUR OPTIMISTE IMMÉDIATE (0ms UX) ---
    if (this.activeCours) {
      this.activeCours.complete = true;
    }
    if (this.data) {
      let totalAll = 0;
      let completedAll = 0;
      for (const m of this.data.modules) {
        const found = m.cours.find((c) => c.id === coursId);
        if (found) {
          found.complete = true;
        }
        m.completedCours = m.cours.filter((c) => c.complete).length;
        m.pourcentage = m.totalCours > 0 ? Math.round((m.completedCours / m.totalCours) * 100) : 100;
        if (m.pourcentage === 100) {
          m.statut = 'termine';
        } else if (m.pourcentage > 0) {
          m.statut = 'en_cours';
        }
        totalAll += m.totalCours;
        completedAll += m.completedCours;
      }
      this.data.formation.progressionGlobale =
        totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;
    }

    this.toast.success('Progression enregistrée avec succès.');

    // Appel API en tâche de fond pour synchronisation serveur
    this.apprenantService.markCoursProgression(coursId).subscribe({
      next: (res) => {
        this.marking = false;
        this.loadEligibilite();
        if (res.certificatEmis) {
          this.toast.success('Félicitations ! Votre certificat officiel a été émis.');
        }
      },
      error: () => {
        this.marking = false;
        this.toast.error('Erreur lors de la synchronisation serveur.');
      },
    });
  }

  ouvrirReleveNotes(): void {
    this.releveNotesModalOpen = true;
    this.loadingReleve = true;
    this.apprenantService.getReleveNotes(this.formationId).subscribe({
      next: (res) => {
        this.releveBulletin = res;
        this.loadingReleve = false;
      },
      error: (err) => {
        this.loadingReleve = false;
        this.toast.error('Impossible de charger le relevé de notes : ' + (err.error?.message || err.message));
      },
    });
  }

  fermerReleveNotes(): void {
    this.releveNotesModalOpen = false;
  }

  imprimerReleveNotes(): void {
    window.print();
  }
}

