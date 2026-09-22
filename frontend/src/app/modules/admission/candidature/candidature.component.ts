import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdmissionService, Candidature, SessionAdmission, PieceCandidature } from '../../../core/services/admission.service';
import { ApprenantService } from '../../../core/services/apprenant.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-candidature',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 sm:space-y-8 animate-fade-in pb-12 min-w-0">
      <!-- En-tête officiel avec charte graphique Vitalis Center -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[#1B1D1F] font-heading">Mes Candidatures & Suivi des Dossiers</h1>
          <div class="barre"></div>
          <p class="mt-2 text-xs sm:text-sm text-[#4B5157]">
            Consultez les sessions ouvertes, déposez vos pièces justificatives, et suivez en direct les décisions officielles des dirigeants.
          </p>
        </div>
        <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
          <span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-2xs">
            <span class="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Synchronisé en direct
          </span>
          <span class="text-xs font-bold text-[#4B5157] bg-white border border-[#D7DBDE] px-3 py-1 rounded-xs shadow-2xs">
            {{ voeux.length }} vœu{{ voeux.length === 1 ? '' : 'x' }}
          </span>
        </div>
      </div>

      <!-- Alertes erreurs -->
      @if (error) {
        <div class="rounded-xs border border-[#C94C4C] bg-white p-4 text-xs sm:text-sm text-[#9E3030] shadow-sm flex items-center justify-between">
          <span>{{ error }}</span>
          <button (click)="error = ''" class="text-xs text-gray-400 hover:text-gray-700 font-bold cursor-pointer p-1">✕</button>
        </div>
      }

      <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <!-- Colonne gauche : Sessions ouvertes (5 cols) -->
        <div class="lg:col-span-5 space-y-3 sm:space-y-4">
          <div class="flex items-center justify-between pb-1 border-b border-[#D7DBDE]">
            <h2 class="text-sm font-bold text-[#1B1D1F] uppercase tracking-wider">Sessions disponibles</h2>
            <div class="flex items-center gap-2">
              @if (syncing) {
                <span class="inline-flex items-center gap-1 text-[11px] text-[#1C75BC]">
                  <span class="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-[#1C75BC] border-t-transparent"></span>
                  Actualisation...
                </span>
              }
              <span class="text-xs text-[#4B5157] font-mono">{{ sessions.length }}</span>
            </div>
          </div>

          <!-- Chargement initial -->
          @if (loading && sessions.length === 0) {
            <div class="space-y-3">
              <div *ngFor="let item of [1,2]" class="rounded-xs border border-[#D7DBDE] bg-white p-5 shadow-2xs animate-pulse">
                <div class="h-4 w-1/3 bg-gray-200 rounded mb-2"></div>
                <div class="h-3 w-1/2 bg-gray-200 rounded mb-2"></div>
                <div class="h-3 w-1/4 bg-gray-100 rounded"></div>
              </div>
            </div>
          }

          <!-- Aucune session disponible -->
          @if (!loading && sessions.length === 0) {
            <div class="rounded-xs border border-[#D7DBDE] bg-white p-8 text-center text-xs sm:text-sm text-[#4B5157] shadow-2xs">
              <p class="font-medium">Aucune session d'admission n'est actuellement ouverte.</p>
              <p class="mt-1 text-xs text-[#71787E]">Les prochaines campagnes d'admission seront affichées dès leur ouverture.</p>
            </div>
          }

          <!-- Liste des sessions -->
          @if (sessions.length > 0) {
            <div class="space-y-3">
              @for (session of sessions; track session.id) {
                <article class="rounded-xs border border-[#D7DBDE] bg-white p-4 sm:p-5 shadow-2xs hover:border-[#1C75BC] transition-all flex flex-col justify-between gap-3">
                  <div>
                    <h3 class="font-bold text-[#1B1D1F] text-xs sm:text-sm leading-snug">{{ session.libelle }}</h3>
                    <p class="mt-1 text-xs text-[#4B5157]">
                      <span class="font-semibold text-[#1C75BC]">{{ session.filiere.libelle }}</span> · {{ session.niveau.libelle }}
                    </p>
                    <p class="mt-1 text-[11px] text-[#71787E]">
                      Établissement : {{ session.etablissement.nom }} ({{ session.etablissement.codeAntenne }})
                    </p>
                    <p class="mt-0.5 text-[11px] text-[#71787E]">
                      Clôture le {{ session.dateFermeture | date:'dd/MM/yyyy' }} · Capacité : {{ session.capacite }} places
                    </p>
                    <!-- Description de la session -->
                    <p *ngIf="session.description" class="mt-1.5 text-[11px] text-[#4B5157] italic leading-relaxed line-clamp-2">
                      {{ session.description }}
                    </p>
                    <!-- Pièces requises -->
                    <div *ngIf="session.piecesRequises && session.piecesRequises.length > 0" class="mt-2 flex flex-wrap gap-1">
                      <span class="text-[10px] font-semibold text-[#4B5157] w-full">Pièces requises :</span>
                      <span *ngFor="let p of session.piecesRequises"
                            class="inline-block px-1.5 py-0.5 text-[10px] bg-[#E7F1FA] text-[#1C75BC] rounded-[2px] border border-[#1C75BC]/20">
                        {{ formatPieceType(p) }}
                      </span>
                    </div>
                  </div>
                  <div class="pt-2 border-t border-[#D7DBDE] flex justify-end">
                    <button type="button" class="w-full sm:w-auto text-xs py-2 px-3.5 bg-[#1C75BC] hover:bg-[#124F80] disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xs shadow-2xs transition-all cursor-pointer text-center"
                            [disabled]="isApplied(session.id) || submitting === session.id"
                            (click)="apply(session)">
                      {{ isApplied(session.id) ? '✓ Vœu déjà déposé' : (submitting === session.id ? 'Ajout...' : '+ Déposer un vœu') }}
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </div>

        <!-- Colonne droite : Suivi des vœux, explications et pièces (7 cols) -->
        <div class="lg:col-span-7 space-y-3 sm:space-y-4">
          <div class="flex items-center justify-between pb-1 border-b border-[#D7DBDE]">
            <h2 class="text-sm font-bold text-[#1B1D1F] uppercase tracking-wider">Mes Vœux & Décisions</h2>
            <button (click)="loadVoeux(true)" class="text-xs font-semibold text-[#1C75BC] hover:underline cursor-pointer flex items-center gap-1" [disabled]="refreshing">
              <span>{{ refreshing ? 'Actualisation...' : '🔄 Actualiser' }}</span>
            </button>
          </div>

          <!-- Aucun vœu -->
          @if (voeux.length === 0) {
            <div class="rounded-xs border border-[#D7DBDE] bg-white p-8 sm:p-12 text-center text-xs sm:text-sm text-[#4B5157] shadow-2xs space-y-2">
              <svg class="w-12 h-12 text-[#9AA1A8] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="font-bold text-[#1B1D1F]">Vous n'avez pas encore de vœu d'admission déposé.</p>
              <p class="text-xs text-[#71787E] max-w-sm mx-auto">Sélectionnez une session disponible dans la colonne de gauche pour démarrer votre dossier.</p>
            </div>
          }

          <!-- Liste des vœux -->
          @if (voeux.length > 0) {
            <div class="space-y-4">
              @for (voeu of voeux; track voeu.id) {
                <article class="rounded-xs border border-[#D7DBDE] bg-white p-4 sm:p-6 shadow-xs space-y-4 hover:border-[#1C75BC] transition-all">
                  <!-- Titre & Statut -->
                  <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-[#D7DBDE] pb-3">
                    <div class="min-w-0 flex-1">
                      <h3 class="text-sm sm:text-base font-bold text-[#1B1D1F] leading-snug">{{ voeu.session.libelle }}</h3>
                      <div class="text-xs text-[#71787E] mt-0.5">{{ voeu.session.filiere.libelle }} · {{ voeu.session.niveau.libelle }} · {{ voeu.session.etablissement.nom }}</div>
                    </div>
                    <span class="rounded-xs px-2.5 py-1 text-xs font-bold shrink-0 self-start border"
                          [ngClass]="{
                            'bg-amber-100 text-amber-800 border-amber-300': voeu.statut === 'BROUILLON',
                            'bg-blue-100 text-blue-800 border-blue-300': voeu.statut === 'SOUMISE' || voeu.statut === 'EN_EVALUATION',
                            'bg-emerald-100 text-emerald-800 border-emerald-300': voeu.statut === 'ADMISE' || voeu.statut === 'CONFIRMEE' || voeu.statut === 'INSCRITE',
                            'bg-purple-100 text-purple-800 border-purple-300': voeu.statut === 'LISTE_ATTENTE',
                            'bg-rose-100 text-rose-800 border-rose-300': voeu.statut === 'REJETEE' || voeu.statut === 'EXPIREE',
                            'bg-gray-100 text-gray-800 border-gray-300': voeu.statut === 'RETIREE'
                          }">
                      {{ getStatutLabel(voeu.statut) }}
                    </span>
                  </div>

                  <!-- ========================================================================= -->
                  <!-- SECTION DROIT AUX EXPLICATIONS & AVIS OFFICIEL DES DIRIGEANTS              -->
                  <!-- ========================================================================= -->
                  @if (voeu.commentaireGestionnaire || voeu.scoreEvaluation || voeu.dateDecision || voeu.motifRejet || voeu.statut === 'ADMISE' || voeu.statut === 'LISTE_ATTENTE' || voeu.statut === 'REJETEE') {
                    <div class="p-3.5 sm:p-4 rounded-xs border text-xs space-y-2.5"
                         [ngClass]="{
                           'bg-emerald-50/90 border-emerald-300 text-emerald-950': voeu.statut === 'ADMISE' || voeu.statut === 'CONFIRMEE' || voeu.statut === 'INSCRITE',
                           'bg-purple-50/90 border-purple-300 text-purple-950': voeu.statut === 'LISTE_ATTENTE',
                           'bg-rose-50/90 border-rose-300 text-rose-950': voeu.statut === 'REJETEE',
                           'bg-blue-50/90 border-blue-300 text-blue-950': voeu.statut === 'EN_EVALUATION' || voeu.statut === 'SOUMISE'
                         }">
                      
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold">
                        <span class="flex items-center gap-1.5 text-xs">
                          <span>🏛️</span>
                          <span>Avis & Explications Officielles des Dirigeants</span>
                        </span>
                        @if (voeu.scoreEvaluation) {
                          <span class="px-2 py-0.5 rounded bg-white font-bold text-xs shadow-2xs border border-gray-300 text-gray-800 self-start sm:self-auto font-mono">
                            Note : {{ voeu.scoreEvaluation }}/20
                          </span>
                        }
                      </div>

                      <!-- Commentaires & explications -->
                      @if (voeu.commentaireGestionnaire) {
                        <div class="p-3 bg-white rounded-xs border border-gray-200/80 shadow-2xs leading-relaxed">
                          <span class="font-bold block text-[11px] text-gray-500 uppercase tracking-wider mb-1">
                            Retour & Évaluation de la Direction :
                          </span>
                          <p class="text-gray-900 font-medium text-xs whitespace-pre-line italic">
                            « {{ voeu.commentaireGestionnaire }} »
                          </p>
                        </div>
                      }

                      <!-- Motif de rejet si applicable -->
                      @if (voeu.motifRejet) {
                        <div class="p-2.5 bg-white/90 rounded-xs border border-rose-200 text-rose-900 font-semibold">
                          ❌ <strong>Motif de la décision :</strong> {{ voeu.motifRejet }}
                        </div>
                      }

                      <!-- Message de félicitations pour admis -->
                      @if (voeu.statut === 'ADMISE') {
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 bg-emerald-100/90 rounded-xs border border-emerald-300 text-emerald-900">
                          <div>
                            <strong>🎉 Candidature retenue !</strong> Félicitations, vous êtes admis à cette formation.
                          </div>
                          @if (voeu.dateExpiration) {
                            <span class="text-xs font-bold text-emerald-950 bg-white px-2 py-1 rounded-xs shadow-2xs whitespace-nowrap">
                              Confirmation avant le : {{ voeu.dateExpiration | date:'dd/MM/yyyy' }}
                            </span>
                          }
                        </div>
                      }

                      <!-- Message de liste d'attente -->
                      @if (voeu.statut === 'LISTE_ATTENTE') {
                        <div class="p-2.5 bg-purple-100 rounded-xs border border-purple-300 text-purple-900 font-medium">
                          ⏳ Vous êtes positionné au <strong>rang #{{ voeu.rangListeAttente }}</strong> de la liste d'attente. Votre dossier sera automatiquement promu en cas de libération d'une place.
                        </div>
                      }

                      <!-- Date de formalisation de la décision -->
                      @if (voeu.dateDecision) {
                        <div class="text-[10px] text-gray-500 font-medium font-mono">
                          Décision enregistrée le {{ voeu.dateDecision | date:'dd/MM/yyyy à HH:mm' }}
                        </div>
                      }
                    </div>
                  }

                  <!-- Alertes supplémentaires -->
                  @if (voeu.conflitCalendrier) {
                    <div class="text-xs font-medium text-amber-700 bg-amber-50 rounded-xs p-2.5 border border-amber-200">
                      ⚠️ Inscription active en parallèle : votre dossier est géré en régime de mise en réserve.
                    </div>
                  }

                  <!-- SECTION PIECES DU DOSSIER -->
                  <div class="rounded-xs bg-[#F5F6F7] p-3.5 sm:p-4 border border-[#D7DBDE] space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span class="text-xs font-bold text-[#1B1D1F] flex items-center gap-1.5">
                        📁 Documents & Pièces Justificatives
                      </span>
                      <span class="text-[11px] font-semibold"
                            [ngClass]="(voeu.pieces?.length || 0) > 0 ? 'text-emerald-700' : 'text-amber-700'">
                        {{ (voeu.pieces?.length || 0) > 0 ? '✓ ' + voeu.pieces?.length + ' pièce(s) jointe(s)' : '⚠️ 0 pièce jointe (Requis)' }}
                      </span>
                    </div>

                    <!-- Formulaire d'ajout de pièce si statut BROUILLON -->
                    @if (voeu.statut === 'BROUILLON') {
                      <div class="p-3 bg-white rounded-xs border border-[#D7DBDE] text-xs space-y-2.5 shadow-2xs">
                        <div class="font-bold text-[#1B1D1F]">Ajouter une pièce justificative :</div>
                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select [(ngModel)]="selectedPieceTypes[voeu.id]" class="w-full sm:flex-1 rounded-xs border border-[#D7DBDE] px-2.5 py-1.5 text-xs bg-white text-[#1B1D1F] focus:border-[#1C75BC] focus:outline-none">
                            <option value="PIECE_IDENTITE">🪪 Pièce d'identité (CNI / Passeport)</option>
                            <option value="DIPLOME">🎓 Diplôme ou Attestation</option>
                            <option value="RELEVE_NOTES">📊 Relevé de notes</option>
                            <option value="CV">📄 Curriculum Vitae (CV)</option>
                            <option value="LETTRE_MOTIVATION">✉️ Lettre de motivation</option>
                            <option value="AUTRE">📎 Autre justificatif</option>
                          </select>

                          <label class="w-full sm:w-auto inline-flex items-center justify-center gap-1 cursor-pointer rounded-xs bg-[#1C75BC] hover:bg-[#124F80] px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-xs text-center">
                            <span>📤 Parcourir (PDF, JPG, PNG)</span>
                            <input type="file" class="hidden" (change)="upload(voeu, $event)" accept=".pdf,.jpg,.jpeg,.png" [disabled]="busy === voeu.id" />
                          </label>
                        </div>
                      </div>
                    }

                    <!-- Liste des pièces téléversées -->
                    @if (voeu.pieces && voeu.pieces.length > 0) {
                      <div class="space-y-2">
                        @for (piece of voeu.pieces; track piece.id || piece.nomFichier) {
                          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-3 py-2 rounded-xs border border-[#D7DBDE] text-xs shadow-2xs">
                            <div class="flex items-center gap-2 overflow-hidden min-w-0">
                              <span class="text-sm shrink-0">📄</span>
                              <span class="font-semibold text-[#1B1D1F] truncate text-xs">{{ piece.nomFichier }}</span>
                              <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 font-semibold shrink-0 border border-blue-100">
                                {{ formatPieceType(piece.type) }}
                              </span>
                            </div>

                            <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              @if (piece.fileUrl) {
                                <button type="button" (click)="viewPiece(piece)"
                                        class="text-[#1C75BC] hover:bg-blue-50 font-semibold text-xs px-2.5 py-1 rounded-xs border border-blue-200 cursor-pointer transition-all">
                                  👁️ Voir
                                </button>
                                <button type="button" (click)="downloadPiece(piece)"
                                        [disabled]="downloadingPieceId === (piece.id || piece.nomFichier)"
                                        class="text-gray-700 hover:bg-gray-100 font-semibold text-xs px-2.5 py-1 bg-gray-50 rounded-xs border border-[#D7DBDE] cursor-pointer transition-all">
                                  {{ downloadingPieceId === (piece.id || piece.nomFichier) ? '⏳ ...' : '⬇️ Télécharger' }}
                                </button>
                              }
                              @if (voeu.statut === 'BROUILLON') {
                                <button type="button"
                                        class="text-rose-600 hover:bg-rose-50 text-xs font-medium px-2 py-1 rounded-xs border border-rose-200 cursor-pointer transition-all"
                                        [disabled]="busy === voeu.id"
                                        (click)="deletePiece(voeu, piece.id)">
                                  🗑️
                                </button>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }

                    <!-- Message si aucune pièce -->
                    @if (!voeu.pieces || voeu.pieces.length === 0) {
                      <div class="text-center py-2 text-xs text-[#71787E]">
                        Aucune pièce justificative déposée. Joignez vos documents requis avant de soumettre.
                      </div>
                    }
                  </div>

                  <!-- ACTIONS DU VOEU -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#D7DBDE] pt-3.5">
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <!-- Bouton Soumettre : Débloqué uniquement si pièces présentes -->
                      @if (voeu.statut === 'BROUILLON') {
                        <button type="button"
                                class="w-full sm:w-auto text-xs font-bold px-4 py-2.5 rounded-xs transition-all shadow-xs cursor-pointer text-center"
                                [ngClass]="(voeu.pieces?.length || 0) > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'"
                                [disabled]="busy === voeu.id || !voeu.pieces || voeu.pieces.length === 0"
                                (click)="submit(voeu)">
                          {{ busy === voeu.id ? 'Soumission...' : ((voeu.pieces?.length || 0) > 0 ? '🚀 Soumettre mon dossier complet' : '🔒 Joindre une pièce pour soumettre') }}
                        </button>
                      }

                      <!-- Bouton Confirmer si ADMISE -->
                      @if (voeu.statut === 'ADMISE') {
                        <button type="button"
                                class="w-full sm:w-auto text-xs font-bold py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xs shadow-xs cursor-pointer text-center"
                                [disabled]="busy === voeu.id"
                                (click)="confirm(voeu)">
                          {{ busy === voeu.id ? 'Confirmation...' : '✅ Confirmer ma place définitive' }}
                        </button>
                      }
                    </div>

                    <!-- Bouton Retirer -->
                    @if (['BROUILLON','SOUMISE','EN_EVALUATION','ADMISE','LISTE_ATTENTE'].includes(voeu.statut)) {
                      <button type="button"
                              class="w-full sm:w-auto text-xs font-semibold text-[#9E3030] hover:bg-rose-50 py-2 px-3 rounded-xs border border-transparent hover:border-rose-200 cursor-pointer text-center"
                              [disabled]="busy === voeu.id"
                              (click)="withdraw(voeu)">
                        Retirer ce vœu
                      </button>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class CandidatureComponent implements OnInit, OnDestroy {
  sessions: SessionAdmission[] = [];
  voeux: Candidature[] = [];
  selectedPieceTypes: Record<string, string> = {};
  loading = true;
  syncing = false;
  refreshing = false;
  error = '';
  submitting = '';
  busy = '';
  private sub: Subscription | null = null;

  constructor(
    private admission: AdmissionService,
    private notifications: NotificationsService,
    private toast: ToastService,
    private apprenantService: ApprenantService,
    private auth: AuthService,
  ) {
    const cachedSessions = this.admission.getSessionsPubliquesSnapshot();
    if (cachedSessions && cachedSessions.length > 0) {
      this.sessions = cachedSessions;
      this.loading = false;
    }

    const cachedVoeux = this.admission.getMesVoeuxSnapshot();
    if (cachedVoeux) {
      this.voeux = cachedVoeux;
    }
  }

  ngOnInit(): void {
    this.loadSessions();
    this.loadVoeux(false);

    // Abonnement temps réel SSE
    this.sub = this.notifications.messages().subscribe({
      next: (msg) => {
        if (msg && typeof msg === 'object') {
          if (msg.type === 'ADMISSION_STATUS_CHANGE' || msg.type === 'ADMISSION_CONFIRMED' || msg.type === 'ADMISSION_INSCRIBED') {
            this.loadVoeux(false);
            this.apprenantService.invalidateCache([
              this.apprenantService.CACHE_KEYS.FORMATIONS,
              this.apprenantService.CACHE_KEYS.DASHBOARD,
              this.apprenantService.CACHE_KEYS.BOOTSTRAP
            ]);
          } else if (msg.type === 'SESSION_OUVERTE' || msg.type === 'SESSION_PARTAGEE') {
            // Nouvelle session disponible pour cet établissement
            this.loadSessions();
            this.toast.info(`📢 ${msg.message || 'Une nouvelle session d\'admission est disponible pour votre établissement !'}`);
          }
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadSessions(): void {
    this.syncing = true;
    // Filtrer les sessions par établissement de l'apprenant connecté
    const etablissementId = this.auth.currentUser?.etablissementId || undefined;
    this.admission.getSessionsPubliques(etablissementId).subscribe({
      next: (sessions) => {
        this.sessions = sessions || [];
        this.loading = false;
        this.syncing = false;
      },
      error: () => {
        this.loading = false;
        this.syncing = false;
      },
    });
  }

  loadVoeux(manual = false): void {
    if (manual) this.refreshing = true;
    this.admission.getMesVoeux().subscribe({
      next: (voeux) => {
        this.voeux = voeux || [];
        this.voeux.forEach((v) => {
          if (!this.selectedPieceTypes[v.id]) {
            this.selectedPieceTypes[v.id] = 'PIECE_IDENTITE';
          }
        });
        this.refreshing = false;
      },
      error: () => {
        this.refreshing = false;
      },
    });
  }

  isApplied(sessionId: string): boolean {
    return this.voeux.some((voeu) => voeu.session.id === sessionId && voeu.statut !== 'RETIREE' && voeu.statut !== 'REJETEE' && voeu.statut !== 'EXPIREE');
  }

  apply(session: SessionAdmission): void {
    this.submitting = session.id;
    this.error = '';
    this.admission.createCandidature(session.id).subscribe({
      next: (voeu) => {
        this.voeux = [voeu, ...this.voeux];
        this.selectedPieceTypes[voeu.id] = 'PIECE_IDENTITE';
        this.submitting = '';
        this.toast.success('Vœu ajouté avec succès en brouillon. Veuillez joindre vos pièces justificatives.');
      },
      error: (error) => {
        this.error = error.error?.message || 'Impossible d’ajouter ce vœu.';
        this.toast.error(this.error);
        this.submitting = '';
      },
    });
  }

  upload(voeu: Candidature, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const pieceType = this.selectedPieceTypes[voeu.id] || 'PIECE_IDENTITE';
    this.busy = voeu.id;
    this.admission.uploadPiece(voeu.id, pieceType, file).subscribe({
      next: (piece) => {
        voeu.pieces = [...(voeu.pieces || []), piece];
        this.busy = '';
        this.toast.success(`Pièce "${piece.nomFichier}" déposée avec succès.`);
        (event.target as HTMLInputElement).value = '';
      },
      error: (error) => {
        this.error = error.error?.message || 'Impossible de déposer la pièce.';
        this.toast.error(this.error);
        this.busy = '';
        (event.target as HTMLInputElement).value = '';
      },
    });
  }

  deletePiece(voeu: Candidature, pieceId: string): void {
    this.busy = voeu.id;
    this.admission.deletePiece(voeu.id, pieceId).subscribe({
      next: () => {
        voeu.pieces = (voeu.pieces || []).filter((p) => p.id !== pieceId);
        this.busy = '';
        this.toast.info('Pièce supprimée du dossier.');
      },
      error: (error) => {
        this.error = error.error?.message || 'Impossible de supprimer la pièce.';
        this.toast.error(this.error);
        this.busy = '';
      },
    });
  }

  submit(voeu: Candidature): void {
    if (!voeu.pieces || voeu.pieces.length === 0) {
      this.toast.error('Veuillez joindre au moins une pièce justificative avant de soumettre.');
      return;
    }
    this.busy = voeu.id;
    this.admission.submitCandidature(voeu.id).subscribe({
      next: (updated) => {
        this.voeux = this.voeux.map((item) => item.id === updated.id ? { ...item, ...updated } : item);
        this.busy = '';
        this.toast.success('Dossier de candidature complet soumis pour évaluation.');
        this.apprenantService.invalidateCache();
        this.apprenantService.getBootstrap(true).subscribe({ error: () => {} });
      },
      error: (error) => {
        this.error = error.error?.message || 'Impossible de soumettre le dossier.';
        this.toast.error(this.error);
        this.busy = '';
      },
    });
  }

  confirm(voeu: Candidature): void {
    this.busy = voeu.id;
    this.admission.confirmCandidature(voeu.id).subscribe({
      next: (updated) => {
        this.voeux = this.voeux.map((item) => {
          if (item.id === updated.id) return { ...item, ...updated };
          if (['BROUILLON', 'SOUMISE', 'EN_EVALUATION', 'ADMISE', 'LISTE_ATTENTE'].includes(item.statut)) {
            return { ...item, statut: 'RETIREE' };
          }
          return item;
        });
        this.busy = '';
        this.toast.success('Admission confirmée ! Vos autres vœux ont été automatiquement retirés.');
        // Invalidation instantanée pour que le tableau de bord et mes formations soient à jour
        this.apprenantService.invalidateCache([
          this.apprenantService.CACHE_KEYS.FORMATIONS,
          this.apprenantService.CACHE_KEYS.DASHBOARD,
          this.apprenantService.CACHE_KEYS.BOOTSTRAP
        ]);
      },
      error: (error) => {
        this.error = error.error?.message || 'Impossible de confirmer l’admission.';
        this.toast.error(this.error);
        this.busy = '';
      },
    });
  }

  withdraw(voeu: Candidature): void {
    this.busy = voeu.id;
    this.admission.withdrawCandidature(voeu.id).subscribe({
      next: (updated) => {
        this.voeux = this.voeux.map((item) => item.id === updated.id ? { ...item, ...updated } : item);
        this.busy = '';
        this.toast.info('Vœu retiré.');
      },
      error: (error) => {
        this.error = error.error?.message || 'Impossible de retirer le vœu.';
        this.toast.error(this.error);
        this.busy = '';
      },
    });
  }

  downloadingPieceId: string | null = null;

  viewPiece(piece: { fileUrl?: string; nomFichier?: string }): void {
    if (!piece.fileUrl) {
      this.toast.error('Document non disponible.');
      return;
    }
    const url = this.getPieceUrl(piece.fileUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  downloadPiece(piece: { fileUrl?: string; nomFichier?: string; id?: string }): void {
    if (!piece.fileUrl) {
      this.toast.error('Document non disponible.');
      return;
    }
    const pieceKey = piece.id || piece.nomFichier || piece.fileUrl;
    this.downloadingPieceId = pieceKey;
    this.admission.downloadFile(piece.fileUrl).subscribe({
      next: (blob) => {
        this.admission.saveBlob(blob, piece.nomFichier || 'document');
        this.downloadingPieceId = null;
        this.toast.success(`Téléchargement de « ${piece.nomFichier || 'document'} » terminé.`);
      },
      error: () => {
        this.downloadingPieceId = null;
        const fullUrl = this.getPieceUrl(piece.fileUrl);
        const a = document.createElement('a');
        a.href = fullUrl;
        a.download = piece.nomFichier || 'document';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
    });
  }

  getPieceUrl(fileUrl?: string): string {
    return this.admission.getPieceUrl(fileUrl);
  }

  formatPieceType(type: string): string {
    switch (type) {
      case 'PIECE_IDENTITE': return 'Pièce d\'identité';
      case 'DIPLOME': return 'Diplôme';
      case 'RELEVE_NOTES': return 'Relevé de notes';
      case 'PHOTO': return 'Photo';
      case 'CV': return 'CV';
      case 'LETTRE_MOTIVATION': return 'Lettre de motivation';
      default: return 'Autre';
    }
  }

  getStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      BROUILLON: '📝 Dossier en cours',
      SOUMISE: '📤 Soumis — En attente d\'examen',
      EN_EVALUATION: '🔍 En cours d\'évaluation',
      ADMISE: '🎉 Admis(e) — Confirmation requise',
      LISTE_ATTENTE: '⏳ Liste d\'attente',
      CONFIRMEE: '✅ Confirmé(e)',
      INSCRITE: '🎓 Inscrit(e) — Accès LMS actif',
      REJETEE: '❌ Non retenu(e)',
      EXPIREE: '⌛ Délai expiré',
      RETIREE: '🚫 Retiré(e)',
    };
    return labels[statut] || statut;
  }
}
