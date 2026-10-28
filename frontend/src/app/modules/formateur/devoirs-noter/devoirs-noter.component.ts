import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { DevoirsService, DevoirFormateurItem, SoumissionDevoir } from '../../../core/services/devoirs.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormateurBootstrapService } from '../../../core/services/formateur-bootstrap.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { environment } from '../../../../environments/environment';

type FilterType = 'TOUS' | 'A_CORRIGER' | 'NOTES';

@Component({
  selector: 'app-devoirs-noter',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent, DatePipe],
  template: `
    <app-main-layout>
      <div class="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
        <!-- ─── HEADER OFFICIEL ─────────────────────────────────────────── -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D7DBDE] pb-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-xs bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] text-[10px] font-bold uppercase tracking-wider">
                Espace Formateur · Évaluations
              </span>
              <!-- Indicateur Temps Réel Actif -->
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E7F1EA] text-[#276B44] text-[10px] font-bold border border-[#276B44]/20">
                <span class="w-1.5 h-1.5 rounded-full bg-[#276B44] animate-pulse"></span>
                <span>Temps réel connecté</span>
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] font-heading mt-1">
              Correction & Notation des Devoirs
            </h1>
            <p class="text-xs text-[#4B5157] mt-1">
              Évaluez les travaux pratiques déposés par vos apprenants, attribuez les notes sur 20 et formulez vos feedbacks pédagogiques.
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              (click)="loadDevoirs(true, false)"
              [disabled]="loading || refreshing"
              class="px-3.5 py-2 rounded-xs bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <svg
                class="w-3.5 h-3.5 text-[#1C75BC]"
                [class.animate-spin]="loading || refreshing"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ refreshing ? 'Synchronisation...' : 'Actualiser' }}</span>
            </button>
          </div>
        </div>

        <!-- ─── KPIS EN TÊTE ───────────────────────────────────────────── -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#4B5157]">Devoirs Configurés</span>
            @if (loading && devoirs.length === 0) {
              <div class="h-8 bg-slate-200 rounded animate-pulse w-16 mt-1"></div>
            } @else {
              <p class="text-2xl font-black font-mono text-[#1B1D1F] mt-1">{{ devoirs.length }}</p>
            }
            <p class="text-[11px] text-[#71787E] mt-0.5">Tous modules confondus</p>
          </div>

          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#4B5157]">Copies Déposées</span>
            @if (loading && devoirs.length === 0) {
              <div class="h-8 bg-slate-200 rounded animate-pulse w-16 mt-1"></div>
            } @else {
              <p class="text-2xl font-black font-mono text-[#1C75BC] mt-1">{{ totalSoumissions }}</p>
            }
            <p class="text-[11px] text-[#71787E] mt-0.5">Par vos apprenants</p>
          </div>

          <div class="p-4 bg-white border border-[#F0791E] bg-[#FDECDD]/20 rounded-xs shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#F0791E]">À Corriger</span>
            @if (loading && devoirs.length === 0) {
              <div class="h-8 bg-slate-200 rounded animate-pulse w-16 mt-1"></div>
            } @else {
              <p class="text-2xl font-black font-mono text-[#F0791E] mt-1">{{ totalEnAttente }}</p>
            }
            <p class="text-[11px] text-[#F0791E] font-semibold mt-0.5">En attente de notation</p>
          </div>

          <div class="p-4 bg-white border border-[#276B44] bg-[#E7F1EA]/20 rounded-xs shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#276B44]">Déjà Notés</span>
            @if (loading && devoirs.length === 0) {
              <div class="h-8 bg-slate-200 rounded animate-pulse w-16 mt-1"></div>
            } @else {
              <p class="text-2xl font-black font-mono text-[#276B44] mt-1">{{ totalNotes }}</p>
            }
            <p class="text-[11px] text-[#276B44] font-semibold mt-0.5">Feedbacks transmis</p>
          </div>
        </div>

        <!-- ─── CHARGEMENT OU CONTENU ───────────────────────────────────── -->
        @if (loading && devoirs.length === 0) {
          <div class="p-16 text-center text-[#4B5157] bg-white border border-[#D7DBDE] rounded-xs shadow-2xs space-y-3">
            <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs font-semibold">Chargement des devoirs et copies à corriger...</p>
            <p class="text-[11px] text-slate-400">Synchronisation sécurisée avec le registre pédagogique</p>
          </div>
        } @else if (loadError && devoirs.length === 0) {
          <div class="p-10 text-center bg-white border border-red-200 rounded-xs shadow-2xs space-y-3">
            <div class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto font-bold text-lg">!</div>
            <h3 class="text-sm font-bold text-[#1B1D1F]">Erreur de synchronisation</h3>
            <p class="text-xs text-red-600 max-w-md mx-auto">{{ loadError }}</p>
            <button
              type="button"
              (click)="loadDevoirs(true, false)"
              class="px-4 py-2 bg-[#1C75BC] text-white text-xs font-bold rounded-xs hover:bg-[#155d96] transition"
            >
              Réessayer la synchronisation
            </button>
          </div>
        } @else if (devoirs.length === 0) {
          <div class="p-12 text-center bg-white border border-[#D7DBDE] rounded-xs shadow-2xs space-y-3">
            <div class="w-12 h-12 rounded-xs bg-[#E7F1FA] text-[#1C75BC] flex items-center justify-center mx-auto border border-[#1C75BC]/30">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-[#1B1D1F]">Aucun devoir pratique configuré</h3>
            <p class="text-xs text-[#4B5157] max-w-md mx-auto">
              Vous n'avez pas encore de devoirs configurés dans les modules de vos formations. Pour en ajouter un, rendez-vous dans le détail d'une formation puis créez un devoir.
            </p>
          </div>
        } @else {
          <!-- ─── SÉLECTION DU DEVOIR ─────────────────────────────────── -->
          <div class="bg-white border border-[#D7DBDE] rounded-xs p-5 shadow-2xs space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label class="text-xs font-bold text-[#1B1D1F] uppercase tracking-wider">
                1. Sélectionner un Devoir à Corriger
              </label>
              @if (selectedDevoir) {
                <span class="text-xs text-[#4B5157]">
                  Formation : <strong class="text-[#124F80]">{{ selectedDevoir.formationTitre }}</strong> — Module : <strong class="text-[#1B1D1F]">{{ selectedDevoir.moduleTitre }}</strong>
                </span>
              }
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="md:col-span-2">
                <select
                  class="w-full px-3.5 py-2.5 rounded-xs border border-[#D7DBDE] text-xs font-medium text-[#1B1D1F] bg-[#F5F6F7] focus:bg-white focus:border-[#1C75BC] focus:outline-none transition-all"
                  [(ngModel)]="selectedDevoirId"
                  (change)="onDevoirSelected()"
                >
                  <option value="">— Choisissez un devoir ({{ devoirs.length }} disponibles) —</option>
                  @for (d of devoirs; track d.id) {
                    <option [value]="d.id">
                      {{ d.formationTitre }} › {{ d.moduleTitre }} › {{ d.titre }} ({{ d.nbEnAttente }} à noter / {{ d.nbTotalSoumissions }} dépôts)
                    </option>
                  }
                </select>
              </div>

              <!-- Filtre d'affichage des copies -->
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  (click)="filter = 'TOUS'"
                  class="flex-1 py-2 text-xs font-bold rounded-xs border transition-all cursor-pointer"
                  [class]="filter === 'TOUS' ? 'bg-[#1C75BC] text-white border-[#1C75BC]' : 'bg-white text-[#4B5157] border-[#D7DBDE] hover:bg-[#F5F6F7]'"
                >
                  Toutes ({{ selectedDevoir?.soumissions?.length || 0 }})
                </button>
                <button
                  type="button"
                  (click)="filter = 'A_CORRIGER'"
                  class="flex-1 py-2 text-xs font-bold rounded-xs border transition-all cursor-pointer"
                  [class]="filter === 'A_CORRIGER' ? 'bg-[#F0791E] text-white border-[#F0791E]' : 'bg-white text-[#F0791E] border-[#D7DBDE] hover:bg-[#FDECDD]/30'"
                >
                  À noter ({{ selectedDevoir?.nbEnAttente || 0 }})
                </button>
                <button
                  type="button"
                  (click)="filter = 'NOTES'"
                  class="flex-1 py-2 text-xs font-bold rounded-xs border transition-all cursor-pointer"
                  [class]="filter === 'NOTES' ? 'bg-[#276B44] text-white border-[#276B44]' : 'bg-white text-[#276B44] border-[#D7DBDE] hover:bg-[#E7F1EA]/30'"
                >
                  Notées ({{ selectedDevoir?.nbNotes || 0 }})
                </button>
              </div>
            </div>

            <!-- Détails / Consignes du devoir sélectionné -->
            @if (selectedDevoir) {
              <div class="p-3.5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs space-y-1.5 mt-2">
                <div class="flex items-center justify-between text-[#4B5157]">
                  <span class="font-bold text-[#1B1D1F]">Consignes & Modalités de notation :</span>
                  @if (selectedDevoir.dateLimite) {
                    <span class="font-mono text-[11px]" [class]="isPastDate(selectedDevoir.dateLimite) ? 'text-[#ED1C24] font-bold' : 'text-[#4B5157]'">
                      Date limite de dépôt : {{ selectedDevoir.dateLimite | date:'dd/MM/yyyy HH:mm' }}
                      {{ isPastDate(selectedDevoir.dateLimite) ? '(Dépassée)' : '' }}
                    </span>
                  }
                </div>
                <p class="text-[#1B1D1F] whitespace-pre-line leading-relaxed">
                  {{ selectedDevoir.consignes || 'Aucune consigne spécifique rédigée pour ce devoir.' }}
                </p>
              </div>
            }
          </div>

          <!-- ─── LISTE DES SOUMISSIONS POUR LE DEVOIR SÉLECTIONNÉ ─────── -->
          @if (selectedDevoir) {
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-bold uppercase tracking-wider text-[#1B1D1F]">
                  2. Copies déposées par les apprenants ({{ filteredSoumissions.length }})
                </h2>
              </div>

              @for (s of filteredSoumissions; track s.id) {
                <div
                  class="bg-white border rounded-xs p-5 shadow-2xs space-y-4 transition-all"
                  [class]="s.note !== null && s.note !== undefined ? 'border-[#D7DBDE] border-l-4 border-l-[#276B44]' : 'border-[#F0791E] border-l-4 border-l-[#F0791E]'"
                >
                  <!-- En-tête de la soumission -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D7DBDE] pb-3">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-[#1C75BC] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                        {{ s.apprenant?.prenom?.charAt(0) }}{{ s.apprenant?.nom?.charAt(0) }}
                      </div>
                      <div>
                        <h3 class="text-sm font-bold text-[#1B1D1F] leading-tight">
                          {{ s.apprenant?.prenom }} {{ s.apprenant?.nom }}
                        </h3>
                        <p class="text-[11px] text-[#71787E] font-mono mt-0.5">
                          {{ s.apprenant?.email }} · Déposé le {{ s.dateDepot | date:'dd/MM/yyyy à HH:mm' }}
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 self-start sm:self-auto">
                      <!-- Badge statut de notation -->
                      @if (s.note !== null && s.note !== undefined) {
                        <span class="px-2.5 py-1 rounded-xs bg-[#E7F1EA] text-[#276B44] border border-[#276B44] text-xs font-bold font-mono">
                          Note : {{ s.note }}/20
                        </span>
                      } @else {
                        <span class="px-2.5 py-1 rounded-xs bg-[#FDECDD] text-[#F0791E] border border-[#F0791E] text-xs font-bold uppercase tracking-wider">
                          À Corriger
                        </span>
                      }

                      <!-- Télécharger la copie -->
                      <a
                        [href]="resolveFileUrl(s.fileUrl)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="px-3 py-1.5 rounded-xs bg-[#E7F1FA] hover:bg-[#1C75BC] text-[#1C75BC] hover:text-white border border-[#1C75BC] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Ouvrir le fichier soumis par l'apprenant"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Télécharger la copie</span>
                      </a>
                    </div>
                  </div>

                  <!-- Zone de saisie de la note et du commentaire -->
                  <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                    <!-- Note sur 20 -->
                    <div class="sm:col-span-3">
                      <label class="block text-[11px] font-bold text-[#4B5157] uppercase tracking-wider mb-1">
                        Note attribuée (/20) *
                      </label>
                      <div class="relative">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          [(ngModel)]="notes[s.id]"
                          placeholder="Ex: 15.5"
                          class="w-full px-3 py-2 rounded-xs border border-[#D7DBDE] text-sm font-bold font-mono text-[#1B1D1F] bg-[#F5F6F7] focus:bg-white focus:border-[#1C75BC] focus:outline-none"
                        />
                        <span class="absolute right-3 top-2 text-xs font-bold text-[#71787E]">/20</span>
                      </div>
                    </div>

                    <!-- Feedback / Remarques -->
                    <div class="sm:col-span-7">
                      <label class="block text-[11px] font-bold text-[#4B5157] uppercase tracking-wider mb-1">
                        Commentaire pédagogique & remarques
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="commentaires[s.id]"
                        placeholder="Ex: Bon travail dans l'ensemble. Attention à la rigueur méthodologique..."
                        class="w-full px-3 py-2 rounded-xs border border-[#D7DBDE] text-xs text-[#1B1D1F] bg-[#F5F6F7] focus:bg-white focus:border-[#1C75BC] focus:outline-none"
                      />
                    </div>

                    <!-- Bouton enregistrer -->
                    <div class="sm:col-span-2">
                      <button
                        type="button"
                        (click)="noter(s)"
                        [disabled]="saving[s.id]"
                        class="w-full py-2 px-3 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        @if (saving[s.id]) {
                          <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Enregistrement...</span>
                        } @else {
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Enregistrer</span>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="p-8 text-center bg-white border border-[#D7DBDE] rounded-xs text-[#4B5157] space-y-2 shadow-2xs">
                  <p class="text-sm font-semibold">
                    {{ filter === 'A_CORRIGER' ? 'Aucune copie en attente de correction pour ce devoir.' : filter === 'NOTES' ? 'Aucune copie notée pour le moment.' : 'Aucune soumission déposée pour ce devoir.' }}
                  </p>
                  @if (filter !== 'TOUS') {
                    <button
                      type="button"
                      (click)="filter = 'TOUS'"
                      class="text-xs text-[#1C75BC] font-bold underline cursor-pointer"
                    >
                      Afficher toutes les copies
                    </button>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </app-main-layout>
  `,
})
export class DevoirsNoterComponent implements OnInit, OnDestroy {
  devoirs: DevoirFormateurItem[] = [];
  selectedDevoirId = '';
  selectedDevoir: DevoirFormateurItem | null = null;
  loading = true;
  refreshing = false;
  loadError = '';
  filter: FilterType = 'TOUS';

