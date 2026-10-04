import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApprenantService, QuestionForumItem } from '../../../../core/services/apprenant.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-course-qa-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-5 sm:p-6 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs space-y-6">
      <!-- HEADER FORUM -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D7DBDE] pb-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] text-[10px] font-bold uppercase tracking-wider">
              Forum Communautaire
            </span>
            <span class="text-xs font-mono text-[#4B5157]">
              {{ questions.length }} question{{ questions.length > 1 ? 's' : '' }}
            </span>
          </div>
          <h3 class="text-sm sm:text-base font-bold text-[#1B1D1F] font-heading mt-1">
            Questions & Réponses sur cette Leçon
          </h3>
          <p class="text-xs text-[#4B5157] mt-0.5">
            Échangez avec vos pairs et recevez des réponses certifiées de l'équipe pédagogique.
          </p>
        </div>

        <button
          type="button"
          (click)="showAskForm = !showAskForm"
          class="px-4 py-2 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>{{ showAskForm ? '✕ Fermer' : '＋ Poser une question' }}</span>
        </button>
      </div>

      <!-- FORMULAIRE : POSER UNE NOUVELLE QUESTION -->
      @if (showAskForm) {
        <div class="p-4 sm:p-5 bg-[#F5F6F7] border border-[#1C75BC]/30 rounded-xs space-y-3 animate-fade-in">
          <h4 class="text-xs font-bold text-[#1B1D1F] uppercase tracking-wider flex items-center gap-1.5">
            <span class="text-[#F0791E]">💬</span>
            <span>Votre question à l'équipe pédagogique et aux pairs</span>
          </h4>
          <textarea
            [(ngModel)]="nouvelleQuestion"
            rows="3"
            placeholder="Ex: Comment fonctionne le paramètre dans cette fonction ? Pourriez-vous donner un exemple concret ?"
            class="w-full p-3 bg-white border border-[#D7DBDE] rounded-xs text-xs text-[#1B1D1F] focus:border-[#1C75BC] focus:outline-none transition-all leading-relaxed"
          ></textarea>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              (click)="showAskForm = false"
              class="px-3 py-1.5 rounded-xs border border-[#D7DBDE] text-[#4B5157] text-xs font-semibold hover:bg-white cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              (click)="soumettreQuestion()"
              [disabled]="submitting || !nouvelleQuestion.trim()"
              class="px-5 py-1.5 rounded-xs bg-[#F0791E] hover:bg-[#d96612] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              @if (submitting) {
                <span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Publication...</span>
              } @else {
                <span>Publier ma question</span>
              }
            </button>
          </div>
        </div>
      }

      <!-- LISTE DES QUESTIONS DE LA LEÇON -->
      @if (loading) {
        <div class="py-8 text-center text-[#4B5157] space-y-2">
          <div class="inline-block w-6 h-6 border-2 border-[#1C75BC] border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs">Chargement des échanges de la leçon...</p>
        </div>
      } @else if (questions.length === 0) {
        <div class="py-10 text-center bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs space-y-2">
          <p class="text-xs font-bold text-[#1B1D1F]">Aucune question posée sur cette leçon pour le moment.</p>
          <p class="text-[11px] text-[#4B5157]">Soyez le premier à poser une question ou à demander une clarification à votre formateur !</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (q of questions; track q.id) {
            <div class="p-4 sm:p-5 bg-white border border-[#D7DBDE] hover:border-[#1C75BC] rounded-xs shadow-2xs space-y-3 transition-colors">
              <!-- Auteur & Votes -->
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-8 h-8 rounded-full bg-[#124F80] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {{ q.auteur.prenom.charAt(0) }}{{ q.auteur.nom.charAt(0) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-[#1B1D1F] truncate">
                      {{ q.auteur.prenom }} {{ q.auteur.nom }}
                      <span class="ml-1 text-[10px] font-normal text-[#71787E]">· {{ q.createdAt | date:'dd MMM à HH:mm' }}</span>
                    </p>
                    <span class="text-[9px] px-1.5 py-0.2 rounded-xs bg-[#F5F6F7] text-[#4B5157] border border-[#D7DBDE] uppercase font-bold">
                      {{ q.auteur.role }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    (click)="voter(q)"
                    class="px-2.5 py-1 rounded-xs bg-[#F5F6F7] hover:bg-[#E7F1FA] text-[#1C75BC] border border-[#D7DBDE] text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Voter pour cette question"
                  >
                    <span>▲</span>
                    <span>{{ q.votes }}</span>
                  </button>
                </div>
              </div>

              <!-- Question text -->
              <p class="text-xs sm:text-sm text-[#1B1D1F] leading-relaxed font-medium">
                {{ q.question }}
              </p>

              <!-- Réponses -->
              <div class="pt-2 border-t border-[#D7DBDE]/60 space-y-2.5">
                @if (q.reponses && q.reponses.length > 0) {
                  <div class="space-y-2 pl-3 sm:pl-4 border-l-2 border-[#1C75BC]/30">
                    @for (r of q.reponses; track r.id) {
                      <div
                        class="p-3 rounded-xs text-xs space-y-1.5"
                        [class]="r.estCertifiee ? 'bg-[#E7F1EA] border border-[#276B44]/40' : 'bg-[#F5F6F7] border border-[#D7DBDE]'"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-[#1B1D1F] text-[11px]">
                              {{ r.auteur.prenom }} {{ r.auteur.nom }}
                            </span>
                            @if (r.estCertifiee) {
                              <span class="px-1.5 py-0.2 rounded-xs bg-[#276B44] text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <span>✓</span>
                                <span>Réponse Officielle du Formateur</span>
                              </span>
                            } @else {
                              <span class="text-[9px] text-[#71787E]">· Apprenant</span>
                            }
                          </div>
                          <span class="text-[10px] text-[#71787E] font-mono">{{ r.createdAt | date:'dd/MM à HH:mm' }}</span>
                        </div>
                        <p class="text-xs text-[#1B1D1F] leading-relaxed whitespace-pre-line">
                          {{ r.reponse }}
                        </p>
                      </div>
                    }
                  </div>
                }

                <!-- Action Répondre -->
                <div class="pt-1">
                  @if (replyingQuestionId === q.id) {
                    <div class="space-y-2 pt-2 animate-fade-in">
                      <textarea
                        [(ngModel)]="reponseTexte"
                        rows="2"
                        placeholder="Rédigez votre réponse ou apportez une précision..."
                        class="w-full p-2.5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs text-[#1B1D1F] focus:border-[#1C75BC] focus:bg-white focus:outline-none transition-all leading-relaxed"
                      ></textarea>
                      <div class="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          (click)="replyingQuestionId = null"
                          class="px-2.5 py-1 text-xs text-[#4B5157] hover:underline cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          (click)="soumettreReponse(q)"
                          [disabled]="sendingReply || !reponseTexte.trim()"
                          class="px-4 py-1.5 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {{ sendingReply ? 'Envoi...' : 'Répondre' }}
                        </button>
                      </div>
                    </div>
                  } @else {
                    <button
                      type="button"
                      (click)="replyingQuestionId = q.id; reponseTexte = ''"
                      class="text-[11px] font-bold text-[#1C75BC] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>↩ Répondre à cette question</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class CourseQaThreadComponent implements OnInit, OnChanges {
  @Input({ required: true }) coursId!: string;

  questions: QuestionForumItem[] = [];
  loading = false;
  showAskForm = false;
  nouvelleQuestion = '';
  submitting = false;

  replyingQuestionId: string | null = null;
  reponseTexte = '';
  sendingReply = false;

  constructor(
    private apprenantService: ApprenantService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    if (this.coursId) this.chargerQuestions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coursId'] && this.coursId) {
      this.chargerQuestions();
    }
  }

  chargerQuestions(): void {
    this.loading = true;
    this.apprenantService.getQuestionsCours(this.coursId).subscribe({
      next: (data) => {
        this.questions = data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  soumettreQuestion(): void {
    if (!this.nouvelleQuestion.trim()) return;
    this.submitting = true;
    this.apprenantService.poserQuestionCours(this.coursId, this.nouvelleQuestion.trim()).subscribe({
      next: (res) => {
        this.submitting = false;
        this.nouvelleQuestion = '';
        this.showAskForm = false;
        this.toast.success('Votre question a été publiée.');
        this.chargerQuestions();
      },
      error: (err) => {
        this.submitting = false;
        this.toast.error(err.error?.message || 'Erreur lors de la publication.');
      },
    });
  }

  soumettreReponse(q: QuestionForumItem): void {
    if (!this.reponseTexte.trim()) return;
    this.sendingReply = true;
    this.apprenantService.repondreQuestionCours(q.id, this.reponseTexte.trim()).subscribe({
      next: () => {
        this.sendingReply = false;
        this.replyingQuestionId = null;
        this.reponseTexte = '';
        this.toast.success('Réponse publiée avec succès.');
        this.chargerQuestions();
      },
      error: (err) => {
        this.sendingReply = false;
        this.toast.error(err.error?.message || 'Erreur lors de la réponse.');
      },
    });
  }

  voter(q: QuestionForumItem): void {
    this.apprenantService.voterQuestionCours(q.id).subscribe({
      next: (res) => {
        q.votes = res.votes;
      },
    });
  }
}
