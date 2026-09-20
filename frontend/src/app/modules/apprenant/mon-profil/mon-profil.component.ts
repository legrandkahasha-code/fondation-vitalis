import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApprenantService, ApprenantDossierData } from '../../../core/services/apprenant.service';

@Component({
  selector: 'app-mon-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <!-- HEADER -->
      <div>
        <h1 class="text-2xl font-bold text-[#1B1D1F] font-heading">Mon Profil Apprenant</h1>
        <div class="barre"></div>
        <p class="text-xs text-[#4B5157] mt-2">
          Informations de compte, établissement de rattachement et sécurité des accès.
        </p>
      </div>

      <!-- TABS (Scrollable horizontally on mobile) -->
      <div class="flex items-center gap-1 sm:gap-2 border-b border-[#D7DBDE] overflow-x-auto whitespace-nowrap pb-0.5">
        <button
          (click)="activeTab = 'info'"
          class="px-3 sm:px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0"
          [class]="activeTab === 'info' ? 'border-[#1C75BC] text-[#1C75BC]' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Vue d'ensemble</span>
        </button>
        <button
          (click)="activeTab = 'edit'"
          class="px-3 sm:px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0"
          [class]="activeTab === 'edit' ? 'border-[#1C75BC] text-[#1C75BC]' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Modifier l'identité</span>
        </button>
        <button
          (click)="activeTab = 'password'"
          class="px-3 sm:px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0"
          [class]="activeTab === 'password' ? 'border-[#1C75BC] text-[#1C75BC]' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Sécurité & Mot de passe</span>
        </button>
        <button
          (click)="activeTab = 'dossier'; loadDossier()"
          class="px-3 sm:px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0"
          [class]="activeTab === 'dossier' ? 'border-[#1C75BC] text-[#1C75BC]' : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F]'"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Dossier Administratif</span>
          @if (dossierData && dossierData.regularisations.length > 0) {
            <span class="px-1.5 py-0.2 bg-[#FDECDD] text-[#F0791E] border border-[#F0791E] text-[10px] rounded-xs font-bold font-mono">
              {{ dossierData.regularisations.length }}
            </span>
          }
        </button>
      </div>

      @if (user) {
        <!-- TAB 1: OVERVIEW -->
        @if (activeTab === 'info') {
          <div class="p-6 md:p-8 bg-white border border-[#D7DBDE] rounded-xs space-y-8 animate-fade-in shadow-xs">
            <!-- Profile Card Header -->
            <div class="flex flex-col sm:flex-row sm:items-center gap-6">
              <div class="w-16 h-16 rounded-xs bg-[#124F80] text-white font-black text-2xl flex items-center justify-center shadow-xs border-b-2 border-[#F0791E] font-heading">
                {{ user.prenom?.charAt(0) }}{{ user.nom?.charAt(0) }}
              </div>

              <div class="space-y-1 flex-1">
                <div class="flex items-center gap-3 flex-wrap">
                  <h2 class="text-xl font-bold text-[#1B1D1F]">{{ user.prenom }} {{ user.nom }}</h2>
                  <span class="px-2.5 py-0.5 rounded-xs bg-[#E7F1EA] text-[#276B44] border border-[#276B44] text-xs font-bold uppercase tracking-wider">
                    Apprenant Actif
                  </span>
                </div>
                <p class="text-xs text-[#4B5157] font-mono">{{ user.email }}</p>
                <div class="flex items-center gap-2 pt-1">
                  <span class="text-[11px] font-bold text-[#124F80] uppercase tracking-wider">Matricule :</span>
                  <span class="px-2 py-0.5 rounded-xs bg-[#E7F1FA] text-[#124F80] border border-[#1C75BC]/30 text-xs font-mono font-bold shadow-2xs">
                    {{ matricule || user.id }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Info Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-[#D7DBDE]">
              <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs space-y-1">
                <span class="text-[10px] uppercase font-bold text-[#4B5157]">Rôle sur la plateforme</span>
                <p class="text-xs font-bold text-[#1B1D1F]">APPRENANT / ÉTUDIANT</p>
                <p class="text-[11px] text-[#4B5157]">Accès aux cours 24/7, passage des quiz et certificats.</p>
              </div>

              <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs space-y-1">
                <span class="text-[10px] uppercase font-bold text-[#4B5157]">Établissement / Antenne</span>
                <p class="text-xs font-bold text-[#1B1D1F]">{{ user.etablissement?.nom || 'Centre Principal Kinshasa' }}</p>
                <p class="text-[11px] text-[#4B5157] font-mono">Code : {{ user.etablissement?.codeAntenne || 'CP-KIN' }}</p>
              </div>
            </div>

            <!-- Academic Charter & Integrity Statement -->
            <div class="p-5 bg-[#E7F1FA] border-l-4 border-[#1C75BC] border border-[#D7DBDE] space-y-2 rounded-xs shadow-2xs">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 class="text-xs font-bold text-[#1C75BC] uppercase tracking-wider">Charte Pédagogique & Validations</h3>
              </div>
              <p class="text-xs text-[#1B1D1F] leading-relaxed">
                Vos évaluations et scores sont calculés et scellés directement sur les serveurs de Vitalis Center. L'obtention de chaque titre requiert le respect strict des critères d'assiduité et de notation (Règle BR-03).
              </p>
            </div>
          </div>
        }

        <!-- TAB 2: EDIT PROFILE -->
        @if (activeTab === 'edit') {
          <div class="p-6 md:p-8 bg-white border border-[#D7DBDE] rounded-xs space-y-6 animate-fade-in">
            <div>
              <h2 class="text-base font-bold text-[#1B1D1F]">Modifier vos informations d'identité</h2>
              <p class="text-xs text-[#4B5157] mt-0.5">Ces informations apparaîtront sur vos attestations et certificats officiels.</p>
            </div>

            <form (ngSubmit)="saveProfile()" class="space-y-4 max-w-lg">
              <div>
                <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Prénom</label>
                <input
                  type="text"
                  [(ngModel)]="editForm.prenom"
                  name="prenom"
                  required
                  class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#1C75BC] focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Nom</label>
                <input
                  type="text"
                  [(ngModel)]="editForm.nom"
                  name="nom"
                  required
                  class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#1C75BC] focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Téléphone de contact</label>
                <input
                  type="tel"
                  [(ngModel)]="editForm.telephone"
                  name="telephone"
                  placeholder="+243..."
                  class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#1C75BC] focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#4B5157] mb-1">Adresse Email (non modifiable)</label>
                <input
                  type="email"
                  [value]="user.email"
                  disabled
                  class="w-full px-3 py-2 border border-[#D7DBDE] bg-[#F5F6F7] text-[#4B5157] rounded-xs text-xs cursor-not-allowed"
                />
              </div>

              <div class="pt-2">
                <button
                  type="submit"
                  [disabled]="savingProfile"
                  class="w-full sm:w-auto px-5 py-2.5 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <span>{{ savingProfile ? 'Enregistrement...' : 'Enregistrer les modifications' }}</span>
                </button>
              </div>
            </form>
          </div>
        }

        <!-- TAB 3: CHANGE PASSWORD -->
        @if (activeTab === 'password') {
          <div class="p-6 md:p-8 bg-white border border-[#D7DBDE] rounded-xs space-y-6 animate-fade-in">
            <div>
              <h2 class="text-base font-bold text-[#1B1D1F]">Changer mon mot de passe</h2>
              <p class="text-xs text-[#4B5157] mt-0.5">Le mot de passe doit respecter le standard ANSSI (minimum 12 caractères, majuscule, minuscule, chiffre et symbole).</p>
            </div>

            <form (ngSubmit)="savePassword()" class="space-y-4 max-w-lg">
              <div>
                <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  [(ngModel)]="passwordForm.ancien"
                  name="ancien"
                  required
                  class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#1C75BC] focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  [(ngModel)]="passwordForm.nouveau"
                  name="nouveau"
                  required
                  class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#1C75BC] focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  [(ngModel)]="passwordForm.confirme"
                  name="confirme"
                  required
                  class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#1C75BC] focus:outline-none"
                />
              </div>

              <div class="pt-2">
                <button
                  type="submit"
                  [disabled]="savingPassword"
                  class="w-full sm:w-auto px-5 py-2.5 rounded-xs bg-[#F0791E] hover:bg-[#d96612] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>{{ savingPassword ? 'Mise à jour sécurisée...' : 'Modifier le mot de passe' }}</span>
                </button>
              </div>
            </form>
          </div>
        }

        <!-- TAB 4: DOSSIER ADMINISTRATIF -->
        @if (activeTab === 'dossier') {
          <div class="space-y-6 animate-fade-in">
            <!-- Header card -->
            <div class="p-6 bg-white border border-[#D7DBDE] rounded-xs shadow-xs space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 class="text-base font-bold text-[#1B1D1F]">Pièces Administratives & Régularisations</h2>
                  <p class="text-xs text-[#4B5157] mt-0.5">
                    Gérez vos justificatifs d'inscription et répondez aux demandes de régularisation de l'administration.
                  </p>
                </div>
                <button
                  type="button"
                  (click)="loadDossier()"
                  [disabled]="loadingDossier"
                  class="px-3 py-1.5 rounded-xs bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-60"
                >
                  <svg
                    class="w-3.5 h-3.5 text-[#1C75BC]"
                    [class.animate-spin]="loadingDossier"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Actualiser</span>
                </button>
              </div>

              <!-- Summary KPIs -->
              @if (dossierData) {
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div class="p-3.5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs">
                    <span class="text-[10px] uppercase font-bold text-[#4B5157]">Statut du dossier</span>
                    <p class="text-sm font-bold mt-1" [class]="dossierData.regularisations.length === 0 ? 'text-[#276B44]' : 'text-[#F0791E]'">
                      {{ dossierData.regularisations.length === 0 ? 'Dossier en règle' : 'Régularisation requise' }}
                    </p>
                  </div>
                  <div class="p-3.5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs">
                    <span class="text-[10px] uppercase font-bold text-[#4B5157]">Pièces fournies</span>
                    <p class="text-sm font-bold text-[#1B1D1F] font-mono mt-1">
                      {{ dossierData.documents.length }} document{{ dossierData.documents.length > 1 ? 's' : '' }}
                    </p>
                  </div>
                  <div class="p-3.5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs">
                    <span class="text-[10px] uppercase font-bold text-[#4B5157]">Antenne d'inscription</span>
                    <p class="text-sm font-bold text-[#124F80] truncate mt-1">
                      {{ user.etablissement?.nom || 'Centre Principal Kinshasa' }}
                    </p>
                  </div>
                </div>
              }
            </div>

            <!-- Upload new document card -->
            <div class="p-6 bg-white border border-[#D7DBDE] rounded-xs shadow-xs space-y-4">
              <h3 class="text-xs font-bold text-[#1B1D1F] uppercase tracking-wider flex items-center gap-1.5">
                <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Téléverser un nouveau document administratif</span>
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Type de document</label>
                  <select
                    [(ngModel)]="uploadDocType"
                    class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#1C75BC] focus:outline-none bg-white"
                  >
                    <option value="PIECE_IDENTITE">Pièce d'identité (CNI, Passeport)</option>
                    <option value="DIPLOME">Diplôme ou attestation académique</option>
                    <option value="PHOTO">Photo d'identité officielle</option>
                    <option value="CV">Curriculum Vitae (CV)</option>
                    <option value="AUTRE">Autre justificatif</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Titre ou description du fichier</label>
                  <input
                    type="text"
                    [(ngModel)]="uploadDocTitre"
                    placeholder="Ex : Passeport biométrique valide"
                    class="w-full px-3 py-2 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#1C75BC] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#1B1D1F] mb-1">Fichier (PDF, PNG, JPG - max 15 Mo)</label>
                <input
                  type="file"
                  (change)="onFileSelected($event)"
                  accept=".pdf,.png,.jpg,.jpeg"
                  class="w-full text-xs text-[#4B5157] file:mr-3 file:py-2 file:px-4 file:rounded-xs file:border-0 file:text-xs file:font-bold file:bg-[#E7F1FA] file:text-[#1C75BC] hover:file:bg-[#1C75BC] hover:file:text-white file:transition-colors file:cursor-pointer"
                />
              </div>

              <div>
                <button
                  type="button"
                  (click)="submitDocument()"
                  [disabled]="uploadingDoc || !selectedFile"
                  class="px-4 py-2 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  @if (uploadingDoc) {
                    <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Téléversement et vérification...</span>
                  } @else {
                    <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Déposer la pièce justificative</span>
                  }
                </button>
              </div>
            </div>

            <!-- List of existing documents -->
            <div class="p-6 bg-white border border-[#D7DBDE] rounded-xs shadow-xs space-y-4">
              <h3 class="text-xs font-bold text-[#1B1D1F] uppercase tracking-wider flex items-center gap-1.5">
                <svg class="w-4 h-4 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Documents enregistrés dans votre dossier</span>
              </h3>

              @if (loadingDossier) {
                <div class="p-8 text-center text-[#4B5157]">
                  <div class="inline-block w-6 h-6 border-2 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p class="text-xs">Chargement du dossier...</p>
                </div>
              } @else if (!dossierData || dossierData.documents.length === 0) {
                <div class="p-6 text-center text-[#4B5157] bg-[#F5F6F7] rounded-xs">
                  <p class="text-xs font-semibold text-[#1B1D1F]">Aucun document déposé pour l'instant</p>
                  <p class="text-[11px] text-[#4B5157] mt-0.5">Utilisez le formulaire ci-dessus pour téléverser vos pièces officielles.</p>
                </div>
              } @else {
                <div class="divide-y divide-[#D7DBDE] border border-[#D7DBDE] rounded-xs overflow-hidden">
                  @for (doc of dossierData.documents; track doc.id) {
                    <div class="p-3.5 bg-white hover:bg-[#F5F6F7] flex items-center justify-between gap-4 transition-colors">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="w-8 h-8 rounded-xs bg-[#E7F1FA] text-[#1C75BC] flex items-center justify-center shrink-0">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div class="min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="px-2 py-0.2 rounded-xs bg-[#F5F6F7] border border-[#D7DBDE] text-[10px] font-bold text-[#124F80]">
                              {{ doc.typeDocument }}
                            </span>
                            <span class="text-xs font-bold text-[#1B1D1F] truncate">{{ doc.titre || doc.nomFichier }}</span>
                          </div>
                          <p class="text-[10px] text-[#4B5157] font-mono mt-0.5">
                            Déposé le {{ doc.createdAt | date:'dd/MM/yyyy à HH:mm' }}
                          </p>
                        </div>
                      </div>

                      @if (doc.fileUrl) {
                        <a
                          [href]="doc.fileUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="px-3 py-1.5 rounded-xs bg-white text-[#1C75BC] border border-[#1C75BC] hover:bg-[#E7F1FA] text-xs font-bold transition-all shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>Consulter</span>
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- List of administrative regularizations -->
            @if (dossierData && dossierData.regularisations.length > 0) {
              <div class="p-6 bg-white border border-[#D7DBDE] rounded-xs shadow-xs space-y-4">
                <h3 class="text-xs font-bold text-[#F0791E] uppercase tracking-wider flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Demandes de Régularisation Administratives ({{ dossierData.regularisations.length }})</span>
                </h3>

                <div class="space-y-3">
                  @for (reg of dossierData.regularisations; track reg.id) {
                    <div class="p-4 bg-[#FDECDD]/40 border-l-4 border-[#F0791E] border border-[#D7DBDE] rounded-xs space-y-3">
                      <div class="flex items-center justify-between flex-wrap gap-2">
                        <span class="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase"
                          [class]="reg.statut === 'SOUMIS' ? 'bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]' : 'bg-[#FDECDD] text-[#F0791E] border border-[#F0791E]'">
                          Statut : {{ reg.statut === 'SOUMIS' ? 'PIÈCES TRANSMISES' : reg.statut }}
                        </span>
                        <span class="text-[11px] text-[#4B5157] font-mono">
                          Demandé le {{ reg.createdAt | date:'dd/MM/yyyy' }}
                        </span>
                      </div>
                      <p class="text-xs font-bold text-[#1B1D1F]">{{ reg.motif }}</p>
                      @if (reg.description) {
                        <p class="text-xs text-[#4B5157] leading-relaxed bg-white p-2.5 rounded-xs border border-[#D7DBDE]">
                          <strong>Instruction administration :</strong> {{ reg.description }}
                        </p>
                      }

                      @if (reg.decisionCommentaire) {
                        <p class="text-xs text-[#124F80] bg-[#E7F1FA] p-2.5 rounded-xs border border-[#1C75BC]/30">
                          <strong>Dernière note :</strong> {{ reg.decisionCommentaire }}
                        </p>
                      }

                      @if (reg.statut === 'EN_ATTENTE' || reg.statut === 'OUVERTE') {
                        @if (respondingRegId !== reg.id) {
                          <div class="pt-1">
                            <button
                              type="button"
                              (click)="openRepondreModal(reg.id)"
                              class="px-3.5 py-1.5 rounded-xs bg-[#F0791E] hover:bg-[#D96510] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span>Transmettre les pièces justificatives</span>
                            </button>
                          </div>
                        } @else {
                          <div class="p-3.5 bg-white border border-[#F0791E] rounded-xs space-y-3 mt-2 animate-fade-in">
                            <h4 class="text-xs font-bold text-[#1B1D1F]">Répondre à cette demande</h4>
                            
                            <div>
                              <label class="block text-[11px] font-semibold text-[#4B5157] mb-1">
                                Document justificatif (PDF, PNG, JPG - max 15 Mo)
                              </label>
                              <input
                                type="file"
                                (change)="onRegFileSelected($event)"
                                accept=".pdf,.png,.jpg,.jpeg"
                                class="w-full text-xs text-[#4B5157] file:mr-2 file:py-1.5 file:px-3 file:rounded-xs file:border-0 file:text-xs file:font-bold file:bg-[#FDECDD] file:text-[#F0791E] hover:file:bg-[#F0791E] hover:file:text-white file:transition-colors file:cursor-pointer"
                              />
                            </div>

                            <div>
                              <label class="block text-[11px] font-semibold text-[#4B5157] mb-1">
                                Commentaire ou note pour l'administration
                              </label>
                              <textarea
                                [(ngModel)]="regCommentaire"
                                rows="2"
                                placeholder="Précisez les détails ou références du document transmis..."
                                class="w-full px-3 py-1.5 border border-[#D7DBDE] rounded-xs text-xs focus:border-[#F0791E] focus:outline-none"
                              ></textarea>
                            </div>

                            <div class="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                (click)="submitReponseRegularisation(reg.id)"
                                [disabled]="submittingReg"
                                class="px-3.5 py-1.5 rounded-xs bg-[#276B44] hover:bg-[#1D5234] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                @if (submittingReg) {
                                  <div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Envoi en cours...</span>
                                } @else {
                                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Envoyer la régularisation</span>
                                }
                              </button>

                              <button
                                type="button"
                                (click)="cancelRepondre()"
                                [disabled]="submittingReg"
                                class="px-3 py-1.5 rounded-xs bg-[#F5F6F7] text-[#4B5157] hover:text-[#1B1D1F] border border-[#D7DBDE] text-xs font-semibold cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        }
                      } @else if (reg.statut === 'SOUMIS') {
                        <p class="text-[11px] text-[#1C75BC] font-semibold flex items-center gap-1">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Vos documents ont été transmis. Le dossier est en cours d'examen administratif.</span>
                        </p>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class MonProfilComponent implements OnInit, OnDestroy {
  user: any = null;
  matricule: string | null = null;
  activeTab: 'info' | 'edit' | 'password' | 'dossier' = 'info';

  editForm = {
    nom: '',
    prenom: '',
    telephone: '',
  };

  passwordForm = {
    ancien: '',
    nouveau: '',
    confirme: '',
  };

  savingProfile = false;
  savingPassword = false;

  // Dossier Administratif State
  dossierData: ApprenantDossierData | null = null;
  loadingDossier = false;
  uploadingDoc = false;
  selectedFile: File | null = null;
  uploadDocType = 'PIECE_IDENTITE';
  uploadDocTitre = '';

  private liveSub?: Subscription;
  private bootstrapSub?: Subscription;

  constructor(
    private auth: AuthService,
    private toast: ToastService,
    private apprenantService: ApprenantService,
  ) {}

  ngOnInit() {
    this.user = this.auth.currentUser;
    if (this.user) {
      this.editForm.nom = this.user.nom || '';
      this.editForm.prenom = this.user.prenom || '';
      this.editForm.telephone = this.user.telephone || '';
    }

    // 0ms instant prewarm
    const profileSnap = this.apprenantService.getProfileSnapshot();
    if (profileSnap) {
      this.matricule = profileSnap.matricule;
      if (profileSnap.telephone && !this.editForm.telephone) {
        this.editForm.telephone = profileSnap.telephone;
      }
    }

    const dossierSnap = this.apprenantService.getDossierSnapshot();
    if (dossierSnap) {
      this.dossierData = dossierSnap;
    }

    // Ecoute bootstrap unifié
    this.bootstrapSub = this.apprenantService.bootstrap$.subscribe((data) => {
      if (data?.profile) {
        this.matricule = data.profile.matricule;
        if (data.profile.telephone && !this.editForm.telephone) {
          this.editForm.telephone = data.profile.telephone;
        }
      }
      if (data?.dossier) {
        this.dossierData = data.dossier;
      }
    });

    // Écouter les événements temps réel sur le dossier et les régularisations
    this.liveSub = this.apprenantService.liveUpdates$.subscribe((evt) => {
      if (
        evt.type === 'DEMANDE_REGULARISATION' ||
        evt.type === 'REGULARISATION_DECISION' ||
        evt.type === 'DOCUMENT_REGULARISATION_SOUMIS' ||
        evt.type === 'DOSSIER_DOCUMENT_AJOUTE'
      ) {
        this.loadDossier();
      }
    });
  }

  ngOnDestroy() {
    this.liveSub?.unsubscribe();
    this.bootstrapSub?.unsubscribe();
  }

  saveProfile() {
    if (!this.editForm.nom.trim() || !this.editForm.prenom.trim()) {
      this.toast.error('Veuillez renseigner votre nom et votre prénom.');
      return;
    }

    this.savingProfile = true;
    this.apprenantService.updateProfile({
      nom: this.editForm.nom.trim(),
      prenom: this.editForm.prenom.trim(),
      telephone: this.editForm.telephone ? this.editForm.telephone.trim() : undefined,
    }).subscribe({
      next: (res) => {
        this.savingProfile = false;
        if (this.user) {
          this.user.nom = res.nom;
          this.user.prenom = res.prenom;
          this.user.telephone = res.telephone;
        }
        if (res.matricule) {
          this.matricule = res.matricule;
        }
        this.toast.success('Profil et dossier apprenant mis à jour avec succès !');
        this.activeTab = 'info';
      },
      error: (err) => {
        this.savingProfile = false;
        this.toast.error(err.error?.message || 'Erreur lors de la mise à jour du profil.');
      },
    });
  }

  savePassword() {
    if (!this.passwordForm.ancien || !this.passwordForm.nouveau) {
      this.toast.error('Veuillez remplir tous les champs de mot de passe.');
      return;
    }

    if (this.passwordForm.nouveau !== this.passwordForm.confirme) {
      this.toast.error('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    if (this.passwordForm.nouveau.length < 12) {
      this.toast.error('Le mot de passe doit comporter au moins 12 caractères.');
      return;
    }

    this.savingPassword = true;
    this.auth.changePassword({
      ancienMotDePasse: this.passwordForm.ancien,
      nouveauMotDePasse: this.passwordForm.nouveau,
    }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.toast.success('Mot de passe mis à jour avec succès !');
        this.passwordForm = { ancien: '', nouveau: '', confirme: '' };
        this.activeTab = 'info';
      },
      error: (err) => {
        this.savingPassword = false;
        this.toast.error(err.error?.message || 'Erreur lors du changement de mot de passe.');
      },
    });
  }

  loadDossier(showSpinner = true): void {
    const snapshot = this.apprenantService.getDossierSnapshot();
    if (snapshot) {
      this.dossierData = snapshot;
      this.loadingDossier = false;
    } else if (showSpinner) {
      this.loadingDossier = true;
    }
    this.apprenantService.getDossier().subscribe({
      next: (res) => {
        this.dossierData = res;
        this.loadingDossier = false;
      },
      error: (err) => {
        this.loadingDossier = false;
        this.toast.error('Impossible de charger le dossier administratif : ' + (err.error?.message || err.message));
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        this.toast.error('Le fichier dépasse la taille maximale autorisée (15 Mo).');
        event.target.value = '';
        this.selectedFile = null;
        return;
      }
      this.selectedFile = file;
      if (!this.uploadDocTitre) {
        this.uploadDocTitre = file.name;
      }
    }
  }

  submitDocument(): void {
    if (!this.selectedFile) {
      this.toast.error('Veuillez sélectionner un fichier à téléverser.');
      return;
    }

    this.uploadingDoc = true;
    this.apprenantService.uploadDocumentDossier(
      this.selectedFile,
      this.uploadDocType,
      this.uploadDocTitre || this.selectedFile.name
    ).subscribe({
      next: () => {
        this.uploadingDoc = false;
        this.toast.success('Document ajouté avec succès à votre dossier !');
        this.selectedFile = null;
        this.uploadDocTitre = '';
        this.loadDossier();
      },
      error: (err) => {
        this.uploadingDoc = false;
        this.toast.error(err.error?.message || 'Erreur lors du téléversement du document.');
      },
    });
  }

  // Régularisation
  respondingRegId: string | null = null;
  regFile: File | null = null;
  regCommentaire: string = '';
  submittingReg: boolean = false;

  openRepondreModal(regId: string): void {
    this.respondingRegId = regId;
    this.regFile = null;
    this.regCommentaire = '';
  }

  cancelRepondre(): void {
    this.respondingRegId = null;
    this.regFile = null;
    this.regCommentaire = '';
  }

  onRegFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        this.toast.error('Le fichier dépasse la taille maximale autorisée (15 Mo).');
        event.target.value = '';
        this.regFile = null;
        return;
      }
      this.regFile = file;
    }
  }

  submitReponseRegularisation(regId: string): void {
    if (!this.regFile && !this.regCommentaire.trim()) {
      this.toast.error('Veuillez joindre un fichier ou saisir une explication.');
      return;
    }

    this.submittingReg = true;
    this.apprenantService.repondreRegularisation(regId, this.regFile || undefined, this.regCommentaire).subscribe({
      next: () => {
        this.submittingReg = false;
        this.toast.success('Votre réponse et vos pièces justificatives ont été transmises à l\'administration.');
        this.cancelRepondre();
        this.loadDossier();
      },
      error: (err) => {
        this.submittingReg = false;
        this.toast.error(err.error?.message || 'Erreur lors de la transmission de la réponse.');
      },
    });
  }
}