  notes: Record<string, number | null> = {};
  commentaires: Record<string, string> = {};
  saving: Record<string, boolean> = {};

  private sseSub?: Subscription;
  private pollSub?: Subscription;
  private bootstrapSub?: Subscription;

  constructor(
    private devoirsService: DevoirsService,
    private notifications: NotificationsService,
    private toast: ToastService,
    private formateurBootstrap: FormateurBootstrapService,
  ) {}

  ngOnInit(): void {
    // 0. Hydratation INSTANTANÉE depuis le cache bootstrap (0ms garanti)
    this.bootstrapSub = this.formateurBootstrap.devoirs$.subscribe((cachedDevoirs) => {
      if (cachedDevoirs && cachedDevoirs.length > 0 && this.loading) {
        this.devoirs = cachedDevoirs;
        this.loading = false;
        this.autoSelectDevoir();
      }
    });

    // 1. Chargement complet avec détail soumissions (les bootstrap KPIs ne suffisent pas, on charge aussi les soumissions détaillées)
    this.loadDevoirs(false, false);

    // 2. Flux Temps Réel SSE : Réception immédiate dès qu'une copie est déposée ou notée
    this.sseSub = this.notifications.messages().subscribe((msg) => {
      if (msg.type === 'DEVOIR_SUBMIT' || msg.type === 'DEVOIR_NOTE' || msg.type === 'DEVOIR_UPDATE') {
        this.devoirsService.invalidateCache();
        this.loadDevoirs(true, true);
      }
    });

    // 3. Filet de sécurité périodique (45s en arrière-plan sans bloquer l'UI)
    this.pollSub = timer(45_000, 45_000).subscribe(() => {
      this.loadDevoirs(true, true);
    });
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.bootstrapSub?.unsubscribe();
  }

