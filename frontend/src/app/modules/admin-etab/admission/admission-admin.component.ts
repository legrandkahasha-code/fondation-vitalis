import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdmissionReference, AdmissionService, Candidature, SessionAdmission, SessionStats } from '../../../core/services/admission.service';
import { AuthService } from '../../../core/services/auth.service';
import { EtablissementsService } from '../../../core/services/etablissements.service';
import { LandingService } from '../../../core/services/landing.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { ContactMessageItem } from '../../../core/models';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';

@Component({
  selector: 'app-admission-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="px-4 py-8 sm:px-8 max-w-7xl mx-auto font-['Public_Sans',sans-serif] text-[#1B1D1F]">
        
        <!-- En-tête Institutionnel avec Signature Charte Graphique -->
        <div class="bg-white border border-[#D7DBDE] border-t-[5px] border-t-[#124F80] p-6 rounded-[2px] shadow-2xs mb-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="text-[11px] uppercase font-bold tracking-[0.06em] text-[#4B5157]">
                {{ isCentreAdmin ? '01 · Administration Centrale · Direction Générale' : '01 · Établissement Satellite · Direction Pédagogique' }}
              </div>
              <h1 class="mt-1 text-2xl sm:text-3xl font-bold text-[#1B1D1F] tracking-tight">
                Pilotage des Admissions & Examen des Dossiers
              </h1>
              <div class="barre"></div>
              <p class="mt-3 text-[13.5px] text-[#4B5157] max-w-3xl leading-relaxed">
                Supervision des campagnes de recrutement, instruction minutieuse des dossiers d'adhésion, vérification des pièces justificatives et formalisation des décisions officielles avec droit aux explications.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0 flex-wrap">
              <button (click)="openEnrolementModal()"
                      class="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-2xs font-semibold cursor-pointer">
                <span>👤</span>
                <span>+ Enrôler un Apprenant</span>
              </button>
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-[2px] bg-[#E7F1EA] text-[#276B44] border border-[#276B44]/30 text-xs font-semibold">
                <span class="w-2 h-2 rounded-full bg-[#276B44] animate-pulse"></span>
                <span>Réseau National en Direct</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Système d'onglets conforme charte graphique (.app-tabs avec accent orange) -->
        <div class="bg-white border border-[#D7DBDE] mb-6 rounded-[2px] shadow-2xs">
          <div class="flex overflow-x-auto border-b border-[#D7DBDE] px-3">
            <button
              type="button"
              (click)="activeTab = 'candidatures'"
              [class.text-[#1C75BC]]="activeTab === 'candidatures'"
              [class.border-b-[#F0791E]]="activeTab === 'candidatures'"
              [class.bg-[#F5F6F7]]="activeTab === 'candidatures'"
              [class.text-[#4B5157]]="activeTab !== 'candidatures'"
              [class.border-b-transparent]="activeTab !== 'candidatures'"
              class="px-4 py-3 text-[13px] font-semibold transition-all border-b-[3px] flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-[#1B1D1F] hover:bg-[#F5F6F7]/50"
            >
              <span>📋</span>
              <span>Dossiers & Candidatures</span>
              <span class="rounded-[2px] px-2 py-0.5 text-xs font-bold"
                    [ngClass]="activeTab === 'candidatures' ? 'bg-[#1C75BC] text-white' : 'bg-[#E7F1FA] text-[#1C75BC]'">
                {{ allCandidatures.length }}
              </span>
            </button>

            <button
              type="button"
              (click)="activeTab = 'sessions'"
              [class.text-[#1C75BC]]="activeTab === 'sessions'"
              [class.border-b-[#F0791E]]="activeTab === 'sessions'"
              [class.bg-[#F5F6F7]]="activeTab === 'sessions'"
              [class.text-[#4B5157]]="activeTab !== 'sessions'"
              [class.border-b-transparent]="activeTab !== 'sessions'"
              class="px-4 py-3 text-[13px] font-semibold transition-all border-b-[3px] flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-[#1B1D1F] hover:bg-[#F5F6F7]/50"
            >
              <span>🎯</span>
              <span>Sessions d'Admission</span>
              <span class="rounded-[2px] px-2 py-0.5 text-xs font-bold"
                    [ngClass]="activeTab === 'sessions' ? 'bg-[#1C75BC] text-white' : 'bg-gray-100 text-gray-700'">
                {{ sessions.length }}
              </span>
            </button>

            <button
              type="button"
              (click)="activeTab = 'stats'"
              [class.text-[#1C75BC]]="activeTab === 'stats'"
              [class.border-b-[#F0791E]]="activeTab === 'stats'"
              [class.bg-[#F5F6F7]]="activeTab === 'stats'"
              [class.text-[#4B5157]]="activeTab !== 'stats'"
              [class.border-b-transparent]="activeTab !== 'stats'"
              class="px-4 py-3 text-[13px] font-semibold transition-all border-b-[3px] flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-[#1B1D1F] hover:bg-[#F5F6F7]/50"
            >
              <span>📊</span>
              <span>Vue Consolidée & Statistiques</span>
            </button>

            <button
              type="button"
              (click)="activeTab = 'orientations'"
              [class.text-[#1C75BC]]="activeTab === 'orientations'"
              [class.border-b-[#F0791E]]="activeTab === 'orientations'"
              [class.bg-[#F5F6F7]]="activeTab === 'orientations'"
              [class.text-[#4B5157]]="activeTab !== 'orientations'"
              [class.border-b-transparent]="activeTab !== 'orientations'"
              class="px-4 py-3 text-[13px] font-semibold transition-all border-b-[3px] flex items-center gap-2 whitespace-nowrap cursor-pointer hover:text-[#1B1D1F] hover:bg-[#F5F6F7]/50"
            >
              <span>📬</span>
              <span>Demandes d'Orientation (Landing Page)</span>
              <span class="rounded-[2px] px-2 py-0.5 text-xs font-bold"
                    [ngClass]="activeTab === 'orientations' ? 'bg-[#1C75BC] text-white' : 'bg-[#E7F1FA] text-[#1C75BC]'">
                {{ orientations.length }}
              </span>
            </button>
          </div>
        </div>

        <!-- Alertes erreurs avec charte officielle (rouge institutionnel) -->
        <div *ngIf="error" class="mb-6 p-4 rounded-[2px] border border-[#ED1C24] bg-[#FDE6E6] text-xs sm:text-sm text-[#ED1C24] shadow-xs flex items-center justify-between">
          <div class="flex items-center gap-2 font-medium">
            <span>⚠️</span>
            <span>{{ error }}</span>
          </div>
          <button (click)="error = ''" class="text-xs text-[#ED1C24] hover:text-[#b8141a] font-bold p-1 cursor-pointer">✕</button>
        </div>

        <!-- ========================================================================================= -->
        <!-- ONGLET 1 : TOUTES LES CANDIDATURES DU RESEAU                                              -->
        <!-- ========================================================================================= -->
        <section *ngIf="activeTab === 'candidatures'" class="space-y-4">
          <!-- Barre de recherche et filtres -->
          <div class="grid gap-3 rounded-[2px] border border-[#D7DBDE] bg-white p-4 shadow-2xs md:grid-cols-4">
            <div class="relative md:col-span-2">
              <input type="text" class="w-full pl-8 pr-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                     [(ngModel)]="searchFilter" (ngModelChange)="filterCandidatures()"
                     placeholder="Rechercher par nom, prénom, email ou matricule..." />
              <span class="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
            </div>

            <select class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                    [(ngModel)]="statusFilter" (ngModelChange)="filterCandidatures()">
              <option value="">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="SOUMISE">Soumise (En attente d'examen)</option>
              <option value="EN_EVALUATION">En cours d'évaluation</option>
              <option value="ADMISE">Admise (En attente confirmation)</option>
              <option value="LISTE_ATTENTE">Liste d'attente</option>
              <option value="CONFIRMEE">Confirmée par l'apprenant</option>
              <option value="INSCRITE">Inscrite (LMS Actif)</option>
              <option value="REJETEE">Rejetée</option>
              <option value="RETIREE">Retirée</option>
              <option value="EXPIREE">Expirée</option>
            </select>

            <select class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                    [(ngModel)]="sessionFilter" (ngModelChange)="filterCandidatures()">
              <option value="">Toutes les sessions</option>
              <option *ngFor="let s of sessions" [value]="s.id">{{ s.libelle }}</option>
            </select>
          </div>

          <!-- Tableau des candidatures conforme charte -->
          <div class="overflow-x-auto rounded-[2px] border border-[#D7DBDE] bg-white shadow-2xs">
            <table class="w-full text-left text-xs text-[#1B1D1F]">
              <thead class="bg-[#F5F6F7] text-[11px] font-bold uppercase tracking-[0.05em] text-[#4B5157] border-b border-[#D7DBDE]">
                <tr>
                  <th class="p-3.5">Candidat & Dossier</th>
                  <th class="p-3.5">Session / Formation</th>
                  <th class="p-3.5">Établissement</th>
                  <th class="p-3.5">Justificatifs</th>
                  <th class="p-3.5">Statut Officiel</th>
                  <th class="p-3.5">Avis & Explications</th>
                  <th class="p-3.5 text-right">Actions d'Évaluation</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#D7DBDE]">
                <tr *ngIf="filteredCandidatures.length === 0">
                  <td colspan="7" class="p-8 text-center text-sm text-[#4B5157]">
                    Aucun dossier trouvé avec les critères de recherche sélectionnés.
                  </td>
                </tr>
                <tr *ngFor="let c of filteredCandidatures" class="hover:bg-[#F5F6F7]/60 transition">
                  <!-- Candidat -->
                  <td class="p-3.5 font-medium">
                    <div class="font-bold text-[#1B1D1F] text-[13px]">{{ c.apprenant?.prenom }} {{ c.apprenant?.nom }}</div>
                    <div class="text-[11px] text-[#4B5157] font-mono mt-0.5">{{ c.apprenant?.email }}</div>
                    <div *ngIf="c.apprenant?.telephone" class="text-[10px] text-[#4B5157]">📞 {{ c.apprenant?.telephone }}</div>
                    <div *ngIf="c.conflitCalendrier" class="mt-1 text-[10px] font-semibold text-[#F0791E] bg-[#FDECDD] px-1.5 py-0.5 rounded-[2px] border border-[#F0791E]/30 inline-block">
                      ⚠️ Candidature concurrente active
                    </div>
                  </td>

                  <!-- Session -->
                  <td class="p-3.5">
                    <div class="font-bold text-[#1C75BC]">{{ c.session.libelle || '—' }}</div>
                    <div class="text-[11px] text-[#4B5157] mt-0.5">{{ c.session.filiere.libelle || '—' }} · {{ c.session.niveau.libelle || '—' }}</div>
                  </td>

                  <!-- Etablissement -->
                  <td class="p-3.5 text-[#4B5157]">
                    <div class="font-semibold text-[#1B1D1F]">{{ c.session.etablissement.nom || '—' }}</div>
                    <div class="text-[10px] text-[#4B5157]">Code : {{ c.session.etablissement.codeAntenne || '—' }}</div>
                  </td>

                  <!-- Pièces jointes -->
                  <td class="p-3.5">
                    <button (click)="openDetailModal(c)" class="inline-flex items-center gap-1 text-xs font-semibold text-[#1C75BC] hover:underline cursor-pointer">
                      <span>📁 {{ c.pieces?.length || 0 }} pièce(s)</span>
                    </button>
                  </td>

                  <!-- Statut -->
                  <td class="p-3.5">
                    <span class="rounded-[2px] px-2.5 py-1 text-[11px] font-bold inline-block border"
                          [ngClass]="getStatutBadgeClass(c.statut)">
                      {{ getStatutLabel(c.statut) }}
                    </span>
                    <div *ngIf="c.rangListeAttente" class="mt-1 text-[10px] font-semibold text-[#F0791E]">
                      Rang #{{ c.rangListeAttente }}
                    </div>
                  </td>

                  <!-- Avis & Explications de la Direction -->
                  <td class="p-3.5 max-w-[200px]">
                    <div *ngIf="c.commentaireGestionnaire" class="text-[11px] text-[#1B1D1F] truncate" [title]="c.commentaireGestionnaire">
                      💬 <span class="font-medium italic">« {{ c.commentaireGestionnaire }} »</span>
                    </div>
                    <div *ngIf="c.motifRejet" class="text-[10px] text-[#ED1C24] font-semibold truncate" [title]="c.motifRejet">
                      ❌ {{ c.motifRejet }}
                    </div>
                    <div *ngIf="c.scoreEvaluation" class="text-[10px] text-[#276B44] font-bold">
                      Note : {{ c.scoreEvaluation }}/20
                    </div>
                    <div *ngIf="!c.commentaireGestionnaire && !c.motifRejet && !c.scoreEvaluation" class="text-[10px] text-[#4B5157] italic">
                      Non renseigné
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="p-3.5 text-right">
                    <div class="flex items-center justify-end gap-1.5 flex-wrap">
                      <button (click)="openDetailModal(c)" class="btn btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shadow-2xs cursor-pointer">
                        <span>👁️ Examiner & Décider</span>
                      </button>

                      <button *ngIf="c.statut === 'LISTE_ATTENTE'" (click)="promote(c)" [disabled]="busy === c.id"
                              class="btn btn-secondary text-[11px] py-1 px-2.5 text-[#276B44] border-[#276B44] font-bold hover:bg-[#E7F1EA] cursor-pointer">
                        Promouvoir
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ========================================================================================= -->
        <!-- ONGLET 2 : GESTION DES SESSIONS D'ADMISSION                                               -->
        <!-- ========================================================================================= -->
        <section *ngIf="activeTab === 'sessions'" class="space-y-6">
          <!-- Formulaire de création de session enrichi -->
          <div class="rounded-[2px] border border-[#D7DBDE] border-t-[4px] border-t-[#1C75BC] bg-white p-5 shadow-2xs">
            <h2 class="text-sm font-bold text-[#1B1D1F] mb-3 uppercase tracking-[0.05em]">Ouvrir une nouvelle session d'admission</h2>
            <form class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" (ngSubmit)="createSession()">
              <input class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                     name="libelle" [(ngModel)]="draft.libelle" placeholder="Libellé de la session (ex: Promo 2026-A)" required />

              <select *ngIf="isCentreAdmin" class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                      name="etablissementId" [(ngModel)]="draft.etablissementId" required>
                <option value="">Sélectionnez l'Établissement</option>
                <option *ngFor="let etab of etablissements" [value]="etab.id">{{ etab.nom }} ({{ etab.codeAntenne }})</option>
              </select>

              <select class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                      name="filiereId" [(ngModel)]="draft.filiereId" required>
                <option value="">Sélectionnez une Filière</option>
                <option *ngFor="let filiere of filieres" [value]="filiere.id">{{ filiere.libelle }}</option>
              </select>

              <select class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                      name="niveauId" [(ngModel)]="draft.niveauId" required>
                <option value="">Sélectionnez un Niveau</option>
                <option *ngFor="let niveau of niveaux" [value]="niveau.id">{{ niveau.libelle }}</option>
              </select>

              <input class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                     name="capacite" type="number" min="1" [(ngModel)]="draft.capacite" placeholder="Capacité (places)" required />

              <div class="flex flex-col">
                <label class="text-[11px] text-[#4B5157] font-semibold mb-0.5">Ouverture des inscriptions</label>
                <input class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                       name="dateOuverture" type="datetime-local" [(ngModel)]="draft.dateOuverture" required />
              </div>

              <div class="flex flex-col">
                <label class="text-[11px] text-[#4B5157] font-semibold mb-0.5">Clôture des inscriptions</label>
                <input class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                       name="dateFermeture" type="datetime-local" [(ngModel)]="draft.dateFermeture" required />
              </div>

              <div class="flex flex-col">
                <label class="text-[11px] text-[#4B5157] font-semibold mb-0.5">Démarrage de la formation</label>
                <input class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                       name="dateDebutFormation" type="datetime-local" [(ngModel)]="draft.dateDebutFormation" required />
              </div>

              <!-- Description de la session -->
              <div class="sm:col-span-2 lg:col-span-4">
                <label class="text-[11px] text-[#4B5157] font-semibold mb-0.5 block">Description de la session (visible par les apprenants)</label>
                <textarea name="description" [(ngModel)]="draft.description" rows="2"
                          class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white leading-relaxed"
                          placeholder="Décrivez cette session : objectifs, public cible, conditions, débouchés..."></textarea>
              </div>

              <!-- Pièces requises -->
              <div class="sm:col-span-2 lg:col-span-4">
                <label class="text-[11px] text-[#4B5157] font-semibold mb-1.5 block">Pièces justificatives requises :</label>
                <div class="flex flex-wrap gap-2">
                  <label *ngFor="let piece of PIECES_DISPONIBLES"
                         class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] border text-xs cursor-pointer transition-all select-none"
                         [class.border-[#1C75BC]]="isPieceSelected(piece.value)"
                         [class.bg-[#E7F1FA]]="isPieceSelected(piece.value)"
                         [class.text-[#124F80]]="isPieceSelected(piece.value)"
                         [class.font-semibold]="isPieceSelected(piece.value)"
                         [class.border-[#D7DBDE]]="!isPieceSelected(piece.value)"
                         [class.bg-white]="!isPieceSelected(piece.value)">
                    <input type="checkbox" [checked]="isPieceSelected(piece.value)" (change)="togglePiece(piece.value)" class="hidden" />
                    <span>{{ isPieceSelected(piece.value) ? '✅' : '⬜' }}</span>
                    <span>{{ piece.label }}</span>
                  </label>
                </div>
              </div>

              <div class="flex items-end sm:col-span-2 lg:col-span-4">
                <button class="btn btn-primary text-xs w-full h-[38px] shadow-2xs cursor-pointer" type="submit" [disabled]="creating">
                  {{ creating ? 'Création en cours...' : '+ Créer la session d\'admission' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Liste des sessions et dossiers de la session sélectionnée -->
          <div class="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <!-- Liste gauche des sessions -->
            <div>
              <div class="mb-3 flex items-center justify-between">
                <h2 class="text-base font-bold text-[#1B1D1F]">Sessions configurées</h2>
              </div>
              <!-- Filtre sessions -->
              <div class="mb-3">
                <input type="text" [(ngModel)]="sessionSearchFilter"
                       class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                       placeholder="🔍 Rechercher une session..." />
              </div>
              <div class="mb-2">
                <span class="text-xs text-[#4B5157] font-semibold">{{ filteredSessions.length }} session{{ filteredSessions.length === 1 ? '' : 's' }}</span>
              </div>

              <div *ngIf="filteredSessions.length === 0" class="border border-[#D7DBDE] bg-white p-8 text-center text-sm text-[#4B5157] shadow-2xs rounded-[2px]">
                <p class="font-medium">Aucune session d'admission trouvée.</p>
              </div>

              <div *ngIf="filteredSessions.length > 0" class="space-y-3">
                <button *ngFor="let session of filteredSessions" type="button" (click)="selectSession(session)"
                        class="block w-full rounded-[2px] border bg-white p-4 text-left transition hover:border-[#1C75BC] shadow-2xs cursor-pointer"
                        [class.border-[#1C75BC]]="selected?.id === session.id"
                        [class.border-l-[4px]]="selected?.id === session.id"
                        [class.border-l-[#F0791E]]="selected?.id === session.id"
                        [class.border-[#D7DBDE]]="selected?.id !== session.id">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <strong class="text-sm text-[#1B1D1F]">{{ session.libelle }}</strong>
                      <p class="mt-1 text-xs text-[#4B5157]">{{ session.filiere.libelle }} · {{ session.niveau.libelle }}</p>
                      <p class="mt-1 text-[11px] text-[#4B5157]">Établissement : {{ session.etablissement.nom }}</p>
                      <p class="mt-0.5 text-[11px] text-[#4B5157]">Capacité : {{ session.capacite }} places</p>
                      <p *ngIf="(session.etablissementsPartages?.length || 0) > 0" class="mt-1 text-[11px] font-semibold text-[#F0791E]">
                        📡 Partagée avec {{ session.etablissementsPartages?.length }} établissement(s)
                      </p>
                      <p *ngIf="session.description" class="mt-1 text-[11px] text-[#4B5157] line-clamp-1 italic">{{ session.description }}</p>
                    </div>
                    <span class="rounded-[2px] px-2.5 py-1 text-xs font-semibold border shrink-0"
                          [ngClass]="getSessionBadgeClass(session.statut)">
                      {{ getSessionStatutLabel(session.statut) }}
                    </span>
                  </div>
                  <div class="mt-3 flex gap-2 flex-wrap">
                    <button *ngIf="session.statut === 'BROUILLON'" type="button" class="btn btn-primary text-xs py-1.5 px-3 cursor-pointer"
                            [disabled]="busy === session.id" (click)="setStatus(session, 'OUVERTE', $event)">
                      🟢 Ouvrir au public
                    </button>
                    <button *ngIf="session.statut === 'OUVERTE'" type="button" class="btn btn-ghost text-xs py-1.5 px-3 text-[#ED1C24] border-[#ED1C24] hover:bg-[#FDE6E6] cursor-pointer"
                            [disabled]="busy === session.id" (click)="setStatus(session, 'FERMEE', $event)">
                      🔴 Fermer la session
                    </button>
                    <button *ngIf="session.statut === 'FERMEE'" type="button" class="btn btn-ghost text-xs py-1.5 px-3 text-[#F0791E] border-[#F0791E] hover:bg-[#FDECDD] cursor-pointer"
                            [disabled]="busy === session.id" (click)="setStatus(session, 'TRAITEMENT', $event)">
                      ⚙️ Passer en traitement
                    </button>
                    <button *ngIf="session.statut === 'TRAITEMENT'" type="button" class="btn btn-ghost text-xs py-1.5 px-3 text-[#276B44] border-[#276B44] hover:bg-[#E7F1EA] cursor-pointer"
                            [disabled]="busy === session.id" (click)="setStatus(session, 'CLOTUREE', $event)">
                      ✅ Clôturer définitivement
                    </button>
                    <button *ngIf="isCentreAdmin" type="button"
                            (click)="openPartageModal(session, $event)"
                            class="btn btn-secondary text-xs py-1.5 px-3 text-[#1C75BC] border-[#1C75BC] hover:bg-[#E7F1FA] cursor-pointer">
                      📡 Partager
                    </button>
                  </div>
                </button>
              </div>
            </div>

            <!-- Liste droite des candidatures de la session sélectionnée -->
            <div>
              <h2 class="mb-3 text-base font-bold text-[#1B1D1F]">Dossiers de la session sélectionnée</h2>

              <div *ngIf="!selected" class="border border-[#D7DBDE] bg-white p-8 text-center text-sm text-[#4B5157] shadow-2xs rounded-[2px]">
                <p class="font-medium">Sélectionnez une session dans la colonne de gauche pour traiter ses candidatures.</p>
              </div>

              <div *ngIf="selected" class="space-y-3">
                <div class="flex items-center justify-between text-xs text-[#4B5157] bg-white p-3 rounded-[2px] border border-[#D7DBDE]">
                  <span>{{ selected.libelle }} · <strong>{{ sessionCandidatures.length }}</strong> dossier(s)</span>
                  <button (click)="refreshSelected(true)" class="text-[#1C75BC] font-semibold hover:underline cursor-pointer" [disabled]="refreshing">
                    {{ refreshing ? 'Actualisation...' : '🔄 Actualiser' }}
                  </button>
                </div>

                <div *ngIf="sessionCandidatures.length === 0" class="border border-[#D7DBDE] bg-white p-8 text-center text-sm text-[#4B5157] shadow-2xs rounded-[2px]">
                  <p class="font-medium">Aucun dossier déposé sur cette session.</p>
                </div>

                <article *ngFor="let c of sessionCandidatures" class="rounded-[2px] border border-[#D7DBDE] bg-white p-4 shadow-2xs space-y-2">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-sm font-semibold text-[#1B1D1F]">
                      {{ c.apprenant?.prenom }} {{ c.apprenant?.nom }}
                    </span>
                    <span class="rounded-[2px] px-2 py-0.5 text-xs font-bold border"
                          [ngClass]="getStatutBadgeClass(c.statut)">
                      {{ getStatutLabel(c.statut) }}
                    </span>
                  </div>
                  <p class="text-xs text-[#4B5157] font-mono">✉ {{ c.apprenant?.email }}</p>
                  
                  <div *ngIf="c.commentaireGestionnaire" class="p-2.5 bg-[#E7F1FA] rounded-[2px] text-[11px] text-[#124F80] border border-[#1C75BC]/20">
                    💬 <strong>Avis de direction :</strong> {{ c.commentaireGestionnaire }}
                  </div>

                  <div class="mt-2 flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button (click)="openDetailModal(c)" class="btn btn-primary text-xs py-1.5 px-3 cursor-pointer">
                      Examiner le dossier complet
                    </button>
                  </div>
                </article>

                <!-- Jauge de capacité conforme charte -->
                <div *ngIf="stats" class="rounded-[2px] border border-[#D7DBDE] bg-white p-4 text-xs text-[#4B5157] shadow-2xs">
                  <strong class="text-[#1B1D1F]">Capacité : {{ stats.capacite }} places</strong> ·
                  <span class="text-[#276B44] font-bold">{{ stats.placesPrises }} prise(s)</span> ·
                  <span class="text-[#1C75BC] font-bold">{{ stats.placesRestantes }} restante(s)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ========================================================================================= -->
        <!-- ONGLET 3 : VUE CONSOLIDEE & STATISTIQUES                                                  -->
        <!-- ========================================================================================= -->
        <section *ngIf="activeTab === 'stats'" class="space-y-6">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-[2px] border border-[#D7DBDE] bg-white p-5 shadow-2xs">
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] text-[#4B5157]">Total Candidatures</div>
              <div class="mt-2 text-3xl font-bold text-[#124F80]">{{ allCandidatures.length }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1">Sur l'ensemble du réseau</div>
            </div>

            <div class="rounded-[2px] border border-[#D7DBDE] bg-white p-5 shadow-2xs">
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] text-[#276B44]">Admissions Confirmées</div>
              <div class="mt-2 text-3xl font-bold text-[#276B44]">{{ countByStatut('CONFIRMEE') + countByStatut('INSCRITE') }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1">Apprenants confirmés / inscrits</div>
            </div>

            <div class="rounded-[2px] border border-[#D7DBDE] bg-white p-5 shadow-2xs">
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] text-[#1C75BC]">En cours d'évaluation</div>
              <div class="mt-2 text-3xl font-bold text-[#1C75BC]">{{ countByStatut('SOUMISE') + countByStatut('EN_EVALUATION') }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1">Dossiers en instruction</div>
            </div>

            <div class="rounded-[2px] border border-[#D7DBDE] bg-white p-5 shadow-2xs">
              <div class="text-[11px] font-bold uppercase tracking-[0.05em] text-[#F0791E]">Liste d'Attente</div>
              <div class="mt-2 text-3xl font-bold text-[#F0791E]">{{ countByStatut('LISTE_ATTENTE') }}</div>
              <div class="text-[11px] text-[#4B5157] mt-1">Candidats en réserve</div>
            </div>
          </div>

          <div class="rounded-[2px] border border-[#D7DBDE] bg-white p-6 shadow-2xs">
            <h3 class="text-sm font-bold text-[#1B1D1F] uppercase tracking-[0.05em] mb-4">Répartition des dossiers par statut</h3>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div class="p-3 bg-[#F5F6F7] rounded-[2px] border border-[#D7DBDE]">
                <span class="text-[#4B5157] block font-semibold">Brouillons</span>
                <strong class="text-base text-[#1B1D1F]">{{ countByStatut('BROUILLON') }}</strong>
              </div>
              <div class="p-3 bg-[#E7F1FA] rounded-[2px] border border-[#1C75BC]/30">
                <span class="text-[#1C75BC] block font-semibold">Soumises</span>
                <strong class="text-base text-[#1C75BC]">{{ countByStatut('SOUMISE') }}</strong>
              </div>
              <div class="p-3 bg-[#E7F1FA] rounded-[2px] border border-[#124F80]/30">
                <span class="text-[#124F80] block font-semibold">En Évaluation</span>
                <strong class="text-base text-[#124F80]">{{ countByStatut('EN_EVALUATION') }}</strong>
              </div>
              <div class="p-3 bg-[#E7F1EA] rounded-[2px] border border-[#276B44]/30">
                <span class="text-[#276B44] block font-semibold">Admis (en attente)</span>
                <strong class="text-base text-[#276B44]">{{ countByStatut('ADMISE') }}</strong>
              </div>
              <div class="p-3 bg-[#E7F1EA] rounded-[2px] border border-[#276B44]">
                <span class="text-[#276B44] block font-semibold">Confirmées</span>
                <strong class="text-base text-[#276B44]">{{ countByStatut('CONFIRMEE') }}</strong>
              </div>
              <div class="p-3 bg-[#E7F1EA] rounded-[2px] border border-[#276B44]/50">
                <span class="text-[#276B44] block font-semibold">Inscrites (LMS)</span>
                <strong class="text-base text-[#276B44]">{{ countByStatut('INSCRITE') }}</strong>
              </div>
              <div class="p-3 bg-[#FDECDD] rounded-[2px] border border-[#F0791E]/30">
                <span class="text-[#F0791E] block font-semibold">Liste d'Attente</span>
                <strong class="text-base text-[#F0791E]">{{ countByStatut('LISTE_ATTENTE') }}</strong>
              </div>
              <div class="p-3 bg-[#FDE6E6] rounded-[2px] border border-[#ED1C24]/30">
                <span class="text-[#ED1C24] block font-semibold">Rejetées / Expirées</span>
                <strong class="text-base text-[#ED1C24]">{{ countByStatut('REJETEE') + countByStatut('EXPIREE') }}</strong>
              </div>
            </div>
          </div>
        </section>

        <!-- ========================================================================================= -->
        <!-- ONGLET 4 : DEMANDES D'ORIENTATION & DOLÉANCES DES USAGERS (LANDING PAGE)                  -->
        <!-- ========================================================================================= -->
        <section *ngIf="activeTab === 'orientations'" class="space-y-6 animate-fade-in-up">
          <div class="bg-white border border-[#D7DBDE] border-t-[5px] border-t-[#1C75BC] p-6 rounded-[2px] shadow-2xs">
            
            <!-- En-tête & Barre d'outils -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D7DBDE]">
              <div>
                <div class="text-[11px] uppercase font-bold tracking-[0.06em] text-[#1C75BC]">
                  Guichet d'Adhésion & Relations Publiques
                </div>
                <h3 class="text-xl font-bold text-[#1B1D1F] flex items-center gap-2 mt-0.5">
                  <span>📬</span>
                  <span>Demandes d'Orientation & Doléances Usagers</span>
                </h3>
                <p class="text-xs text-[#4B5157] mt-1">
                  Examinez les aspirations, objectifs et doléances des candidats déposés depuis le portail public pour les orienter et les enrôler.
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button type="button" (click)="loadOrientations()" class="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                  <span>🔄</span>
                  <span>Actualiser le flux</span>
                </button>
              </div>
            </div>

            <!-- Mini Cartes Statistiques & Recherche -->
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3.5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                <div class="text-[11px] font-bold text-[#4B5157] uppercase tracking-[0.05em]">Total des Demandes</div>
                <div class="text-xl font-bold text-[#124F80] mt-1">{{ orientations.length }}</div>
              </div>

              <div class="p-3.5 bg-[#E7F1FA] border border-[#1C75BC]/30 rounded-[2px]">
                <div class="text-[11px] font-bold text-[#1C75BC] uppercase tracking-[0.05em]">Filières Spécifiées</div>
                <div class="text-xl font-bold text-[#1C75BC] mt-1">{{ countOrientationsWithFiliere() }}</div>
              </div>

              <div class="p-3.5 bg-[#E7F1EA] border border-[#276B44]/30 rounded-[2px]">
                <div class="text-[11px] font-bold text-[#276B44] uppercase tracking-[0.05em]">Guichet Opérationnel</div>
                <div class="text-xs font-semibold text-[#276B44] mt-1.5 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[#276B44] animate-pulse"></span>
                  <span>Synchronisation temps réel</span>
                </div>
              </div>
            </div>

            <!-- Filtre de recherche -->
            <div class="mt-4">
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="orientationSearch"
                  placeholder="Rechercher par nom, prénom, numéro de téléphone, filière ou mot-clé..."
                  class="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC]"
                />
                <span class="absolute left-3 top-2.5 text-[#4B5157] text-xs">🔍</span>
              </div>
            </div>

            <!-- État vide -->
            <div *ngIf="filteredOrientations.length === 0" class="mt-4 p-8 text-center bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px] text-xs text-[#4B5157]">
              <div class="w-12 h-12 rounded-full bg-white text-[#1C75BC] flex items-center justify-center text-xl mx-auto mb-2 border border-[#D7DBDE]">
                📬
              </div>
              <p class="text-sm font-semibold text-[#1B1D1F]">
                {{ orientationSearch ? 'Aucune demande ne correspond à votre recherche.' : 'Aucune demande d\'orientation enregistrée pour le moment.' }}
              </p>
              <p class="mt-1">
                {{ orientationSearch ? 'Essayez avec un autre mot-clé ou réinitialisez la recherche.' : 'Dès qu\'un visiteur soumet le formulaire de la landing page, sa fiche apparaîtra instantanément.' }}
              </p>
            </div>

            <!-- Tableau exécutif -->
            <div *ngIf="filteredOrientations.length > 0" class="mt-4 overflow-x-auto border border-[#D7DBDE] rounded-[2px]">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F5F6F7] text-[11px] font-bold uppercase tracking-[0.05em] text-[#4B5157] border-b border-[#D7DBDE]">
                  <tr>
                    <th class="p-3.5">Date & Réf</th>
                    <th class="p-3.5">Candidat / Usager</th>
                    <th class="p-3.5">Coordonnées Téléphoniques</th>
                    <th class="p-3.5">Filière Ciblée</th>
                    <th class="p-3.5">Doléance / Objectifs</th>
                    <th class="p-3.5 text-right">Actions d'Instruction</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#D7DBDE] bg-white">
                  <tr *ngFor="let item of filteredOrientations" class="hover:bg-[#F5F6F7]/60 transition">
                    <td class="p-3.5 text-[#4B5157] font-mono whitespace-nowrap">
                      <div>{{ item.createdAt | date:'dd/MM/yyyy' }}</div>
                      <div class="text-[10px] text-[#9AA1A8] font-mono">{{ item.createdAt | date:'HH:mm' }}</div>
                    </td>
                    <td class="p-3.5 whitespace-nowrap">
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-full bg-[#124F80] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs">
                          {{ getInitials(item.nom) }}
                        </div>
                        <span class="font-bold text-[#1B1D1F]">{{ item.nom }}</span>
                      </div>
                    </td>
                    <td class="p-3.5 whitespace-nowrap">
                      <div class="inline-flex items-center gap-1.5 bg-[#F5F6F7] px-2.5 py-1 rounded-[2px] border border-[#D7DBDE]">
                        <span class="font-mono font-semibold text-[#1B1D1F]">{{ item.telephone }}</span>
                        <button type="button" (click)="copierTexte(item.telephone, 'Numéro de téléphone copié')"
                                class="text-[#1C75BC] hover:text-[#124F80] text-[11px] p-0.5 cursor-pointer" title="Copier le numéro">
                          📋
                        </button>
                      </div>
                    </td>
                    <td class="p-3.5">
                      <span *ngIf="item.filiere" class="inline-flex items-center gap-1 rounded-[2px] px-2 py-0.5 text-[11px] font-semibold bg-[#E7F1FA] text-[#124F80] border border-[#1C75BC]/30">
                        <span>🎓</span>
                        <span>{{ item.filiere }}</span>
                      </span>
                      <span *ngIf="!item.filiere" class="text-[#71787E] italic text-[11px]">
                        Orientation générale
                      </span>
                    </td>
                    <td class="p-3.5 max-w-xs">
                      <p class="text-xs text-[#4B5157] leading-relaxed line-clamp-2" [title]="item.message">
                        {{ item.message || 'Aucune précision complémentaire.' }}
                      </p>
                    </td>
                    <td class="p-3.5 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        <button type="button" (click)="openOrientationModal(item)"
                                class="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 shadow-2xs cursor-pointer">
                          <span>🔍 Examiner</span>
                        </button>
                        <button type="button" (click)="enrolerDepuisOrientation(item)"
                                class="btn btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1 shadow-2xs font-semibold cursor-pointer">
                          <span>👤 Enrôler</span>
                        </button>
                        <button type="button" (click)="deleteOrientation(item.id)"
                                class="btn btn-ghost text-[11px] py-1 px-2 text-[#ED1C24] border-[#ED1C24] hover:bg-[#FDE6E6] cursor-pointer"
                                title="Archiver / Supprimer">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- ========================================================================================= -->
        <!-- MODAL COMPLET : EXAMEN DU DOSSIER, PIECES & DECISION AVEC EXPLICATIONS                    -->
        <!-- ========================================================================================= -->
        <div *ngIf="modalCandidature" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1D1F]/60 p-4 backdrop-blur-xs animate-fade-in">
          <div class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2px] bg-white p-6 shadow-2xl border border-[#D7DBDE] border-t-[5px] border-t-[#124F80] flex flex-col justify-between">
            <div>
              <!-- Header Modal -->
              <div class="flex items-start justify-between border-b border-[#D7DBDE] pb-4">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-lg font-bold text-[#1B1D1F]">
                      Dossier d'admission : {{ modalCandidature.apprenant?.prenom }} {{ modalCandidature.apprenant?.nom }}
                    </span>
                    <span class="rounded-[2px] px-2.5 py-0.5 text-xs font-bold border"
                          [ngClass]="getStatutBadgeClass(modalCandidature.statut)">
                      {{ modalCandidature.statut }}
                    </span>
                  </div>
                  <p class="text-xs text-[#4B5157] mt-1 font-mono">
                    ✉ {{ modalCandidature.apprenant?.email }} · 📞 {{ modalCandidature.apprenant?.telephone || 'Non renseigné' }}
                  </p>
                </div>
                <button (click)="closeModal()" class="text-[#4B5157] hover:text-[#1B1D1F] text-xl font-bold p-1 cursor-pointer">✕</button>
              </div>

              <!-- Body Modal -->
              <div class="mt-4 space-y-5 text-xs">
                <!-- 1. Informations Session & Formation -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-[#F5F6F7] rounded-[2px] border border-[#D7DBDE]">
                  <div>
                    <span class="font-bold text-[#1B1D1F] block text-xs mb-1 uppercase tracking-[0.05em]">Session & Programme ciblé</span>
                    <div class="font-bold text-[#1C75BC] text-sm">{{ modalCandidature.session.libelle }}</div>
                    <div class="text-[#4B5157] mt-0.5">
                      Filière : {{ modalCandidature.session.filiere.libelle }} · Niveau : {{ modalCandidature.session.niveau.libelle }}
                    </div>
                  </div>
                  <div>
                    <span class="font-bold text-[#1B1D1F] block text-xs mb-1 uppercase tracking-[0.05em]">Établissement & Dates</span>
                    <div class="text-[#1B1D1F] font-semibold">{{ modalCandidature.session.etablissement.nom }} ({{ modalCandidature.session.etablissement.codeAntenne }})</div>
                    <div class="text-[#4B5157] mt-0.5">
                      Date de soumission : {{ (modalCandidature.dateSoumission || modalCandidature.createdAt) | date:'dd/MM/yyyy à HH:mm' }}
                    </div>
                  </div>
                </div>

                <!-- 2. Pièces justificatives et documents -->
                <div class="p-4 bg-white rounded-[2px] border border-[#D7DBDE] shadow-2xs">
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-bold text-[#1B1D1F] text-xs flex items-center gap-1.5 uppercase tracking-[0.05em]">
                      📁 Documents & Pièces Justificatives ({{ modalCandidature.pieces?.length || 0 }})
                    </span>
                    <span class="text-[11px] font-semibold text-[#1C75BC]">
                      Contrôle de conformité
                    </span>
                  </div>

                  <div *ngIf="!modalCandidature.pieces || modalCandidature.pieces.length === 0" class="text-[#4B5157] italic p-3 bg-[#F5F6F7] rounded-[2px] text-center border border-[#D7DBDE]">
                    Aucune pièce justificative n'a encore été déposée dans ce dossier.
                  </div>

                  <div *ngIf="modalCandidature.pieces && modalCandidature.pieces.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div *ngFor="let piece of modalCandidature.pieces" class="p-3 rounded-[2px] bg-[#F5F6F7] border border-[#D7DBDE] flex flex-col justify-between">
                      <div class="flex items-start gap-2">
                        <span class="text-base">📄</span>
                        <div class="overflow-hidden">
                          <div class="font-bold text-[#1B1D1F] truncate text-xs" [title]="piece.nomFichier">{{ piece.nomFichier }}</div>
                          <span class="inline-block mt-0.5 rounded-[2px] bg-[#E7F1FA] px-1.5 py-0.2 text-[10px] font-semibold text-[#1C75BC] border border-[#1C75BC]/30">
                            {{ formatPieceType(piece.type) }}
                          </span>
                        </div>
                      </div>
                      
                      <div class="mt-3 flex items-center gap-2 pt-2 border-t border-[#D7DBDE]">
                        <button type="button" *ngIf="piece.fileUrl" (click)="viewPiece(piece)"
                                class="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 cursor-pointer">
                          <span>👁️ Visualiser</span>
                        </button>
                        <button type="button" *ngIf="piece.fileUrl" (click)="downloadPiece(piece)"
                                [disabled]="downloadingPieceId === (piece.id || piece.nomFichier)"
                                class="btn btn-ghost text-[11px] py-1 px-2.5 flex items-center gap-1 cursor-pointer bg-white">
                          <span>{{ downloadingPieceId === (piece.id || piece.nomFichier) ? '⏳ Téléchargement...' : '⬇️ Télécharger' }}</span>
                        </button>
                        <span *ngIf="!piece.fileUrl" class="text-[10px] text-[#4B5157] italic">Fichier non disponible</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3. Formulaire d'Évaluation & Prise de Décision avec Explications -->
                <div class="p-4 bg-[#E7F1FA] rounded-[2px] border border-[#1C75BC]/40 shadow-2xs">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="text-lg">⚖️</span>
                    <div>
                      <h4 class="font-bold text-[#124F80] text-sm uppercase tracking-[0.05em]">Évaluation Officielle & Décision des Dirigeants</h4>
                      <p class="text-[11px] text-[#4B5157]">L'apprenant aura un accès direct aux explications et commentaires motivant la décision.</p>
                    </div>
                  </div>

                  <!-- Alerte contextuelle selon le statut actuel -->
                  <div *ngIf="modalCandidature.statut === 'BROUILLON'"
                       class="mb-3 p-3 rounded-[2px] bg-[#FFF3E0] border border-[#F0791E]/50 text-xs text-[#7D3900] flex items-start gap-2">
                    <span class="text-base shrink-0">⚠️</span>
                    <div>
                      <strong>Dossier non encore soumis officiellement</strong> — l'apprenant est encore en phase de constitution.
                      Vous pouvez tout de même ouvrir l’évaluation directement si les pièces sont en ordre.
                    </div>
                  </div>
                  <div *ngIf="modalCandidature.statut === 'SOUMISE'"
                       class="mb-3 p-3 rounded-[2px] bg-[#E7F1EA] border border-[#276B44]/50 text-xs text-[#276B44] flex items-start gap-2">
                    <span class="text-base shrink-0">✅</span>
                    <div>
                      <strong>Dossier soumis officiellement</strong> — l’apprenant attend votre décision.
                      Choisissez « En cours d’examen » pour débuter l’évaluation, ou rendez directement une décision finale.
                    </div>
                  </div>
                  <div *ngIf="modalCandidature.statut === 'EN_EVALUATION'"
                       class="mb-3 p-3 rounded-[2px] bg-[#E7F1FA] border border-[#1C75BC]/50 text-xs text-[#124F80] flex items-start gap-2">
                    <span class="text-base shrink-0">🔍</span>
                    <div>
                      <strong>Dossier en cours d’évaluation</strong> — rendez votre décision finale : admission, liste d’attente ou rejet.
                    </div>
                  </div>

                  <div class="space-y-3">
                    <!-- Choix de la décision -->
                    <div>
                      <label class="font-bold text-[#1B1D1F] block mb-1.5">Décision officielle :</label>
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <label class="flex items-center gap-2 p-2 rounded-[2px] border bg-white cursor-pointer transition hover:border-[#276B44]"
                               [class.border-[#276B44]]="decisionForm.decision === 'ADMIS'"
                               [class.bg-[#E7F1EA]]="decisionForm.decision === 'ADMIS'">
                          <input type="radio" name="decision" value="ADMIS" [(ngModel)]="decisionForm.decision" class="accent-[#276B44]" />
                          <span class="font-bold text-[#276B44] text-xs">🟢 Admettre</span>
                        </label>

                        <label class="flex items-center gap-2 p-2 rounded-[2px] border bg-white cursor-pointer transition hover:border-[#F0791E]"
                               [class.border-[#F0791E]]="decisionForm.decision === 'LISTE_ATTENTE'"
                               [class.bg-[#FDECDD]]="decisionForm.decision === 'LISTE_ATTENTE'">
                          <input type="radio" name="decision" value="LISTE_ATTENTE" [(ngModel)]="decisionForm.decision" class="accent-[#F0791E]" />
                          <span class="font-bold text-[#F0791E] text-xs">🟣 Liste d'attente</span>
                        </label>

                        <label class="flex items-center gap-2 p-2 rounded-[2px] border bg-white cursor-pointer transition hover:border-[#ED1C24]"
                               [class.border-[#ED1C24]]="decisionForm.decision === 'REJETE'"
                               [class.bg-[#FDE6E6]]="decisionForm.decision === 'REJETE'">
                          <input type="radio" name="decision" value="REJETE" [(ngModel)]="decisionForm.decision" class="accent-[#ED1C24]" />
                          <span class="font-bold text-[#ED1C24] text-xs">🔴 Rejeter</span>
                        </label>

                        <label class="flex items-center gap-2 p-2 rounded-[2px] border bg-white cursor-pointer transition hover:border-[#1C75BC]"
                               [class.border-[#1C75BC]]="decisionForm.decision === 'EN_EVALUATION'"
                               [class.bg-[#E7F1FA]]="decisionForm.decision === 'EN_EVALUATION'"
                               [class.opacity-40]="modalCandidature.statut === 'EN_EVALUATION'"
                               [class.pointer-events-none]="modalCandidature.statut === 'EN_EVALUATION'">
                          <input type="radio" name="decision" value="EN_EVALUATION" [(ngModel)]="decisionForm.decision" class="accent-[#1C75BC]"
                                 [disabled]="modalCandidature.statut === 'EN_EVALUATION'" />
                          <span class="font-bold text-[#1C75BC] text-xs">🔵 Ouvrir l'examen</span>
                        </label>
                      </div>
                    </div>

                    <!-- Note d'évaluation optionnelle / recommandée -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label class="font-bold text-[#1B1D1F] block mb-1">Score d'évaluation (sur 20) :</label>
                        <input type="number" min="0" max="20" step="0.5" class="w-full px-3 py-2 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white font-semibold"
                               [(ngModel)]="decisionForm.scoreEvaluation" placeholder="Ex : 16.5" />
                      </div>

                      <div *ngIf="decisionForm.decision === 'REJETE'" class="sm:col-span-2">
                        <label class="font-bold text-[#ED1C24] block mb-1">Motif précis du rejet <span class="text-[#ED1C24]">*</span> :</label>
                        <input type="text" class="w-full px-3 py-2 text-xs border border-[#ED1C24] rounded-[2px] focus:outline-hidden bg-white text-[#ED1C24] font-medium"
                               [(ngModel)]="decisionForm.motifRejet" placeholder="Ex : Prérequis académiques insuffisants / Dossier incomplet" required />
                      </div>
                    </div>

                    <!-- Explications officielles & Commentaires de la direction -->
                    <div>
                      <label class="font-bold text-[#124F80] flex items-center justify-between mb-1">
                        <span>💬 Explications et avis officiel de la direction (Transmis à l'apprenant) :</span>
                        <span class="text-[10px] text-[#4B5157] font-normal">Droit aux explications garanti</span>
                      </label>
                      <textarea rows="3" class="w-full p-2.5 text-xs border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white leading-relaxed font-medium"
                                [(ngModel)]="decisionForm.commentaireGestionnaire"
                                placeholder="Indiquez ici les explications, conseils pédagogiques ou motivations de la décision. L'apprenant pourra consulter ces explications directement dans son espace personnel."></textarea>
                    </div>
                  </div>
                </div>

                <!-- 4. Historique des transitions -->
                <div *ngIf="modalCandidature.historique && modalCandidature.historique.length > 0">
                  <span class="font-bold text-[#1B1D1F] block mb-2 uppercase tracking-[0.05em]">Historique & Traçabilité chronologique</span>
                  <div class="space-y-1 max-h-32 overflow-y-auto bg-[#F5F6F7] p-2.5 rounded-[2px] border border-[#D7DBDE]">
                    <div *ngFor="let h of modalCandidature.historique" class="text-[11px] text-[#1B1D1F] flex justify-between py-1 border-b border-[#D7DBDE] last:border-b-0">
                      <span>{{ h.commentaire || (h.statutAvant + ' → ' + h.statutApres) }}</span>
                      <span class="text-[#4B5157] shrink-0 ml-2 font-mono">{{ h.timestamp | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions du modal -->
            <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#D7DBDE] pt-4">
              <button (click)="closeModal()" class="btn btn-secondary text-xs py-2 px-4 cursor-pointer">
                Fermer sans modifier
              </button>

              <button (click)="submitDecision()" [disabled]="busy === modalCandidature.id"
                      class="btn btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5 shadow-xs cursor-pointer">
                <span>{{ busy === modalCandidature.id ? 'Enregistrement...' : '✅ Enregistrer la décision & Transmettre les explications' }}</span>
              </button>
            </div>
          </div>
        </div>
        <!-- ========================================================================================= -->
        <!-- MODAL D'ENRÔLEMENT D'UN NOUVEL APPRENANT (ACCÈS RÉSERVÉ ADMINISTRATION)                    -->
        <!-- ========================================================================================= -->
        <div *ngIf="showEnrolementModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1D1F]/60 p-4 backdrop-blur-xs animate-fade-in">
          <div class="w-full max-w-lg rounded-[2px] bg-white p-6 shadow-2xl border border-[#D7DBDE] border-t-[5px] border-t-[#124F80]">
            <div class="flex items-start justify-between border-b border-[#D7DBDE] pb-3">
              <div>
                <h3 class="text-base font-bold text-[#1B1D1F] flex items-center gap-2">
                  <span>👤</span>
                  <span>Enrôlement d'un Nouvel Apprenant</span>
                </h3>
                <p class="text-xs text-[#4B5157] mt-0.5">
                  Création officielle du compte apprenant et rattachement à son établissement.
                </p>
              </div>
              <button (click)="closeEnrolementModal()" class="text-[#4B5157] hover:text-[#1B1D1F] text-lg font-bold p-1 cursor-pointer">✕</button>
            </div>

            <form (ngSubmit)="submitEnrolement()" class="mt-4 space-y-3.5 text-xs">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="font-bold text-[#1B1D1F] block mb-1">Nom <span class="text-[#ED1C24]">*</span></label>
                  <input class="w-full px-3 py-2 border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                         name="enrolNom" [(ngModel)]="enrolDraft.nom" required placeholder="Ex : MBUYI" />
                </div>
                <div>
                  <label class="font-bold text-[#1B1D1F] block mb-1">Prénom <span class="text-[#ED1C24]">*</span></label>
                  <input class="w-full px-3 py-2 border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                         name="enrolPrenom" [(ngModel)]="enrolDraft.prenom" required placeholder="Ex : Jean-Paul" />
                </div>
              </div>

              <div>
                <label class="font-bold text-[#1B1D1F] block mb-1">Adresse Email <span class="text-[#ED1C24]">*</span></label>
                <input type="email" class="w-full px-3 py-2 border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                       name="enrolEmail" [(ngModel)]="enrolDraft.email" required placeholder="apprenant@vitalis.cd" />
              </div>

              <div>
                <label class="font-bold text-[#1B1D1F] block mb-1">Mot de passe initial <span class="text-[#ED1C24]">*</span></label>
                <input type="password" class="w-full px-3 py-2 border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                       name="enrolPassword" [(ngModel)]="enrolDraft.password" required minlength="8" placeholder="Minimum 8 caractères (ex : Vitalis@2026)" />
                <span class="text-[10px] text-[#4B5157] mt-0.5 block">L'apprenant pourra modifier son mot de passe dès sa première connexion.</span>
              </div>

              <div *ngIf="isCentreAdmin">
                <label class="font-bold text-[#1B1D1F] block mb-1">Établissement de rattachement <span class="text-[#ED1C24]">*</span></label>
                <select class="w-full px-3 py-2 border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC] bg-white"
                        name="enrolEtablissement" [(ngModel)]="enrolDraft.etablissementId" required>
                  <option value="">Sélectionnez l'établissement</option>
                  <option *ngFor="let etab of etablissements" [value]="etab.id">{{ etab.nom }} ({{ etab.codeAntenne }})</option>
                </select>
              </div>

              <div class="mt-5 flex items-center justify-end gap-2.5 border-t border-[#D7DBDE] pt-3">
                <button type="button" (click)="closeEnrolementModal()" class="btn btn-secondary text-xs py-2 px-4 cursor-pointer">
                  Annuler
                </button>
                <button type="submit" [disabled]="enroling" class="btn btn-primary text-xs py-2 px-5 font-bold cursor-pointer shadow-xs">
                  {{ enroling ? 'Enrôlement en cours...' : 'Créer le compte & Enrôler' }}
                </button>
              </div>
            </form>
          </div>
        </div>
        <!-- ========================================================================================= -->
        <!-- MODAL DÉTAILS : FICHE D'INSTRUCTION DE LA DEMANDE D'ORIENTATION / DOLÉANCE                -->
        <!-- ========================================================================================= -->
        <div *ngIf="selectedOrientation" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1D1F]/60 p-4 backdrop-blur-xs animate-fade-in">
          <div class="w-full max-w-2xl rounded-[2px] bg-white p-6 shadow-2xl border border-[#D7DBDE] border-t-[5px] border-t-[#1C75BC]">
            
            <div class="flex items-start justify-between border-b border-[#D7DBDE] pb-3.5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#124F80] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {{ getInitials(selectedOrientation.nom) }}
                </div>
                <div>
                  <h3 class="text-base font-bold text-[#1B1D1F]">
                    Fiche Candidat : {{ selectedOrientation.nom }}
                  </h3>
                  <p class="text-xs text-[#4B5157] mt-0.5">
                    Demande déposée le {{ selectedOrientation.createdAt | date:'dd MMMM yyyy à HH:mm' }}
                  </p>
                </div>
              </div>
              <button (click)="closeOrientationModal()" class="text-[#4B5157] hover:text-[#1B1D1F] text-xl font-bold p-1 cursor-pointer">✕</button>
            </div>

            <div class="mt-4 space-y-4 text-xs">
              <!-- Grille coordonnées -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                  <span class="text-[11px] font-bold text-[#4B5157] uppercase tracking-[0.05em] block mb-1">
                    Numéro de Téléphone
                  </span>
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-sm font-bold text-[#1B1D1F]">{{ selectedOrientation.telephone }}</span>
                    <button type="button" (click)="copierTexte(selectedOrientation.telephone, 'Numéro copié')" class="btn btn-secondary text-[11px] py-1 px-2 cursor-pointer">
                      📋 Copier
                    </button>
                  </div>
                </div>

                <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                  <span class="text-[11px] font-bold text-[#4B5157] uppercase tracking-[0.05em] block mb-1">
                    Filière ou Métier Ciblé
                  </span>
                  <div class="font-bold text-[#124F80] text-xs mt-1">
                    {{ selectedOrientation.filiere || 'Orientation générale / Non précisée' }}
                  </div>
                </div>
              </div>

              <!-- Bloc Doléance / Message complet -->
              <div class="p-4 bg-[#E7F1FA] border border-[#1C75BC]/30 rounded-[2px]">
                <span class="text-[11px] font-bold text-[#124F80] uppercase tracking-[0.05em] block mb-1.5 flex items-center gap-1.5">
                  <span>💬</span>
                  <span>Expression des Besoins, Motivations & Doléances</span>
                </span>
                <p class="text-xs text-[#1B1D1F] leading-relaxed whitespace-pre-wrap font-medium">
                  {{ selectedOrientation.message || 'Aucun message textuel fourni lors de la soumission.' }}
                </p>
              </div>

              <!-- Conseils d'instruction -->
              <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px] text-[11px] text-[#4B5157] leading-relaxed">
                <strong class="text-[#1B1D1F] block mb-0.5">Procédure recommandée :</strong>
                Vous pouvez créer directement le compte officiel de cet usager en cliquant sur « Enrôler comme Apprenant ». Ses informations seront automatiquement transférées dans le formulaire d'enrôlement officiel.
              </div>
            </div>

            <!-- Boutons d'action du modal -->
            <div class="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#D7DBDE] pt-3.5">
              <div class="flex items-center gap-2">
                <button type="button" (click)="deleteOrientation(selectedOrientation.id); closeOrientationModal()" class="btn btn-ghost text-xs py-2 px-3 text-[#ED1C24] border-[#ED1C24] hover:bg-[#FDE6E6] cursor-pointer">
                  🗑️ Archiver la demande
                </button>
              </div>

              <div class="flex items-center gap-2">
                <button type="button" (click)="closeOrientationModal()" class="btn btn-secondary text-xs py-2 px-4 cursor-pointer">
                  Fermer
                </button>
                <button type="button" (click)="enrolerDepuisOrientation(selectedOrientation); closeOrientationModal()" class="btn btn-primary text-xs py-2 px-5 font-bold cursor-pointer shadow-xs flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Enrôler comme Apprenant</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================================= -->
      <!-- MODAL PARTAGE SESSION (Admin Central uniquement)                                          -->
      <!-- ========================================================================================= -->
      <div *ngIf="partageModal.session" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1D1F]/60 p-4 backdrop-blur-xs animate-fade-in">
        <div class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[2px] bg-white p-6 shadow-2xl border border-[#D7DBDE] border-t-[5px] border-t-[#F0791E]">
          <div class="flex items-start justify-between border-b border-[#D7DBDE] pb-4 mb-4">
            <div>
              <h3 class="text-base font-bold text-[#1B1D1F]">📡 Partager la session avec des établissements</h3>
              <p class="text-xs text-[#4B5157] mt-1">{{ partageModal.session.libelle }}</p>
              <p class="text-[11px] text-[#4B5157] mt-0.5">Établissement propriétaire : {{ partageModal.session.etablissement.nom }}</p>
            </div>
            <button (click)="closePartageModal()" class="text-[#4B5157] hover:text-[#1B1D1F] text-xl font-bold p-1 cursor-pointer">✕</button>
          </div>

          <p class="text-xs text-[#4B5157] mb-3">
            Sélectionnez les établissements satellites qui pourront voir cette session et recevoir les candidatures de leurs apprenants.
          </p>

          <div class="space-y-2 max-h-64 overflow-y-auto border border-[#D7DBDE] rounded-[2px] p-2">
            <label *ngFor="let etab of etablissements"
                   class="flex items-center gap-3 p-2.5 rounded-[2px] border cursor-pointer transition-all"
                   [class.border-[#1C75BC]]="isEtabPartage(etab.id)"
                   [class.bg-[#E7F1FA]]="isEtabPartage(etab.id)"
                   [class.border-[#D7DBDE]]="!isEtabPartage(etab.id)">
              <input type="checkbox" [checked]="isEtabPartage(etab.id)" (change)="toggleEtabPartage(etab.id)" class="w-4 h-4 accent-[#1C75BC]" />
              <div class="min-w-0 flex-1">
                <div class="text-xs font-semibold text-[#1B1D1F]">{{ etab.nom }}</div>
                <div class="text-[11px] text-[#4B5157]">{{ etab.codeAntenne }}</div>
              </div>
              <span *ngIf="etab.id === partageModal.session.etablissement.id"
                    class="text-[10px] text-[#276B44] font-bold bg-[#E7F1EA] px-1.5 py-0.5 rounded-[2px] border border-[#276B44]/30">
                Propriétaire
              </span>
            </label>
          </div>

          <div class="mt-4 flex justify-between items-center">
            <span class="text-xs text-[#4B5157]">{{ partageModal.selectedIds.length }} établissement(s) sélectionné(s)</span>
            <div class="flex gap-2">
              <button type="button" (click)="closePartageModal()" class="btn btn-secondary text-xs py-2 px-4 cursor-pointer">Annuler</button>
              <button type="button" (click)="submitPartage()" [disabled]="partageSaving"
                      class="btn btn-primary text-xs py-2 px-5 font-bold cursor-pointer">
                {{ partageSaving ? 'Sauvegarde...' : '📡 Appliquer le partage' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </app-main-layout>
  `,
})
export class AdmissionAdminComponent implements OnInit, OnDestroy {
  activeTab: 'candidatures' | 'sessions' | 'stats' | 'orientations' = 'candidatures';
  allCandidatures: Candidature[] = [];
  filteredCandidatures: Candidature[] = [];
  sessionCandidatures: Candidature[] = [];
  sessions: SessionAdmission[] = [];
  orientations: ContactMessageItem[] = [];
  selectedOrientation: ContactMessageItem | null = null;
  orientationSearch: string = '';
  etablissements: any[] = [];
  filieres: AdmissionReference[] = [];

  sessionSearchFilter = '';
  partageSaving = false;
  partageModal: { session: SessionAdmission | null; selectedIds: string[] } = { session: null, selectedIds: [] };

  readonly PIECES_DISPONIBLES = [
    { value: 'PIECE_IDENTITE', label: 'Pièce d\'identité' },
    { value: 'DIPLOME', label: 'Diplôme / Attestation' },
    { value: 'RELEVE_NOTES', label: 'Relevé de notes' },
    { value: 'PHOTO', label: 'Photo d\'identité' },
    { value: 'CV', label: 'Curriculum Vitae' },
    { value: 'LETTRE_MOTIVATION', label: 'Lettre de motivation' },
  ];

  get filteredSessions(): SessionAdmission[] {
    if (!this.sessionSearchFilter?.trim()) return this.sessions;
    const q = this.sessionSearchFilter.toLowerCase().trim();
    return this.sessions.filter((s) =>
      s.libelle?.toLowerCase().includes(q) ||
      s.filiere?.libelle?.toLowerCase().includes(q) ||
      s.niveau?.libelle?.toLowerCase().includes(q) ||
      s.etablissement?.nom?.toLowerCase().includes(q)
    );
  }

  isPieceSelected(value: string): boolean {
    return (this.draft.piecesRequises || []).includes(value);
  }

  togglePiece(value: string): void {
    const current = this.draft.piecesRequises || [];
    if (current.includes(value)) {
      this.draft.piecesRequises = current.filter((v) => v !== value);
    } else {
      this.draft.piecesRequises = [...current, value];
    }
  }

  openPartageModal(session: SessionAdmission, event?: Event): void {
    if (event) event.stopPropagation();
    this.partageModal = {
      session,
      selectedIds: [...(session.etablissementsPartages || [])],
    };
  }

  closePartageModal(): void {
    this.partageModal = { session: null, selectedIds: [] };
  }

  isEtabPartage(etabId: string): boolean {
    return this.partageModal.selectedIds.includes(etabId);
  }

  toggleEtabPartage(etabId: string): void {
    if (!this.partageModal.session) return;
    if (etabId === this.partageModal.session.etablissement?.id) return; // ne pas retirer le propriétaire
    if (this.isEtabPartage(etabId)) {
      this.partageModal.selectedIds = this.partageModal.selectedIds.filter((id) => id !== etabId);
    } else {
      this.partageModal.selectedIds = [...this.partageModal.selectedIds, etabId];
    }
  }

  submitPartage(): void {
    if (!this.partageModal.session) return;
    this.partageSaving = true;
    const ids = this.partageModal.selectedIds.filter((id) => id !== this.partageModal.session?.etablissement?.id);
    this.admission.partagerSession(this.partageModal.session.id, ids).subscribe({
      next: (updated) => {
        this.sessions = this.sessions.map((s) => s.id === updated.id ? { ...s, ...updated } : s);
        if (this.selected?.id === updated.id) this.selected = { ...this.selected, ...updated };
        this.toast.success(`Session partagée avec ${ids.length} établissement(s).`);
        this.partageSaving = false;
        this.closePartageModal();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Impossible de mettre à jour le partage.');
        this.partageSaving = false;
      },
    });
  }

  getStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      BROUILLON: '📝 Brouillon',
      SOUMISE: '📤 Soumis — En attente',
      EN_EVALUATION: '🔍 En évaluation',
      ADMISE: '🎉 Admis(e) — Confirmation requise',
      LISTE_ATTENTE: '⏳ Liste d\'attente',
      CONFIRMEE: '✅ Confirmé(e)',
      INSCRITE: '🎓 Inscrit(e)',
      REJETEE: '❌ Non retenu(e)',
      EXPIREE: '⌛ Expiré(e)',
      RETIREE: '🚫 Retiré(e)',
    };
    return labels[statut] || statut;
  }

  getSessionStatutLabel(statut: string): string {
    const labels: Record<string, string> = {
      BROUILLON: 'Brouillon',
      OUVERTE: '🟢 Ouverte',
      FERMEE: '🔴 Fermée',
      TRAITEMENT: '⚙️ En traitement',
      CLOTUREE: '✅ Clôturée',
      ARCHIVEE: '📂 Archivée',
    };
    return labels[statut] || statut;
  }
  niveaux: AdmissionReference[] = [];
  selected: SessionAdmission | null = null;
  stats: SessionStats | null = null;
  modalCandidature: Candidature | null = null;

  decisionForm = {
    decision: 'ADMIS' as 'ADMIS' | 'LISTE_ATTENTE' | 'REJETE' | 'EN_EVALUATION',
    scoreEvaluation: null as number | null,
    motifRejet: '',
    commentaireGestionnaire: '',
  };

  showEnrolementModal = false;
  enroling = false;
  enrolDraft = { nom: '', prenom: '', email: '', password: '', etablissementId: '' };

  searchFilter = '';
  statusFilter = '';
  sessionFilter = '';

  error = '';
  busy = '';
  creating = false;
  refreshing = false;
  isCentreAdmin = false;
  downloadingPieceId: string | null = null;

  draft = { libelle: '', etablissementId: '', filiereId: '', niveauId: '', capacite: 30, dateOuverture: '', dateFermeture: '', dateDebutFormation: '', description: '', piecesRequises: [] as string[] };
  private sub: Subscription | null = null;

  constructor(
    private admission: AdmissionService,
    private auth: AuthService,
    private etablissementsService: EtablissementsService,
    private landingService: LandingService,
    private notifications: NotificationsService,
    private toast: ToastService,
  ) {
    this.isCentreAdmin = this.auth.hasRole('ADMIN_CENTRE');

    // Invalider le cache des candidatures qui peut contenir d'anciennes données sans filiere/niveau
    localStorage.removeItem('vc_admission_all_candidatures');
    const cachedCandidatures = this.admission.getAllCandidaturesSnapshot();
    if (cachedCandidatures) {
      // Ne garder que les candidatures avec session complète (filiere + niveau)
      const valid = cachedCandidatures.filter(
        (c) => c.session && c.session.filiere && c.session.niveau
      );
      this.allCandidatures = valid;
      this.filteredCandidatures = valid;
    }

    const cachedSessions = this.admission.getSessionsGestionSnapshot();
    if (cachedSessions && cachedSessions.length > 0) {
      this.sessions = cachedSessions;
      this.selected = this.sessions[0];
    }

    const cachedFilieres = this.admission.getFilieresSnapshot();
    if (cachedFilieres) this.filieres = cachedFilieres;

    const cachedNiveaux = this.admission.getNiveauxSnapshot();
    if (cachedNiveaux) this.niveaux = cachedNiveaux;
  }

  ngOnInit(): void {
    this.loadAllCandidatures();
    this.loadSessions();
    this.loadOrientations();
    this.admission.getFilieres().subscribe({ next: (items) => { this.filieres = items || []; } });
    this.admission.getNiveaux().subscribe({ next: (items) => { this.niveaux = items || []; } });

    if (this.isCentreAdmin) {
      this.etablissementsService.getPublicList().subscribe({
        next: (etabs) => { this.etablissements = etabs || []; },
      });
    }

    // Abonnement temps réel SSE
    this.sub = this.notifications.messages().subscribe({
      next: (msg) => {
        if (msg && typeof msg === 'object') {
          if (msg.type?.startsWith('ADMISSION_')) {
            this.loadAllCandidatures();
            this.loadSessions();
            if (this.selected) {
              this.refreshSelected(false);
            }
          } else if (msg.type === 'SESSION_OUVERTE' || msg.type === 'SESSION_PARTAGEE') {
            this.loadSessions();
            this.toast.info(`📢 ${msg.message || 'Une session d\'admission a été mise à jour.'}`);
          } else if (msg.type === 'DEMANDE_ORIENTATION') {
            this.loadOrientations();
            this.toast.info(`📬 ${msg.message || 'Nouvelle demande d\'orientation reçue.'}`);
          }
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadAllCandidatures(): void {
    // Vider le cache potentiellement obsolète (ancienne structure sans filiere/niveau)
    localStorage.removeItem('vc_admission_all_candidatures');
    this.admission.getAllCandidatures().subscribe({
      next: (candidatures) => {
        // Filtrer les enregistrements incomplets (session sans filiere ou niveau)
        this.allCandidatures = (candidatures || []).filter(
          (c) => c.session && c.session.filiere && c.session.niveau
        );
        this.filterCandidatures();
      },
      error: () => {
        this.error = 'Impossible de charger la liste des candidatures.';
      },
    });
  }

  filterCandidatures(): void {
    let result = [...this.allCandidatures];

    if (this.searchFilter.trim()) {
      const q = this.searchFilter.toLowerCase().trim();
      result = result.filter((c) =>
        c.apprenant?.nom?.toLowerCase().includes(q) ||
        c.apprenant?.prenom?.toLowerCase().includes(q) ||
        c.apprenant?.email?.toLowerCase().includes(q) ||
        c.session?.libelle?.toLowerCase().includes(q)
      );
    }

    if (this.statusFilter) {
      result = result.filter((c) => c.statut === this.statusFilter);
    }

    if (this.sessionFilter) {
      result = result.filter((c) => c.session?.id === this.sessionFilter);
    }

    this.filteredCandidatures = result;
  }

  loadSessions(): void {
    this.admission.getSessionsGestion().subscribe({
      next: (sessions) => {
        this.sessions = sessions || [];
        if (!this.selected && this.sessions.length > 0) {
          this.selectSession(this.sessions[0]);
        }
      },
      error: () => {
        this.error = 'Impossible de charger les sessions.';
      },
    });
  }

  createSession(): void {
    this.creating = true;
    this.admission.createSession({
      ...this.draft,
      capacite: Number(this.draft.capacite),
      dateOuverture: new Date(this.draft.dateOuverture).toISOString(),
      dateFermeture: new Date(this.draft.dateFermeture).toISOString(),
      dateDebutFormation: new Date(this.draft.dateDebutFormation).toISOString(),
      description: this.draft.description || undefined,
      piecesRequises: this.draft.piecesRequises?.length ? this.draft.piecesRequises : undefined,
    }).subscribe({
      next: (session) => {
        this.sessions = [session, ...this.sessions];
        this.selected = session;
        this.creating = false;
        this.draft = { libelle: '', etablissementId: '', filiereId: '', niveauId: '', capacite: 30, dateOuverture: '', dateFermeture: '', dateDebutFormation: '', description: '', piecesRequises: [] };
        this.toast.success('Session d’admission créée avec succès.');
        this.loadAllCandidatures();
        this.refreshSelected(false);
      },
      error: (error) => {
        this.error = error.error?.message || 'Impossible de créer la session.';
        this.toast.error(this.error);
        this.creating = false;
      },
    });
  }

  setStatus(session: SessionAdmission, statut: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.busy = session.id;
    this.admission.updateSessionStatus(session.id, statut).subscribe({
      next: (updated) => {
        this.sessions = this.sessions.map((item) => item.id === updated.id ? { ...item, ...updated } : item);
        if (this.selected?.id === updated.id) {
          this.selected = { ...this.selected, ...updated };
        }
        this.busy = '';
        this.toast.success(`Statut de la session mis à jour : ${statut}`);
      },
      error: (error) => {
        this.error = error.error?.message || 'Impossible de modifier le statut.';
        this.toast.error(this.error);
        this.busy = '';
      },
    });
  }

  selectSession(session: SessionAdmission): void {
    this.selected = session;
    this.sessionCandidatures = [];
    this.stats = null;
    this.refreshSelected(true);
  }

  refreshSelected(showError = false): void {
    if (!this.selected) return;
    const sId = this.selected.id;
    this.refreshing = true;
    this.admission.getCandidaturesSession(sId).subscribe({
      next: (candidatures) => {
        if (this.selected?.id === sId) this.sessionCandidatures = candidatures || [];
        this.refreshing = false;
      },
      error: () => {
        if (showError) this.error = 'Impossible de charger les candidatures.';
        this.refreshing = false;
      },
    });
    this.admission.getSessionStats(sId).subscribe({
      next: (stats) => {
        if (this.selected?.id === sId) this.stats = stats;
      },
      error: () => {
        if (showError) this.error = 'Impossible de charger les statistiques.';
      },
    });
  }

  openDetailModal(c: Candidature): void {
    this.modalCandidature = c;
    this.decisionForm = {
      decision: (c.statut === 'ADMISE' || c.statut === 'CONFIRMEE' || c.statut === 'INSCRITE')
        ? 'ADMIS'
        : c.statut === 'LISTE_ATTENTE'
          ? 'LISTE_ATTENTE'
          : c.statut === 'REJETEE'
            ? 'REJETE'
            : 'ADMIS',
      scoreEvaluation: c.scoreEvaluation !== undefined && c.scoreEvaluation !== null ? Number(c.scoreEvaluation) : null,
      motifRejet: c.motifRejet || '',
      commentaireGestionnaire: c.commentaireGestionnaire || '',
    };
  }

  closeModal(): void {
    this.modalCandidature = null;
  }

  openEnrolementModal(prefill?: Partial<typeof this.enrolDraft>): void {
    const defaultEtabId = this.auth.currentUser?.etablissementId || (this.etablissements.length > 0 ? this.etablissements[0].id : '');
    this.enrolDraft = {
      nom: prefill?.nom || '',
      prenom: prefill?.prenom || '',
      email: prefill?.email || '',
      password: prefill?.password || '',
      etablissementId: prefill?.etablissementId || defaultEtabId,
    };
    this.showEnrolementModal = true;
  }

  closeEnrolementModal(): void {
    this.showEnrolementModal = false;
  }

  openOrientationModal(item: ContactMessageItem): void {
    this.selectedOrientation = item;
  }

  closeOrientationModal(): void {
    this.selectedOrientation = null;
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  copierTexte(texte: string, messageSucces = 'Copié dans le presse-papier'): void {
    if (!texte) return;
    navigator.clipboard.writeText(texte).then(
      () => {
        this.toast.success(messageSucces);
      },
      () => {
        this.toast.info(`Texte : ${texte}`);
      }
    );
  }

  countOrientationsWithFiliere(): number {
    return this.orientations.filter((o) => !!o.filiere && o.filiere.trim().length > 0).length;
  }

  get filteredOrientations(): ContactMessageItem[] {
    if (!this.orientationSearch?.trim()) {
      return this.orientations;
    }
    const q = this.orientationSearch.toLowerCase().trim();
    return this.orientations.filter((o) => {
      return (
        (o.nom && o.nom.toLowerCase().includes(q)) ||
        (o.telephone && o.telephone.toLowerCase().includes(q)) ||
        (o.filiere && o.filiere.toLowerCase().includes(q)) ||
        (o.message && o.message.toLowerCase().includes(q))
      );
    });
  }

  loadOrientations(): void {
    this.landingService.getContactMessages().subscribe({
      next: (msgs) => {
        this.orientations = msgs || [];
      },
      error: () => {
        // silently handled
      },
    });
  }

  enrolerDepuisOrientation(item: ContactMessageItem): void {
    const parts = (item.nom || '').trim().split(' ');
    const prenom = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
    const nom = parts.length > 1 ? parts[parts.length - 1] : '';

    this.openEnrolementModal({
      nom: nom || item.nom,
      prenom: prenom || item.nom,
      email: '',
      password: '',
    });
  }

  deleteOrientation(id: string): void {
    if (!confirm('Voulez-vous marquer cette demande d\'orientation comme traitée / la supprimer ?')) return;

    this.landingService.deleteContactMessage(id).subscribe({
      next: () => {
        this.toast.success('Demande d\'orientation traitée.');
        this.loadOrientations();
      },
      error: () => {
        this.toast.error('Erreur lors du traitement de la demande.');
      },
    });
  }

  submitEnrolement(): void {
    if (!this.enrolDraft.nom?.trim() || !this.enrolDraft.prenom?.trim() || !this.enrolDraft.email?.trim() || !this.enrolDraft.password) {
      this.toast.error('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    const etabId = this.isCentreAdmin ? this.enrolDraft.etablissementId : (this.auth.currentUser?.etablissementId || this.enrolDraft.etablissementId);
    if (!etabId) {
      this.toast.error('Veuillez sélectionner un établissement de rattachement.');
      return;
    }

    this.enroling = true;
    this.auth.enrolerApprenant({
      nom: this.enrolDraft.nom.trim(),
      prenom: this.enrolDraft.prenom.trim(),
      email: this.enrolDraft.email.trim(),
      password: this.enrolDraft.password,
      etablissementId: etabId,
    }).subscribe({
      next: () => {
        this.enroling = false;
        this.toast.success(`Apprenant « ${this.enrolDraft.prenom} ${this.enrolDraft.nom} » enrôlé avec succès.`);
        this.closeEnrolementModal();
        this.loadAllCandidatures();
      },
      error: (err) => {
        this.enroling = false;
        this.toast.error(err.error?.message || 'Impossible d’enrôler cet apprenant.');
      },
    });
  }

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
        this.toast.info(`Ouverture de « ${piece.nomFichier || 'document'} »`);
      },
    });
  }

  submitDecision(): void {
    if (!this.modalCandidature) return;
    const c = this.modalCandidature;

    if (this.decisionForm.decision === 'EN_EVALUATION') {
      this.busy = c.id;
      this.admission.openEvaluation(c.id).subscribe({
        next: (updated) => {
          this.toast.success('Dossier passé en cours d’évaluation.');
          this.busy = '';
          this.updateLocalCandidature(updated);
          this.closeModal();
        },
        error: (err) => {
          this.busy = '';
          this.toast.error(err.error?.message || 'Erreur lors du passage en évaluation.');
        },
      });
      return;
    }

    if (this.decisionForm.decision === 'REJETE' && !this.decisionForm.motifRejet?.trim()) {
      this.toast.error('Veuillez indiquer un motif de rejet.');
      return;
    }

    this.busy = c.id;
    this.admission.decideCandidature(
      c.id,
      this.decisionForm.decision,
      this.decisionForm.scoreEvaluation !== null ? this.decisionForm.scoreEvaluation : undefined,
      this.decisionForm.decision === 'REJETE' ? this.decisionForm.motifRejet : undefined,
      this.decisionForm.commentaireGestionnaire?.trim() || undefined
    ).subscribe({
      next: (updated) => {
        const msg = this.decisionForm.decision === 'ADMIS'
          ? 'Candidat admis avec transmission des explications.'
          : this.decisionForm.decision === 'LISTE_ATTENTE'
            ? 'Candidat placé en liste d’attente avec explications.'
            : 'Candidature rejetée et motifs transmis à l’apprenant.';
        this.toast.success(msg);
        this.busy = '';
        this.updateLocalCandidature(updated);
        this.closeModal();
      },
      error: (err) => {
        this.busy = '';
        this.toast.error(err.error?.message || 'Impossible d’enregistrer la décision.');
      },
    });
  }

  promote(candidature: Candidature): void {
    this.busy = candidature.id;
    this.admission.promoteCandidature(candidature.id).subscribe({
      next: (updated) => {
        this.toast.success('Candidat promu en statut admis.');
        this.busy = '';
        this.updateLocalCandidature(updated);
      },
      error: (err) => {
        this.busy = '';
        this.toast.error(err.error?.message || 'Impossible de promouvoir le candidat.');
      },
    });
  }

  getPieceUrl(fileUrl?: string): string {
    return this.admission.getPieceUrl(fileUrl);
  }

  formatPieceType(type: string): string {
    switch (type) {
      case 'PIECE_IDENTITE': return 'Pièce d\'identité';
      case 'DIPLOME': return 'Diplôme / Attestation';
      case 'RELEVE_NOTES': return 'Relevé de notes';
      case 'PHOTO': return 'Photo d\'identité';
      case 'CV': return 'Curriculum Vitae';
      case 'LETTRE_MOTIVATION': return 'Lettre de motivation';
      default: return 'Document justificatif';
    }
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'SOUMISE':
      case 'EN_EVALUATION':
        return 'bg-[#E7F1FA] text-[#1C75BC] border-[#1C75BC]/30';
      case 'ADMISE':
      case 'CONFIRMEE':
      case 'INSCRITE':
        return 'bg-[#E7F1EA] text-[#276B44] border-[#276B44]/30';
      case 'LISTE_ATTENTE':
        return 'bg-[#FDECDD] text-[#F0791E] border-[#F0791E]/30';
      case 'REJETEE':
      case 'EXPIREE':
        return 'bg-[#FDE6E6] text-[#ED1C24] border-[#ED1C24]/30';
      case 'BROUILLON':
      case 'RETIREE':
      default:
        return 'bg-[#F5F6F7] text-[#4B5157] border-[#D7DBDE]';
    }
  }

  getSessionBadgeClass(statut: string): string {
    switch (statut) {
      case 'OUVERTE':
        return 'bg-[#E7F1EA] text-[#276B44] border-[#276B44]/30';
      case 'BROUILLON':
        return 'bg-[#FDECDD] text-[#F0791E] border-[#F0791E]/30';
      case 'FERMEE':
      case 'ARCHIVEE':
      default:
        return 'bg-[#F5F6F7] text-[#4B5157] border-[#D7DBDE]';
    }
  }

  countByStatut(statut: string): number {
    return this.allCandidatures.filter((c) => c.statut === statut).length;
  }

  private updateLocalCandidature(updated: Candidature): void {
    this.allCandidatures = this.allCandidatures.map((item) => item.id === updated.id ? { ...item, ...updated } : item);
    this.sessionCandidatures = this.sessionCandidatures.map((item) => item.id === updated.id ? { ...item, ...updated } : item);
    this.filterCandidatures();
    if (this.selected) {
      this.refreshSelected(false);
    }
  }
}
