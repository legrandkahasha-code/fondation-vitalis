import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EtablissementsService } from '../../../core/services/etablissements.service';
import { ToastService } from '../../../core/services/toast.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Etablissement } from '../../../core/models';

@Component({
  selector: 'app-etablissements',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="max-w-7xl mx-auto pb-16 font-['Public_Sans',sans-serif] px-4 sm:px-6">

        <!-- En-tête Institutionnel -->
        <div class="mb-8 bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-2xs">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div class="text-[12px] uppercase font-semibold tracking-[0.06em] text-[#4B5157]">
                04 · Administration Centrale · Réseau National
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] mt-1 tracking-tight">
                Gouvernance des Établissements & Antennes
              </h1>
              <div class="barre"></div>
              <p class="text-[14px] text-[#4B5157] max-w-3xl leading-relaxed mt-3">
                Pilotage des antennes territoriales, paramétrage des campus satellites, gestion du cycle de vie et intégrité des raccordements.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                (click)="ouvrirFormulaireCreation()"
                class="btn btn-primary text-xs py-2.5 px-4 font-semibold inline-flex items-center gap-2 shadow-2xs"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>Nouvelle Antenne</span>
              </button>
              <button
                type="button"
                (click)="load(true)"
                [disabled]="loading || refreshing"
                class="btn btn-ghost text-xs py-2.5 px-3.5 inline-flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" [class.animate-spin]="loading || refreshing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Formulaire création / édition -->
        @if (showForm) {
          <div class="bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-2xs mb-8 animate-in fade-in duration-200">
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <h3 class="text-base font-bold text-[#1B1D1F]">
                {{ editing ? ('Modifier : ' + editing.nom) : 'Création d’une Nouvelle Antenne Réseau' }}
              </h3>
              <button (click)="annulerFormulaire()" class="text-xs text-[#4B5157] hover:text-[#1B1D1F] cursor-pointer">✕ Annuler</button>
            </div>

            <form (ngSubmit)="save()" class="space-y-4 text-xs">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="md:col-span-2">
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Dénomination de l'établissement *</label>
                  <input
                    type="text"
                    [(ngModel)]="form.nom"
                    name="nom"
                    required
                    placeholder="Ex: Campus Lubumbashi - Antenne Katanga"
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
                  />
                </div>
                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Code Antenne</label>
                  <input
                    type="text"
                    [(ngModel)]="form.codeAntenne"
                    name="codeAntenne"
                    placeholder="Ex: LSH-01 (Auto si vide)"
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] uppercase font-mono"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="md:col-span-2">
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Adresse physique / Siège</label>
                  <input
                    type="text"
                    [(ngModel)]="form.adresse"
                    name="adresse"
                    placeholder="Numéro, avenue, commune, ville"
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
                  />
                </div>
                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Pays</label>
                  <select
                    [(ngModel)]="form.pays"
                    name="pays"
                    class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
                  >
                    <option value="RDC">RDC (République Démocratique du Congo)</option>
                    <option value="COG">Congo Brazzaville</option>
                    <option value="FRA">France</option>
                    <option value="BEL">Belgique</option>
                    <option value="CAN">Canada</option>
                  </select>
                </div>
              </div>

              <div class="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" (click)="annulerFormulaire()" class="btn btn-ghost py-2 px-4 cursor-pointer">
                  Annuler
                </button>
                <button
                  type="submit"
                  [disabled]="sauvegardeEnCours"
                  class="btn btn-primary py-2 px-6 font-semibold cursor-pointer"
                >
                  {{ sauvegardeEnCours ? 'Enregistrement...' : (editing ? 'Mettre à jour' : 'Créer l’antenne') }}
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Filtres et Recherche -->
        <div class="bg-white border border-[#D7DBDE] p-4 rounded-xs shadow-2xs mb-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#4B5157] mb-1">Recherche</label>
              <input
                type="text"
                [(ngModel)]="recherche"
                placeholder="Nom, code, adresse..."
                class="w-full text-xs p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#4B5157] mb-1">Statut d'exploitation</label>
              <select
                [(ngModel)]="filtreStatut"
                class="w-full text-xs p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
              >
                <option value="">Tous les statuts</option>
                <option value="ACTIF">Actif</option>
                <option value="SUSPENDU">Suspendu</option>
                <option value="FERME">Fermé</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#4B5157] mb-1">Pays</label>
              <select
                [(ngModel)]="filtrePays"
                class="w-full text-xs p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
              >
                <option value="">Tous les pays</option>
                <option value="RDC">RDC</option>
                <option value="COG">Congo Brazzaville</option>
                <option value="FRA">France</option>
                <option value="BEL">Belgique</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tableau des Établissements -->
        <div class="bg-white border border-[#D7DBDE] rounded-xs shadow-2xs overflow-hidden">
          @if (loading) {
            <div class="p-12 text-center">
              <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin"></div>
              <p class="mt-4 text-sm text-[#4B5157]">Chargement des antennes du réseau...</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-[#F5F6F7] border-b border-[#D7DBDE] text-[#4B5157] font-semibold uppercase text-[11px] tracking-wider">
                    <th class="py-3 px-4">Établissement / Antenne</th>
                    <th class="py-3 px-4">Code</th>
                    <th class="py-3 px-4">Localisation</th>
                    <th class="py-3 px-4 text-center">Effectifs</th>
                    <th class="py-3 px-4 text-center">Formations</th>
                    <th class="py-3 px-4">Statut</th>
                    <th class="py-3 px-4 text-right">Cycle de Vie & Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  @for (e of etablissementsFiltres; track e.id) {
                    <tr class="hover:bg-[#F5F6F7]/60 transition-colors">
                      <!-- Nom -->
                      <td class="py-3 px-4">
                        <div class="font-bold text-[#1B1D1F]">{{ e.nom }}</div>
                        <div class="text-[10px] text-gray-400">{{ e.typeEtablissement || 'SATELLITE_NATIONAL' }}</div>
                      </td>

                      <!-- Code -->
                      <td class="py-3 px-4 font-mono font-semibold text-[#1C75BC]">
                        {{ e.codeAntenne || '—' }}
                      </td>

                      <!-- Localisation -->
                      <td class="py-3 px-4 text-[#4B5157]">
                        <div>{{ e.adresse || 'Adresse non renseignée' }}</div>
                        <span class="text-[10px] text-[#4B5157] font-semibold uppercase">{{ e.pays || 'RDC' }}</span>
                      </td>

                      <!-- Effectifs -->
                      <td class="py-3 px-4 text-center">
                        <span class="font-bold text-[#1B1D1F]">{{ e._count?.utilisateurs ?? 0 }}</span>
                        <span class="text-[10px] text-gray-400 block">usagers</span>
                      </td>

                      <!-- Formations -->
                      <td class="py-3 px-4 text-center">
                        <span class="font-bold text-[#1C75BC]">{{ e._count?.formations ?? 0 }}</span>
                        <span class="text-[10px] text-gray-400 block">cours</span>
                      </td>

                      <!-- Statut -->
                      <td class="py-3 px-4">
                        @if (e.statut === 'ACTIF' || !e.statut) {
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F1EA] text-[#276B44] border border-[#276B44]/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-[#276B44]"></span>
                            ACTIF
                          </span>
                        } @else if (e.statut === 'SUSPENDU') {
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDECDD] text-[#F0791E] border border-[#F0791E]/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-[#F0791E]"></span>
                            SUSPENDU
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDE6E6] text-[#ED1C24] border border-[#ED1C24]/30">
                            <span class="w-1.5 h-1.5 rounded-full bg-[#ED1C24]"></span>
                            FERMÉ
                          </span>
                        }
                      </td>

                      <!-- Actions sécurisées -->
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            type="button"
                            (click)="edit(e)"
                            class="px-2.5 py-1 text-xs font-semibold rounded-xs border border-[#D7DBDE] text-[#4B5157] hover:bg-[#F5F6F7] cursor-pointer inline-flex items-center gap-1"
                          >
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Éditer</span>
                          </button>

                          <!-- Bascule statut sécurisée (pas de delete destructif) -->
                          @if (e.statut === 'ACTIF' || !e.statut) {
                            <button
                              type="button"
                              (click)="changerStatut(e, 'SUSPENDU')"
                              [disabled]="actionEnCours === e.id"
                              class="px-2.5 py-1 text-xs font-semibold rounded-xs border border-[#F0791E]/30 text-[#F0791E] hover:bg-[#FDECDD] cursor-pointer inline-flex items-center gap-1"
                              title="Suspendre temporairement l'antenne"
                            >
                              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Suspendre</span>
                            </button>
                          } @else if (e.statut === 'SUSPENDU') {
                            <button
                              type="button"
                              (click)="changerStatut(e, 'ACTIF')"
                              [disabled]="actionEnCours === e.id"
                              class="px-2.5 py-1 text-xs font-semibold rounded-xs border border-[#276B44]/30 text-[#276B44] hover:bg-[#E7F1EA] cursor-pointer inline-flex items-center gap-1"
                              title="Réactiver l'antenne"
                            >
                              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Réactiver</span>
                            </button>
                          } @else {
                            <button
                              type="button"
                              (click)="changerStatut(e, 'ACTIF')"
                              [disabled]="actionEnCours === e.id"
                              class="px-2.5 py-1 text-xs font-semibold rounded-xs border border-[#276B44]/30 text-[#276B44] hover:bg-[#E7F1EA] cursor-pointer inline-flex items-center gap-1"
                            >
                              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Rouvrir</span>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                  @if (etablissementsFiltres.length === 0) {
                    <tr>
                      <td colspan="7" class="py-8 text-center text-gray-400 italic">
                        Aucun établissement ne correspond aux critères.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="px-4 py-3 bg-[#F5F6F7] border-t border-[#D7DBDE] text-xs text-[#4B5157] flex justify-between items-center">
              <span>Total : {{ etablissementsFiltres.length }} sur {{ etablissements.length }} antennes</span>
            </div>
          }
        </div>

      </div>
    </app-main-layout>
  `,
})
export class EtablissementsComponent implements OnInit {
  etablissements: Etablissement[] = [];
  loading = false;
  refreshing = false;
  showForm = false;
  editing: Etablissement | null = null;
  sauvegardeEnCours = false;
  actionEnCours: string | null = null;
  private streamSub?: Subscription;

  // Filtres
  recherche = '';
  filtreStatut = '';
  filtrePays = '';

  form = {
    nom: '',
    codeAntenne: '',
    adresse: '',
    pays: 'RDC',
  };

  constructor(
    private service: EtablissementsService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    const cached = this.service.getCached();
    if (cached && cached.length > 0) {
      this.etablissements = [...cached];
      this.loading = false;
    } else {
      this.loading = true;
    }

    // Réception réactive continue (0ms)
    this.streamSub = this.service.etablissements$.subscribe((list) => {
      if (list) {
        this.etablissements = list;
        this.loading = false;
        this.refreshing = false;
      }
    });

    this.load(false);
  }

  ngOnDestroy() {
    this.streamSub?.unsubscribe();
  }

  load(forceRefresh = false) {
    if (this.etablissements.length === 0) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }

    this.service.getAll(forceRefresh).subscribe({
      next: (d) => {
        this.etablissements = d;
        this.loading = false;
        this.refreshing = false;
      },
      error: () => {
        if (this.etablissements.length === 0) {
          this.toast.error('Erreur lors du chargement des établissements');
        }
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  get etablissementsFiltres(): Etablissement[] {
    return this.etablissements.filter((e) => {
      if (this.recherche.trim()) {
        const query = this.recherche.toLowerCase().trim();
        const matchNom = e.nom?.toLowerCase().includes(query);
        const matchCode = e.codeAntenne?.toLowerCase().includes(query);
        const matchAdresse = e.adresse?.toLowerCase().includes(query);
        if (!matchNom && !matchCode && !matchAdresse) return false;
      }

      if (this.filtreStatut && (e.statut || 'ACTIF') !== this.filtreStatut) {
        return false;
      }

      if (this.filtrePays && (e.pays || 'RDC') !== this.filtrePays) {
        return false;
      }

      return true;
    });
  }

  ouvrirFormulaireCreation() {
    this.editing = null;
    this.form = { nom: '', codeAntenne: '', adresse: '', pays: 'RDC' };
    this.showForm = true;
  }

  edit(e: Etablissement) {
    this.editing = e;
    this.form = {
      nom: e.nom,
      codeAntenne: e.codeAntenne || '',
      adresse: e.adresse || '',
      pays: e.pays || 'RDC',
    };
    this.showForm = true;
  }

  annulerFormulaire() {
    this.showForm = false;
    this.editing = null;
    this.form = { nom: '', codeAntenne: '', adresse: '', pays: 'RDC' };
  }

  save() {
    if (!this.form.nom.trim()) {
      this.toast.error("Le nom de l'établissement est requis.");
      return;
    }

    this.sauvegardeEnCours = true;
    const obs = this.editing
      ? this.service.update(this.editing.id, {
          nom: this.form.nom,
          codeAntenne: this.form.codeAntenne || undefined,
          adresse: this.form.adresse,
          pays: this.form.pays,
        })
      : this.service.create({
          nom: this.form.nom,
          codeAntenne: this.form.codeAntenne || undefined,
          adresse: this.form.adresse,
          pays: this.form.pays,
        });

    obs.subscribe({
      next: (saved: any) => {
        this.toast.success(
          this.editing
            ? 'Établissement mis à jour avec succès'
            : 'Nouvel établissement créé avec succès'
        );
        this.sauvegardeEnCours = false;

        // Mise à jour immédiate et synchrone en mémoire (0 ms pour l'utilisateur)
        if (this.editing) {
          const idx = this.etablissements.findIndex((item) => item.id === this.editing!.id);
          if (idx !== -1) {
            this.etablissements[idx] = {
              ...this.etablissements[idx],
              nom: this.form.nom,
              codeAntenne: this.form.codeAntenne || this.etablissements[idx].codeAntenne,
              adresse: this.form.adresse,
              pays: this.form.pays,
              ...(saved || {}),
            };
            this.etablissements = [...this.etablissements];
          }
        } else if (saved) {
          const newEtab: Etablissement = {
            id: saved.id || 'etab-' + Date.now(),
            nom: this.form.nom,
            codeAntenne: this.form.codeAntenne || saved.codeAntenne,
            adresse: this.form.adresse,
            pays: this.form.pays,
            statut: 'ACTIF',
            _count: { utilisateurs: 0, formations: 0, satellites: 0 },
            ...(saved || {}),
          };
          this.etablissements = [newEtab, ...this.etablissements];
          this.etablissements = [...this.etablissements];
        }

        this.annulerFormulaire();
      },
      error: (err) => {
        const msg = err?.error?.message || "Erreur lors de l'enregistrement";
        this.toast.error(msg);
        this.sauvegardeEnCours = false;
      },
    });
  }

  changerStatut(e: Etablissement, nouveauStatut: string) {
    const actionLabel = nouveauStatut === 'SUSPENDU' ? 'suspendre' : 'activer';
    if (!confirm(`Confirmez-vous vouloir ${actionLabel} l'établissement "${e.nom}" ?`)) {
      return;
    }

    this.actionEnCours = e.id;
    this.service.updateStatut(e.id, nouveauStatut).subscribe({
      next: (saved: any) => {
        e.statut = nouveauStatut;
        const idx = this.etablissements.findIndex((item) => item.id === e.id);
        if (idx !== -1) {
          this.etablissements[idx] = {
            ...this.etablissements[idx],
            statut: nouveauStatut,
            ...(saved || {}),
          };
          this.etablissements = [...this.etablissements];
        }
        this.actionEnCours = null;
        this.toast.success(`Statut mis à jour : ${nouveauStatut}`);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Erreur lors du changement de statut';
        this.toast.error(msg);
        this.actionEnCours = null;
      },
    });
  }
}
