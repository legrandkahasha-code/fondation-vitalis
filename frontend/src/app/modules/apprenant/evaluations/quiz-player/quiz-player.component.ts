import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ApprenantService,
  QuizDetail,
  QuizSubmissionResult,
} from '../../../../core/services/apprenant.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-quiz-player',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <!-- TOP NAVIGATION -->
      <div class="flex items-center justify-between">
        <a
          routerLink="/apprenant/evaluations/depot-devoir"
          [queryParams]="{ tab: 'quiz' }"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-white border border-[#D7DBDE] text-xs font-semibold text-[#1C75BC] hover:bg-[#E7F1FA] transition-all shadow-2xs cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Retour aux évaluations</span>
        </a>

        @if (quiz && !quiz.tentative && !result && timeLeftSeconds > 0) {
          <div class="flex items-center gap-2 px-3.5 py-1.5 rounded-xs bg-[#124F80] text-white text-xs font-bold font-mono shadow-xs">
            <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ formatTime(timeLeftSeconds) }}</span>
          </div>
        }
      </div>

      <!-- ÉTAT 1 : CHARGEMENT INITIAL (AVEC INDICATEUR PROGRESSIF) -->
      @if (loading && !quiz) {
        <div class="p-12 md:p-16 text-center text-[#4B5157] bg-white border border-[#D7DBDE] rounded-xs shadow-xs space-y-4">
          <div class="inline-block w-10 h-10 border-3 border-[#1C75BC] border-t-[#F0791E] rounded-full animate-spin"></div>
          <div class="space-y-1">
            <h3 class="text-sm font-bold text-[#1B1D1F]">Chargement de votre évaluation</h3>
            <p class="text-xs text-[#71787E]">Préparation du sujet sécurisé et synchronisation du chronomètre...</p>
          </div>
          @if (isSlowLoading) {
            <div class="p-3.5 bg-[#E7F1FA] border border-[#1C75BC] rounded-xs text-xs text-[#1C75BC] max-w-md mx-auto space-y-1 animate-fade-in">
              <p class="font-bold flex items-center justify-center gap-1.5">
                <svg class="w-4 h-4 animate-pulse text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connexion sécurisée en cours d'établissement
              </p>
              <p class="text-[11px] text-[#4B5157]">
                Le serveur académique initialise votre session. L'évaluation va s'afficher instantanément.
              </p>
            </div>
          }
        </div>
      } @else if (errorMessage && !quiz) {
        <!-- ÉTAT 2 : ERREUR RÉSILIENTE AVEC BOUTON DE RÉESSAI (AUCUN ÉCRAN VIDE) -->
        <div class="p-8 md:p-12 text-center bg-white border border-[#ED1C24]/30 rounded-xs shadow-xs space-y-5 animate-fade-in">
          <div class="w-14 h-14 rounded-xs bg-[#FDECEA] text-[#ED1C24] flex items-center justify-center mx-auto border-b-2 border-[#ED1C24]">
            <svg class="w-7 h-7 text-[#ED1C24]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="space-y-1 max-w-md mx-auto">
            <h3 class="text-base font-bold text-[#1B1D1F]">Impossible de charger l'évaluation</h3>
            <p class="text-xs text-[#4B5157]">{{ errorMessage }}</p>
          </div>
          <div class="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              (click)="loadQuiz(false)"
              class="px-5 py-2.5 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Réessayer maintenant</span>
            </button>
            <a
              routerLink="/apprenant/evaluations/depot-devoir"
              [queryParams]="{ tab: 'quiz' }"
              class="px-4 py-2.5 rounded-xs border border-[#D7DBDE] text-[#4B5157] hover:bg-[#F5F6F7] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              Retour aux évaluations
            </a>
          </div>
        </div>
      } @else if (quiz) {
        <!-- QUIZ ALREADY COMPLETED SCREEN -->
        @if (quiz.tentative && !result) {
          <div class="p-8 md:p-12 bg-white border border-[#D7DBDE] rounded-xs text-center space-y-6 shadow-xs animate-fade-in">
            <div class="w-14 h-14 rounded-xs bg-[#E7F1FA] text-[#1C75BC] flex items-center justify-center mx-auto border-b-2 border-[#F0791E]">
              <svg class="w-7 h-7 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div class="space-y-2">
              <span class="px-2.5 py-0.5 rounded-xs bg-[#E7F1EA] text-[#276B44] border border-[#276B44] text-xs font-bold uppercase tracking-wider">
                Évaluation Déjà Soumise
              </span>
              <h1 class="text-2xl font-bold text-[#1B1D1F]">{{ quiz.titre }}</h1>
              <p class="text-xs text-[#4B5157]">{{ quiz.formationTitre }}</p>
            </div>

            <div class="p-6 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs max-w-sm mx-auto shadow-2xs">
              <span class="text-4xl font-black text-[#1C75BC] font-mono">{{ quiz.tentative.score }}%</span>
              <p class="text-xs text-[#4B5157] mt-1 font-mono">Score enregistré le {{ quiz.tentative.datePassage | date:'dd/MM/yyyy à HH:mm' }}</p>
            </div>

            <p class="text-xs text-[#4B5157] max-w-md mx-auto leading-relaxed">
              Conformément au règlement pédagogique ministériel, une seule tentative est autorisée par évaluation. Ce score est comptabilisé dans votre moyenne générale.
            </p>

            <div>
              <a
                routerLink="/apprenant/evaluations/depot-devoir"
                [queryParams]="{ tab: 'quiz' }"
                class="px-5 py-2.5 rounded-xs bg-[#1C75BC] text-white text-xs font-bold hover:bg-[#124F80] shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Retour aux évaluations</span>
                <span>→</span>
              </a>
            </div>
          </div>
        } @else if (result) {
          <!-- RESULT SCREEN POST SUBMISSION (AVEC CÉLÉBRATION ET ANIMATION) -->
          <div class="relative overflow-hidden p-8 md:p-12 bg-white border border-[#D7DBDE] rounded-xs space-y-8 animate-fade-in shadow-xs">
            @if (result.score >= 50) {
              <!-- Particules festives CSS pour célébration de réussite -->
              <div class="absolute inset-x-0 top-0 h-24 pointer-events-none overflow-hidden flex justify-around opacity-75">
                <span class="confetti-dot bg-[#F0791E]" style="animation-delay: 0.1s;"></span>
                <span class="confetti-dot bg-[#1C75BC]" style="animation-delay: 0.3s;"></span>
                <span class="confetti-dot bg-[#276B44]" style="animation-delay: 0.5s;"></span>
                <span class="confetti-dot bg-[#F0791E]" style="animation-delay: 0.2s;"></span>
                <span class="confetti-dot bg-[#124F80]" style="animation-delay: 0.4s;"></span>
              </div>
            }

            <div class="text-center space-y-3">
              <div class="w-16 h-16 rounded-xs text-3xl flex items-center justify-center mx-auto border-b-2 shadow-xs transition-transform duration-500 scale-105" [class]="result.score >= 50 ? 'bg-[#E7F1EA] text-[#276B44] border-[#276B44]' : 'bg-[#FDECEA] text-[#ED1C24] border-[#ED1C24]'">
                @if (result.score >= 50) {
                  <svg class="w-8 h-8 text-[#276B44] animate-bounce-short" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                } @else {
                  <svg class="w-8 h-8 text-[#ED1C24]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              </div>
              <h1 class="text-2xl font-bold text-[#1B1D1F]">
                {{ result.score >= 50 ? 'Félicitations ! Évaluation Validée 🎉' : 'Résultats de votre Évaluation' }}
              </h1>
              <p class="text-xs text-[#4B5157]">
                {{ result.score >= 50 ? 'Vos compétences ont été certifiées avec succès par le jury académique.' : 'Score inférieur au seuil d’aptitude (50%). Rapprochez-vous de votre encadrant.' }}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
              <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-center shadow-2xs">
                <p class="text-2xl font-black font-mono" [class]="result.score >= 50 ? 'text-[#276B44]' : 'text-[#ED1C24]'">{{ result.score }}%</p>
                <p class="text-[11px] text-[#4B5157] font-semibold mt-0.5">Score global</p>
              </div>
              <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-center shadow-2xs">
                <p class="text-2xl font-black text-[#1B1D1F] font-mono">{{ result.bonnesReponses }} / {{ result.totalQuestions }}</p>
                <p class="text-[11px] text-[#4B5157] font-semibold mt-0.5">Bonnes réponses</p>
              </div>
              <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-center shadow-2xs">
                <p class="text-2xl font-black text-[#1C75BC] font-mono">{{ (result.score / 5) | number:'1.1-1' }}/20</p>
                <p class="text-[11px] text-[#4B5157] font-semibold mt-0.5">Note équivalente</p>
              </div>
            </div>

            <!-- Correction Details -->
            <div class="space-y-4 pt-6 border-t border-[#D7DBDE]">
              <div>
                <h3 class="text-sm font-bold text-[#1B1D1F]">Détails des questions traitées</h3>
                <div class="barre"></div>
              </div>
              <div class="space-y-3">
                @for (d of result.detailsCorrection; track d.questionId; let qIdx = $index) {
                  <div class="p-4 border-l-4 rounded-xs border flex items-start gap-3.5 shadow-2xs" [class]="d.estCorrect ? 'bg-[#E7F1EA] border-l-[#276B44] border-[#D7DBDE]' : 'bg-[#FDECEA] border-l-[#ED1C24] border-[#D7DBDE]'">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" [class]="d.estCorrect ? 'bg-[#276B44] text-white' : 'bg-[#ED1C24] text-white'">
                      @if (d.estCorrect) {
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      } @else {
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      }
                    </div>
                    <div class="space-y-1">
                      <p class="text-xs font-bold text-[#1B1D1F]">Question {{ qIdx + 1 }}: {{ d.enonce }}</p>
                      <p class="text-[11px] font-semibold" [class]="d.estCorrect ? 'text-[#276B44]' : 'text-[#ED1C24]'">
                        {{ d.estCorrect ? 'Bonne réponse enregistrée' : 'Réponse incorrecte ou non renseignée' }}
                      </p>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="text-center pt-4">
              <a
                routerLink="/apprenant/evaluations/depot-devoir"
                [queryParams]="{ tab: 'quiz' }"
                class="px-6 py-3 rounded-xs bg-[#1C75BC] text-white text-xs font-bold hover:bg-[#124F80] shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Retour aux évaluations</span>
                <span>→</span>
              </a>
            </div>
          </div>
        } @else {
          <!-- ACTIVE QUIZ PLAYER -->
          <div class="p-4 sm:p-6 md:p-8 bg-white border border-[#D7DBDE] rounded-xs space-y-6 shadow-xs animate-fade-in">
            <!-- Quiz Info Header -->
            <div class="border-b border-[#D7DBDE] pb-5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-[#F0791E]">
                    {{ quiz.formationTitre }}
                  </span>
                  <h1 class="text-lg sm:text-xl font-bold text-[#1B1D1F] mt-0.5">{{ quiz.titre }}</h1>
                </div>
                <div class="text-left sm:text-right text-xs text-[#4B5157] font-mono">
                  Question <strong>{{ currentQuestionIndex + 1 }}</strong> sur <strong>{{ quiz.questions.length }}</strong>
                </div>
              </div>

              <!-- Question Navigation Pills -->
              <div class="flex items-center gap-1.5 flex-wrap mt-4">
                @for (q of quiz.questions; track q.id; let idx = $index) {
                  <button
                    type="button"
                    (click)="goToQuestion(idx)"
                    class="w-7 h-7 sm:w-8 sm:h-8 rounded-xs text-xs font-bold transition-all border cursor-pointer font-mono"
                    [class]="idx === currentQuestionIndex ? 'bg-[#1C75BC] text-white border-[#1C75BC]' : isAnswered(q.id) ? 'bg-[#E7F1EA] text-[#276B44] border-[#276B44]' : 'bg-[#F5F6F7] text-[#4B5157] border-[#D7DBDE] hover:bg-[#E7F1FA]'"
                  >
                    {{ idx + 1 }}
                  </button>
                }
              </div>
            </div>

            <!-- Current Question -->
            @if (currentQuestion) {
              <div class="space-y-4 sm:space-y-6 py-2">
                <div class="p-4 sm:p-5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs">
                  <h3 class="text-xs sm:text-sm font-bold text-[#1B1D1F] leading-relaxed">
                    {{ currentQuestionIndex + 1 }}. {{ currentQuestion.enonce }}
                  </h3>
                </div>

                <!-- Options avec badges touches clavier [A], [B], [C] -->
                <div class="space-y-2.5 sm:space-y-3">
                  @for (opt of currentQuestion.options; track opt.text; let optIdx = $index) {
                    <label
                      (click)="selectOption(currentQuestion.id, optIdx)"
                      class="group p-3 sm:p-4 border cursor-pointer flex items-center gap-3 sm:gap-4 transition-all rounded-xs shadow-2xs"
                      [class]="getSelectedOption(currentQuestion.id) === optIdx ? 'bg-[#E7F1FA] border-[#1C75BC] border-l-4 border-l-[#F0791E]' : 'bg-white border-[#D7DBDE] hover:bg-[#F5F6F7] hover:border-[#1C75BC]'"
                    >
                      <span
                        class="w-6 h-6 rounded-xs flex items-center justify-center text-[11px] font-bold font-mono transition-colors shrink-0"
                        [class]="getSelectedOption(currentQuestion.id) === optIdx ? 'bg-[#1C75BC] text-white' : 'bg-[#F5F6F7] text-[#4B5157] group-hover:bg-[#E7F1FA] group-hover:text-[#1C75BC] border border-[#D7DBDE]'"
                      >
                        {{ getOptionKeyLabel(optIdx) }}
                      </span>
                      <input
                        type="radio"
                        [name]="'q_' + currentQuestion.id"
                        [checked]="getSelectedOption(currentQuestion.id) === optIdx"
                        class="w-4 h-4 accent-[#1C75BC] border-[#D7DBDE] shrink-0"
                      />
                      <span class="text-xs font-semibold text-[#1B1D1F] leading-snug flex-1">{{ opt.text }}</span>
                    </label>
                  }
                </div>
              </div>
            }

            <!-- Bottom Navigation Actions + Keyboard shortcut reminder -->
            <div class="space-y-2.5">
              <div class="p-3 sm:p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs flex items-center justify-between gap-3">
                <button
                  type="button"
                  (click)="prevQuestion()"
                  [disabled]="currentQuestionIndex === 0"
                  class="px-3 sm:px-4 py-2 rounded-xs bg-white border border-[#D7DBDE] text-xs font-semibold text-[#1B1D1F] hover:bg-[#E7F1FA] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  ← Précédente
                </button>

                <div class="flex items-center gap-2 sm:gap-3">
                  @if (currentQuestionIndex < quiz.questions.length - 1) {
                    <button
                      type="button"
                      (click)="nextQuestion()"
                      class="px-3 sm:px-4 py-2 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      Suivante →
                    </button>
                  } @else {
                    <button
                      type="button"
                      (click)="submitQuiz()"
                      [disabled]="submitting"
                      class="px-5 py-2.5 rounded-xs bg-[#276B44] hover:bg-[#1e5234] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>{{ submitting ? 'Calcul sécurisé...' : 'Soumettre le Quiz' }}</span>
                      <span>✓</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Astuce ergonomique clavier -->
              <p class="text-[11px] text-[#71787E] text-center">
                💡 <strong class="text-[#4B5157]">Navigation rapide :</strong> touches <kbd class="px-1 py-0.5 bg-white border border-[#D7DBDE] rounded text-[10px] font-mono">1-4</kbd> ou <kbd class="px-1 py-0.5 bg-white border border-[#D7DBDE] rounded text-[10px] font-mono">A-D</kbd> pour répondre · <kbd class="px-1 py-0.5 bg-white border border-[#D7DBDE] rounded text-[10px] font-mono">Entrée</kbd> ou <kbd class="px-1 py-0.5 bg-white border border-[#D7DBDE] rounded text-[10px] font-mono">→</kbd> pour avancer.
              </p>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    @keyframes fall {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100px) rotate(360deg); opacity: 0; }
    }
    .confetti-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      animation: fall 2s ease-out infinite;
    }
    @keyframes bounce-short {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    .animate-bounce-short {
      animation: bounce-short 1.5s ease-in-out infinite;
    }
  `]
})
export class QuizPlayerComponent implements OnInit, OnDestroy {
  quizId = '';
  quiz: QuizDetail | null = null;
  result: QuizSubmissionResult | null = null;
  loading = true;
  isSlowLoading = false;
  errorMessage: string | null = null;
  submitting = false;

  currentQuestionIndex = 0;
  reponsesMap = new Map<string, number>();

  // Timer & Async helpers
  timerInterval: any = null;
  slowTimer: any = null;
  timeLeftSeconds = 0;

  private readonly DRAFT_PREFIX = 'vc_quiz_draft_';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apprenantService: ApprenantService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.quizId = this.route.snapshot.paramMap.get('id') || '';
    if (this.quizId) {
      // 1. Essayer d'abord d'afficher l'instantané local (0 milliseconde)
      const snapshot = this.apprenantService.getQuizSnapshot(this.quizId);
      if (snapshot) {
        this.quiz = snapshot;
        this.loading = false;
        if (!snapshot.tentative) {
          this.restoreDraft();
          if (snapshot.dureeMinutes && !this.timerInterval) {
            this.timeLeftSeconds = snapshot.dureeMinutes * 60;
            this.startTimer();
          }
        }
        // Rafraîchissement silencieux en arrière-plan
        this.loadQuiz(true);
      } else {
        this.loadQuiz(false);
      }
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
    }
  }

  loadQuiz(silent = false) {
    if (!silent) {
      this.loading = true;
      this.errorMessage = null;
      this.isSlowLoading = false;

      if (this.slowTimer) clearTimeout(this.slowTimer);
      this.slowTimer = setTimeout(() => {
        if (this.loading && !this.quiz) {
          this.isSlowLoading = true;
        }
      }, 3500);
    }

    this.apprenantService.getQuiz(this.quizId).subscribe({
      next: (data) => {
        if (this.slowTimer) clearTimeout(this.slowTimer);
        this.quiz = data;
        this.loading = false;
        this.isSlowLoading = false;
        this.errorMessage = null;

        if (!data.tentative) {
          this.restoreDraft();
          if (data.dureeMinutes && !this.timerInterval) {
            this.timeLeftSeconds = data.dureeMinutes * 60;
            this.startTimer();
          }
        }
      },
      error: (err) => {
        if (this.slowTimer) clearTimeout(this.slowTimer);
        this.loading = false;
        this.isSlowLoading = false;

        // Si aucun instantané n'est affiché, afficher la vue d'erreur résiliente
        if (!this.quiz) {
          this.errorMessage =
            err.error?.message ||
            'Le serveur académique met du temps à répondre ou votre session a expiré. Veuillez vérifier votre connexion et réessayer.';
          this.toast.error('Impossible de charger le quiz.');
        }
      },
    });
  }

  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      if (this.timeLeftSeconds > 0) {
        this.timeLeftSeconds--;
      } else {
        clearInterval(this.timerInterval);
        this.toast.error('Temps écoulé ! Soumission automatique...');
        this.submitQuiz();
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  get currentQuestion() {
    return this.quiz?.questions[this.currentQuestionIndex];
  }

  goToQuestion(idx: number) {
    this.currentQuestionIndex = idx;
  }

  nextQuestion() {
    if (this.quiz && this.currentQuestionIndex < this.quiz.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  selectOption(questionId: string, optionIndex: number) {
    this.reponsesMap.set(questionId, optionIndex);
    this.saveDraft();
  }

  getSelectedOption(questionId: string): number | undefined {
    return this.reponsesMap.get(questionId);
  }

  isAnswered(questionId: string): boolean {
    return this.reponsesMap.has(questionId);
  }

  private saveDraft() {
    try {
      const entries = Array.from(this.reponsesMap.entries());
      sessionStorage.setItem(this.DRAFT_PREFIX + this.quizId, JSON.stringify(entries));
    } catch {}
  }

  private restoreDraft() {
    try {
      const raw = sessionStorage.getItem(this.DRAFT_PREFIX + this.quizId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.reponsesMap = new Map<string, number>(parsed);
        }
      }
    } catch {}
  }

  private clearDraft() {
    try {
      sessionStorage.removeItem(this.DRAFT_PREFIX + this.quizId);
    } catch {}
  }

  submitQuiz() {
    if (!this.quiz) return;

    const unanswered = this.quiz.questions.length - this.reponsesMap.size;
    if (unanswered > 0) {
      if (!confirm(`Il reste ${unanswered} question(s) sans réponse. Souhaitez-vous vraiment soumettre ?`)) {
        return;
      }
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const payload = Array.from(this.reponsesMap.entries()).map(([questionId, selectedIndex]) => ({
      questionId,
      selectedIndex,
    }));

    this.submitting = true;
    this.apprenantService.submitQuiz(this.quizId, payload).subscribe({
      next: (res) => {
        this.submitting = false;
        this.result = res;
        this.clearDraft();
        this.toast.success(`Quiz terminé ! Score : ${res.score}%`);
      },
      error: (err) => {
        this.submitting = false;
        const msg = Array.isArray(err.error?.message)
          ? err.error.message.join(', ')
          : (err.error?.message || 'Erreur lors de la soumission du quiz.');
        this.toast.error(msg);
      },
    });
  }

  getOptionKeyLabel(index: number): string {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    return letters[index] || `${index + 1}`;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Ne pas intercepter si l'utilisateur est en train de taper dans un champ
    const target = event.target as HTMLElement;
    const tagName = target?.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return;
    }

    // Uniquement actif en cours de quiz non encore soumis
    if (!this.quiz || this.quiz.tentative || this.result || !this.currentQuestion) {
      return;
    }

    const key = event.key.toLowerCase();

    // Raccourcis pour options 1-6 ou a-f
    const optionMap: Record<string, number> = {
      '1': 0, 'a': 0,
      '2': 1, 'b': 1,
      '3': 2, 'c': 2,
      '4': 3, 'd': 3,
      '5': 4, 'e': 4,
      '6': 5, 'f': 5,
    };

    if (key in optionMap) {
      const optIdx = optionMap[key];
      if (optIdx < this.currentQuestion.options.length) {
        event.preventDefault();
        this.selectOption(this.currentQuestion.id, optIdx);
      }
      return;
    }

    if (key === 'arrowright') {
      event.preventDefault();
      this.nextQuestion();
    } else if (key === 'arrowleft') {
      event.preventDefault();
      this.prevQuestion();
    } else if (key === 'enter') {
      event.preventDefault();
      if (this.currentQuestionIndex === this.quiz.questions.length - 1) {
        if (!this.submitting) {
          this.submitQuiz();
        }
      } else {
        this.nextQuestion();
      }
    }
  }
}