  loadDevoirs(forceRefresh = false, isBackground = false): void {
    if (!isBackground && this.devoirs.length === 0) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }
    this.loadError = '';

    this.devoirsService.getDevoirsACorriger(forceRefresh).subscribe({
      next: (data) => {
        this.devoirs = data || [];
        this.loading = false;
        this.refreshing = false;
        this.loadError = '';
        this.autoSelectDevoir();
      },
      error: (err) => {
        this.loading = false;
        this.refreshing = false;
        if (this.devoirs.length === 0) {
          this.loadError = err?.error?.message || "Impossible de contacter le serveur en temps voulu. Veuillez vérifier votre connexion.";
        } else {
          this.toast.error("La synchronisation en arrière-plan a échoué.");
        }
      },
    });
  }

  onDevoirSelected(): void {
    if (!this.selectedDevoirId) {
      this.selectedDevoir = null;
      return;
    }
    const found = this.devoirs.find((d) => d.id === this.selectedDevoirId);
    this.selectedDevoir = found || null;
    this.hydrateNotes();
  }

  /** Sélectionne automatiquement un devoir (garde la sélection précédente si possible) */
  private autoSelectDevoir(): void {
    if (this.devoirs.length > 0) {
      if (this.selectedDevoirId) {
        const found = this.devoirs.find((d) => d.id === this.selectedDevoirId);
        if (found) {
          this.selectedDevoir = found;
          this.hydrateNotes();
          return;
        }
      }
      const pending = this.devoirs.find((d) => d.nbEnAttente > 0);
      this.selectedDevoir = pending || this.devoirs[0];
      this.selectedDevoirId = this.selectedDevoir.id;
      this.hydrateNotes();
    } else {
      this.selectedDevoir = null;
      this.selectedDevoirId = '';
    }
  }

  private hydrateNotes(): void {
    if (!this.selectedDevoir) return;
    for (const s of this.selectedDevoir.soumissions) {
      this.notes[s.id] = s.note !== null && s.note !== undefined ? Number(s.note) : null;
      this.commentaires[s.id] = s.commentaire || '';
    }
  }

  get totalSoumissions(): number {
    return this.devoirs.reduce((acc, d) => acc + (d.nbTotalSoumissions || 0), 0);
  }

  get totalEnAttente(): number {
    return this.devoirs.reduce((acc, d) => acc + (d.nbEnAttente || 0), 0);
  }

  get totalNotes(): number {
    return this.devoirs.reduce((acc, d) => acc + (d.nbNotes || 0), 0);
  }

  get filteredSoumissions(): SoumissionDevoir[] {
    if (!this.selectedDevoir) return [];
    if (this.filter === 'A_CORRIGER') {
      return this.selectedDevoir.soumissions.filter((s) => s.note === null || s.note === undefined);
    }
    if (this.filter === 'NOTES') {
      return this.selectedDevoir.soumissions.filter((s) => s.note !== null && s.note !== undefined);
    }
    return this.selectedDevoir.soumissions;
  }

  isPastDate(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  resolveFileUrl(url: string): string {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    const base = environment.apiUrl.replace('/api', '');
    return `${base}${url}`;
  }

  noter(s: SoumissionDevoir): void {
    if (!this.selectedDevoirId || !s.apprenant?.id) {
      this.toast.error("Impossible d'identifier l'apprenant ou le devoir.");
      return;
    }

    const noteRaw = this.notes[s.id];
    if (noteRaw === null || noteRaw === undefined || isNaN(Number(noteRaw))) {
      this.toast.error('Veuillez renseigner une note numérique valide comprise entre 0 et 20.');
      return;
    }

    const numNote = Number(noteRaw);
    if (numNote < 0 || numNote > 20) {
      this.toast.error('La note doit être obligatoirement comprise entre 0 et 20.');
      return;
    }

    const commentaire = (this.commentaires[s.id] || '').trim();

    this.saving[s.id] = true;
    this.devoirsService.noter(this.selectedDevoirId, s.apprenant.id, numNote, commentaire).subscribe({
      next: (res) => {
        this.saving[s.id] = false;
        s.note = numNote;
        s.commentaire = commentaire;

        // Mettre à jour les compteurs du devoir localement
        if (this.selectedDevoir) {
          this.selectedDevoir.nbNotes = this.selectedDevoir.soumissions.filter((x) => x.note !== null && x.note !== undefined).length;
          this.selectedDevoir.nbEnAttente = this.selectedDevoir.soumissions.filter((x) => x.note === null || x.note === undefined).length;
        }

        this.toast.success(`Note de ${numNote}/20 enregistrée avec succès pour ${s.apprenant?.prenom} ${s.apprenant?.nom}.`);
      },
      error: (err) => {
        this.saving[s.id] = false;
        this.toast.error(err?.error?.message || "Erreur lors de l'enregistrement de la note.");
      },
    });
  }
}
