import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UtilisateursService } from '../../../core/services/utilisateurs.service';
import { EtablissementsService } from '../../../core/services/etablissements.service';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationsService, NotificationPayload } from '../../../core/services/notifications.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Utilisateur, Etablissement } from '../../../core/models';

type SousModuleType = 'ADMINISTRATIF' | 'TECHNIQUE' | 'APPRENANTS' | 'SECURITE';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="max-w-7xl mx-auto pb-16 font-['Public_Sans',sans-serif] px-4 sm:px-6">

        <!-- En-tête Institutionnel Cockpit -->
        <div class="mb-6 bg-white border border-[#D7DBDE] p-6 rounded-xs shadow-2xs">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[12px] uppercase font-semibold tracking-[0.06em] text-[#4B5157]">
                  03 · Administration Centrale · Gouvernance du Capital Humain & RBAC
                </span>
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xs font-medium bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#1C75BC] animate-pulse"></span>
                  Gouvernance Nationale
                </span>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs text-xs font-semibold bg-[#E7F1EA] text-[#276B44] border border-[#276B44]/20">
                  <span class="w-2 h-2 rounded-full bg-[#276B44] animate-pulse"></span>
                  Dossiers en Direct (SSE)
                </span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] mt-1 tracking-tight">
                Gestion du Personnel, des Formateurs & des Apprenants
              </h1>
              <div class="barre"></div>
              <p class="text-[14px] text-[#4B5157] max-w-3xl leading-relaxed mt-3">
                Supervision centralisée des dossiers individuels, attribution des rôles et habilitations d'accès, contrôle du corps professoral, des équipes de gestion et des apprenants du réseau national.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                (click)="ouvrirModalEnrolement()"
                class="btn btn-primary text-xs py-2.5 px-4 font-semibold inline-flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
                <span>{{ getLabelEnrolement() }}</span>
              </button>
              <button
                type="button"
                (click)="chargerDonnees(true)"
                [disabled]="loading || refreshing"
                class="btn btn-ghost text-xs py-2.5 px-3.5 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <svg class="w-4 h-4" [class.animate-spin]="loading || refreshing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- NAVIGATION SOUS-MODULES (ONGLETS THÉMATIQUES MÉTIER)                      -->
        <!-- ========================================================================= -->
        <div class="flex items-center gap-2 mb-6 border-b border-[#D7DBDE] pb-1 overflow-x-auto">
          <button
            type="button"
            (click)="changerSousModule('ADMINISTRATIF')"
            class="px-4 py-2.5 text-xs font-semibold rounded-t-xs transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap shrink-0"
            [ngClass]="ongletActif === 'ADMINISTRATIF' 
              ? 'border-[#1C75BC] text-[#1C75BC] bg-white font-bold shadow-xs' 
              : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F] hover:bg-[#F5F6F7]'"
          >
            <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Personnel Administratif</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              [ngClass]="ongletActif === 'ADMINISTRATIF' ? 'bg-[#E7F1FA] text-[#1C75BC]' : 'bg-[#F5F6F7] text-[#4B5157]'">
              {{ countAdministratifs() }}
            </span>
          </button>

          <button
            type="button"
            (click)="changerSousModule('TECHNIQUE')"
            class="px-4 py-2.5 text-xs font-semibold rounded-t-xs transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap shrink-0"
            [ngClass]="ongletActif === 'TECHNIQUE' 
              ? 'border-[#1C75BC] text-[#1C75BC] bg-white font-bold shadow-xs' 
              : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F] hover:bg-[#F5F6F7]'"
          >
            <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Personnel Technique & Formateurs</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              [ngClass]="ongletActif === 'TECHNIQUE' ? 'bg-[#FDECDD] text-[#F0791E]' : 'bg-[#F5F6F7] text-[#4B5157]'">
              {{ countTechniques() }}
            </span>
          </button>

          <button
            type="button"
            (click)="changerSousModule('APPRENANTS')"
            class="px-4 py-2.5 text-xs font-semibold rounded-t-xs transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap shrink-0"
            [ngClass]="ongletActif === 'APPRENANTS' 
              ? 'border-[#1C75BC] text-[#1C75BC] bg-white font-bold shadow-xs' 
              : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F] hover:bg-[#F5F6F7]'"
          >
            <svg class="w-4 h-4 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
            </svg>
            <span>Apprenants & Stagiaires</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              [ngClass]="ongletActif === 'APPRENANTS' ? 'bg-[#E7F1FA] text-[#1C75BC]' : 'bg-[#F5F6F7] text-[#4B5157]'">
              {{ countApprenants() }}
            </span>
          </button>

          <button
            type="button"
            (click)="changerSousModule('SECURITE')"
            class="px-4 py-2.5 text-xs font-semibold rounded-t-xs transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap shrink-0"
            [ngClass]="ongletActif === 'SECURITE' 
              ? 'border-[#F0791E] text-[#F0791E] bg-white font-bold shadow-xs' 
              : 'border-transparent text-[#4B5157] hover:text-[#1B1D1F] hover:bg-[#F5F6F7]'"
          >
            <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Droits d'Accès & Sécurité (RBAC)</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F1FA] text-[#124F80]">
              {{ utilisateurs.length }}
            </span>
          </button>
        </div>

        <!-- ========================================================================= -->
        <!-- STATISTIQUES CONTEXTUELLES PAR SOUS-MODULE                                -->
        <!-- ========================================================================= -->
        @if (ongletActif === 'ADMINISTRATIF') {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-[#4B5157] font-semibold uppercase tracking-wider">Total Administratifs</span>
              <div class="text-2xl font-bold text-[#1B1D1F] mt-1">{{ countAdministratifs() }}</div>
              <span class="text-[11px] text-gray-500">Direction & antennes</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-purple-700 font-semibold uppercase tracking-wider">Direction Centrale</span>
              <div class="text-2xl font-bold text-purple-700 mt-1">{{ countRole('ADMIN_CENTRE') }}</div>
              <span class="text-[11px] text-gray-500">Administrateurs généraux</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-[#1C75BC] font-semibold uppercase tracking-wider">Directeurs d'Antennes</span>
              <div class="text-2xl font-bold text-[#1C75BC] mt-1">{{ countRole('ADMIN_ETABLISSEMENT') }}</div>
              <span class="text-[11px] text-gray-500">Gestionnaires territoriaux</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-cyan-700 font-semibold uppercase tracking-wider">Personnel Scolarité</span>
              <div class="text-2xl font-bold text-cyan-700 mt-1">{{ countRole('PERSONNEL_ADMINISTRATIF') }}</div>
              <span class="text-[11px] text-gray-500">Admissions & dossiers</span>
            </div>
          </div>
        } @else if (ongletActif === 'TECHNIQUE') {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-[#4B5157] font-semibold uppercase tracking-wider">Total Formateurs</span>
              <div class="text-2xl font-bold text-amber-700 mt-1">{{ countTechniques() }}</div>
              <span class="text-[11px] text-gray-500">Corps professoral actif</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Comptes Actifs</span>
              <div class="text-2xl font-bold text-emerald-700 mt-1">{{ countTechniquesActifs() }}</div>
              <span class="text-[11px] text-gray-500">En activité régulière</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-[#1C75BC] font-semibold uppercase tracking-wider">Antennes Couvertes</span>
              <div class="text-2xl font-bold text-[#1C75BC] mt-1">{{ countEtablissementsAvecFormateurs() }}</div>
              <span class="text-[11px] text-gray-500">Centres dotés d'encadreurs</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-red-600 font-semibold uppercase tracking-wider">Comptes Suspendus</span>
              <div class="text-2xl font-bold text-red-600 mt-1">{{ countTechniques() - countTechniquesActifs() }}</div>
              <span class="text-[11px] text-gray-500">Accès temporairement révoqués</span>
            </div>
          </div>
        } @else if (ongletActif === 'APPRENANTS') {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-[#4B5157] font-semibold uppercase tracking-wider">Total Apprenants</span>
              <div class="text-2xl font-bold text-[#1C75BC] mt-1">{{ countApprenants() }}</div>
              <span class="text-[11px] text-gray-500">Inscrits au registre national</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Comptes Actifs</span>
              <div class="text-2xl font-bold text-emerald-700 mt-1">{{ countApprenantsActifs() }}</div>
              <span class="text-[11px] text-gray-500">Accès plateforme ouvert</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-red-600 font-semibold uppercase tracking-wider">Suspendus / Inactifs</span>
              <div class="text-2xl font-bold text-red-600 mt-1">{{ countApprenants() - countApprenantsActifs() }}</div>
              <span class="text-[11px] text-gray-500">Accès bloqué</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-purple-700 font-semibold uppercase tracking-wider">Taux d'Activation</span>
              <div class="text-2xl font-bold text-purple-700 mt-1">{{ getTauxActivationApprenants() }}%</div>
              <span class="text-[11px] text-gray-500">Engagement apprenant</span>
            </div>
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-[#4B5157] font-semibold uppercase tracking-wider">Volume Total Comptes</span>
              <div class="text-2xl font-bold text-[#1B1D1F] mt-1">{{ utilisateurs.length }}</div>
              <span class="text-[11px] text-gray-500">Tous profils confondus</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Comptes Actifs</span>
              <div class="text-2xl font-bold text-emerald-700 mt-1">{{ countTotalActifs() }}</div>
              <span class="text-[11px] text-gray-500">Droits ouverts</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-red-600 font-semibold uppercase tracking-wider">Comptes Suspendus</span>
              <div class="text-2xl font-bold text-red-600 mt-1">{{ utilisateurs.length - countTotalActifs() }}</div>
              <span class="text-[11px] text-gray-500">Accès révoqué</span>
            </div>
            <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs">
              <span class="text-xs text-amber-700 font-semibold uppercase tracking-wider">Norme Sécurité ANSSI</span>
              <div class="text-2xl font-bold text-amber-700 mt-1">Conforme</div>
              <span class="text-[11px] text-gray-500">Verrouillage après 5 échecs</span>
            </div>
          </div>
        }

        <!-- ========================================================================= -->
        <!-- FILTRES ET RECHERCHE                                                      -->
        <!-- ========================================================================= -->
        <div class="bg-white border border-[#D7DBDE] p-4 rounded-[2px] shadow-2xs mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Recherche texte -->
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-[#4B5157] mb-1">Recherche rapide</label>
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="recherche"
                  placeholder="Rechercher par nom, prénom, email ou matricule..."
                  class="w-full text-xs p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC]"
                />
                @if (recherche) {
                  <button (click)="recherche = ''" class="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 text-xs cursor-pointer">✕</button>
                }
              </div>
            </div>

            <!-- Filtre Établissement -->
            <div>
              <label class="block text-xs font-semibold text-[#4B5157] mb-1">Établissement / Antenne</label>
              <select
                [(ngModel)]="filtreEtablissement"
                class="w-full text-xs p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
              >
                <option value="">Toutes les antennes (National)</option>
                @for (e of etablissements; track e.id) {
                  <option [value]="e.id">{{ e.nom }} ({{ e.codeAntenne || 'SANS-CODE' }})</option>
                }
              </select>
            </div>

            <!-- Filtre Statut -->
            <div>
              <label class="block text-xs font-semibold text-[#4B5157] mb-1">État du compte</label>
              <select
                [(ngModel)]="filtreStatut"
                class="w-full text-xs p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
              >
                <option value="">Tous les états</option>
                <option value="actif">Comptes Actifs</option>
                <option value="inactif">Comptes Suspendus</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- TABLEAU DES UTILISATEURS DU SOUS-MODULE SÉLECTIONNÉ                       -->
        <!-- ========================================================================= -->
        <div class="bg-white border border-[#D7DBDE] rounded-[2px] shadow-2xs overflow-hidden">
          <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div class="text-xs text-[#4B5157]">
              Affichage de <span class="font-bold text-[#1B1D1F]">{{ utilisateursFiltres.length }}</span> compte(s) dans la section <span class="font-bold text-[#1C75BC]">{{ getTitreSousModule() }}</span>
            </div>
          </div>

          @if (loading && utilisateurs.length === 0) {
            <div class="p-12 text-center">
              <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin"></div>
              <p class="mt-4 text-sm text-[#4B5157]">Chargement des comptes utilisateurs en cours...</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F8F9FA] text-[#4B5157] border-b border-[#D7DBDE] uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th class="py-3.5 px-4">Utilisateur / Identité</th>
                    <th class="py-3.5 px-4">Rôle & Droits d'Accès</th>
                    <th class="py-3.5 px-4">Établissement / Antenne</th>
                    <th class="py-3.5 px-4">Statut Compte</th>
                    <th class="py-3.5 px-4 text-center">Dossier & Contrôle</th>
                    <th class="py-3.5 px-4 text-right">Gouvernance</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E9ECEF]">
                  @for (u of utilisateursFiltres; track u.id) {
                    <tr class="hover:bg-blue-50/30 transition-colors">
                      <!-- Utilisateur / Identité -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full bg-[#124F80] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {{ (u.prenom ? u.prenom.charAt(0) : '') + (u.nom ? u.nom.charAt(0) : '') }}
                          </div>
                          <div>
                            <div class="font-bold text-[#1B1D1F] text-xs">
                              {{ u.prenom }} {{ u.nom }}
                            </div>
                            <div class="text-[11px] text-[#4B5157] font-mono">
                              {{ u.email }}
                            </div>
                          </div>
                        </div>
                      </td>

                      <!-- Rôle & Droits -->
                      <td class="py-3.5 px-4">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" [ngClass]="getBadgeRoleClass(u.role)">
                          {{ formatRole(u.role) }}
                        </span>
                      </td>

                      <!-- Établissement -->
                      <td class="py-3.5 px-4">
                        <div class="text-[#1B1D1F] font-medium">
                          {{ u.etablissement?.nom || getNomEtablissement(u.etablissementId) }}
                        </div>
                        <div class="text-[10px] text-gray-400 font-mono">
                          ID: {{ u.etablissementId ? u.etablissementId.slice(0, 8) + '...' : 'Siège Central' }}
                        </div>
                      </td>

                      <!-- Statut Compte -->
                      <td class="py-3.5 px-4">
                        @if (u.actif !== false) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Actif
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Suspendu
                          </span>
                        }
                      </td>

                      <!-- Dossier & Contrôle -->
                      <td class="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          (click)="ouvrirDossier(u)"
                          class="btn btn-secondary text-[11px] py-1.5 px-3 font-semibold inline-flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50 hover:text-[#1C75BC] border border-[#D7DBDE] rounded-[2px] transition-colors cursor-pointer"
                        >
                          <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <span>Voir Dossier</span>
                        </button>
                      </td>

                      <!-- Gouvernance / Actions -->
                      <td class="py-3.5 px-4 text-right">
                        <div class="inline-flex items-center gap-1.5">
                          <!-- Modifier Rôle / Profil -->
                          <button
                            type="button"
                            (click)="ouvrirModalEdition(u)"
                            title="Modifier les droits d'accès ou l'antenne"
                            class="p-1.5 text-gray-500 hover:text-[#1C75BC] hover:bg-gray-100 rounded-[2px] transition-colors cursor-pointer"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>

                          <!-- Réinitialiser Mot de Passe -->
                          <button
                            type="button"
                            (click)="ouvrirModalResetPassword(u)"
                            title="Réinitialiser le mot de passe d'accès"
                            class="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-[2px] transition-colors cursor-pointer"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                            </svg>
                          </button>

                          <!-- Toggle Actif / Suspendu -->
                          <button
                            type="button"
                            (click)="toggleActif(u)"
                            [disabled]="actionEnCours === u.id"
                            [title]="u.actif !== false ? 'Suspendre le compte' : 'Activer le compte'"
                            class="p-1.5 rounded-[2px] transition-colors cursor-pointer"
                            [ngClass]="u.actif !== false ? 'text-emerald-600 hover:bg-red-50 hover:text-red-600' : 'text-red-600 hover:bg-emerald-50 hover:text-emerald-600'"
                          >
                            @if (actionEnCours === u.id) {
                              <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            } @else if (u.actif !== false) {
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                            } @else {
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                              </svg>
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                  @if (utilisateursFiltres.length === 0) {
                    <tr>
                      <td colspan="6" class="py-12 text-center text-gray-400">
                        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                        </svg>
                        <p class="font-medium text-gray-500">Aucun utilisateur trouvé dans cette section avec ces critères.</p>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- ========================================================================= -->
        <!-- TIROIR / MODAL : FICHE DOSSIER INDIVIDUEL COMPLET                         -->
        <!-- ========================================================================= -->
        @if (dossierSelectionne) {
          <div class="fixed inset-0 bg-black/50 z-50 flex justify-end animate-fade-in">
            <div class="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
              
              <!-- Header Dossier -->
              <div class="p-6 bg-[#124F80] text-white flex items-start justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 rounded-full bg-white/10 text-white font-bold text-lg flex items-center justify-center border-2 border-white/30">
                    {{ (dossierSelectionne.prenom ? dossierSelectionne.prenom.charAt(0) : '') + (dossierSelectionne.nom ? dossierSelectionne.nom.charAt(0) : '') }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h2 class="text-xl font-bold tracking-tight text-white leading-tight">
                        {{ dossierSelectionne.prenom }} {{ dossierSelectionne.nom }}
                      </h2>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" [ngClass]="getBadgeRoleClass(dossierSelectionne.role)">
                        {{ formatRole(dossierSelectionne.role) }}
                      </span>
                    </div>
                    <p class="text-xs text-blue-200 mt-0.5">{{ dossierSelectionne.email }}</p>
                    <div class="flex items-center gap-3 text-[11px] text-white/80 mt-2">
                      <span class="inline-flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        {{ dossierSelectionne.etablissement?.nom || 'Administration Centrale' }}
                      </span>
                      <span>•</span>
                      <span>Inscrit le : {{ dossierSelectionne.createdAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="fermerDossier()"
                  class="text-white/70 hover:text-white text-lg p-2 rounded-full hover:bg-white/10 cursor-pointer"
                  title="Fermer le dossier"
                >
                  ✕
                </button>
              </div>

              <!-- Corps du Dossier -->
              <div class="flex-1 overflow-y-auto text-xs text-[#1B1D1F]">

                <!-- Tabs dossier -->
                <div class="flex border-b border-[#D7DBDE] bg-gray-50 px-4 pt-2 gap-1 overflow-x-auto">
                  <button type="button"
                    (click)="changerOngletDossier('IDENTITE')"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap"
                    [ngClass]="ongletDossier === 'IDENTITE' ? 'border-[#1C75BC] text-[#1C75BC] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Identité & Activité
                  </button>
                  <button type="button"
                    (click)="changerOngletDossier('DOCUMENTS')"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap"
                    [ngClass]="ongletDossier === 'DOCUMENTS' ? 'border-[#1C75BC] text-[#1C75BC] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                    Documents Dossier <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="ongletDossier === 'DOCUMENTS' ? 'bg-blue-100 text-[#1C75BC]' : 'bg-gray-200 text-gray-600'">{{ documentsDossier.length }}</span>
                  </button>
                  <button type="button"
                    (click)="changerOngletDossier('REGULARISATIONS')"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap"
                    [ngClass]="ongletDossier === 'REGULARISATIONS' ? 'border-[#F0791E] text-[#F0791E] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                    </svg>
                    Régularisations <span class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="ongletDossier === 'REGULARISATIONS' ? 'bg-amber-100 text-[#F0791E]' : 'bg-gray-200 text-gray-600'">{{ regularisations.length }}</span>
                  </button>

                  <div class="ml-auto flex items-center pr-2">
                    <span class="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Synchronisation active
                    </span>
                  </div>
                </div>

                <div class="p-6 space-y-6">

                <!-- ================================================================ -->
                <!-- ONGLET: IDENTITÉ & ACTIVITÉ -->
                <!-- ================================================================ -->
                @if (ongletDossier === 'IDENTITE') {

                <!-- Indicateur de sécurité & Statut d'accès -->

                <div class="p-4 rounded-[2px] border" [ngClass]="dossierSelectionne.actif !== false ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="inline-flex items-center gap-1.5 font-bold text-xs" [ngClass]="dossierSelectionne.actif !== false ? 'text-emerald-800' : 'text-red-800'">
                        @if (dossierSelectionne.actif !== false) {
                          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Compte Actif & Habilité
                        } @else {
                          <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                          </svg>
                          Compte Suspendu
                        }
                      </span>
                      <p class="text-[11px] text-gray-600 mt-0.5">
                        {{ dossierSelectionne.securite?.estVerrouille ? 'Compte temporairement verrouillé suite à 5 tentatives infructueuses (Norme ANSSI).' : 'Aucune restriction de sécurité active.' }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      @if (dossierSelectionne.securite?.estVerrouille) {
                        <button
                          type="button"
                          (click)="deverrouillerCompte(dossierSelectionne.id)"
                          class="btn btn-secondary text-[10px] py-1.5 px-2.5 font-bold bg-[#F0791E] text-white border-0 hover:bg-[#d96714] cursor-pointer"
                        >
                          Déverrouiller ANSSI
                        </button>
                      }
                      <button
                        type="button"
                        (click)="ouvrirModalResetPassword(dossierSelectionne)"
                        class="btn btn-secondary text-[10px] py-1.5 px-2.5 font-semibold bg-white border border-[#D7DBDE] hover:bg-gray-50 text-[#1B1D1F] cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <svg class="w-3.5 h-3.5 text-[#F0791E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                        </svg>
                        Réinitialiser Mot de Passe
                      </button>
                    </div>
                  </div>
                </div>

                <!-- SECTION APPRENANT : Candidatures, Pièces jointes, Matricule -->
                @if (dossierSelectionne.role === 'APPRENANT') {
                  <div class="space-y-4">
                    <div class="flex items-center justify-between border-b border-[#D7DBDE] pb-2">
                      <h3 class="font-bold text-sm text-[#124F80] uppercase tracking-wider flex items-center gap-2">
                        <svg class="w-4 h-4 text-[#F0791E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/>
                        </svg>
                        Cursus & Dossier d'Admission
                      </h3>
                      @if (dossierSelectionne.apprenantProfile?.matricule) {
                        <span class="px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#1C75BC] rounded-[2px] font-mono font-bold text-xs">
                          Matricule: {{ dossierSelectionne.apprenantProfile.matricule }}
                        </span>
                      }
                    </div>

                    <!-- Détails Profil Apprenant -->
                    <div class="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-[2px] border border-gray-100">
                      <div>
                        <span class="text-gray-500 text-[10px] uppercase font-semibold">Téléphone</span>
                        <div class="font-medium text-xs">{{ dossierSelectionne.apprenantProfile?.telephone || 'Non renseigné' }}</div>
                      </div>
                      <div>
                        <span class="text-gray-500 text-[10px] uppercase font-semibold">Pièce d'Identité</span>
                        <div class="font-medium text-xs">{{ dossierSelectionne.apprenantProfile?.numeroIdentite || 'Non renseigné' }}</div>
                      </div>
                      <div>
                        <span class="text-gray-500 text-[10px] uppercase font-semibold">Date de Naissance</span>
                        <div class="font-medium text-xs">{{ (dossierSelectionne.apprenantProfile?.dateNaissance | date:'dd/MM/yyyy') || 'Non renseignée' }}</div>
                      </div>
                      <div>
                        <span class="text-gray-500 text-[10px] uppercase font-semibold">Pays d'Origine</span>
                        <div class="font-medium text-xs">{{ dossierSelectionne.apprenantProfile?.paysOrigine || 'RDC' }}</div>
                      </div>
                    </div>

                    <!-- Candidatures et Pièces Justificatives déposées -->
                    <div class="mt-4">
                      <h4 class="font-bold text-xs text-[#1B1D1F] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                        </svg>
                        Pièces Justificatives & Candidatures Déposées
                      </h4>
                      
                      @if (dossierSelectionne.apprenantProfile?.candidatures?.length) {
                        <div class="space-y-3">
                          @for (c of dossierSelectionne.apprenantProfile.candidatures; track c.id) {
                            <div class="border border-[#D7DBDE] rounded-[2px] p-3 bg-white">
                              <div class="flex items-center justify-between mb-2">
                                <span class="font-bold text-xs text-[#124F80]">{{ c.session?.libelle || 'Session d’admission' }}</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1C75BC] border border-blue-200">
                                  Statut: {{ c.statut }}
                                </span>
                              </div>

                              <div class="text-[11px] text-gray-600 mb-2">
                                Filière : {{ c.session?.filiere?.libelle }} · Niveau : {{ c.session?.niveau?.libelle }}
                              </div>

                              <!-- Pièces Jointes -->
                              @if (c.pieces && c.pieces.length > 0) {
                                <div class="mt-2 pt-2 border-t border-gray-100">
                                  <span class="text-[10px] font-bold uppercase text-gray-500 block mb-1.5">Documents & Pièces Vérifiées :</span>
                                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    @for (p of c.pieces; track p.id) {
                                      <a
                                        [href]="p.fileUrl"
                                        target="_blank"
                                        class="flex items-center justify-between p-2 rounded-[2px] bg-gray-50 hover:bg-blue-50 border border-[#D7DBDE] transition-colors text-xs group"
                                      >
                                        <div class="truncate mr-2">
                                          <div class="font-semibold text-[#1B1D1F] group-hover:text-[#1C75BC] truncate">{{ p.nomFichier }}</div>
                                          <div class="text-[10px] text-gray-400">{{ p.type }}</div>
                                        </div>
                                        <span class="text-[10px] font-bold text-[#1C75BC] shrink-0">Ouvrir ↗</span>
                                      </a>
                                    }
                                  </div>
                                </div>
                              } @else {
                                <div class="text-[11px] text-gray-400 italic">Aucune pièce jointe déposée sur cette candidature.</div>
                              }
                            </div>
                          }
                        </div>
                      } @else {
                        <div class="p-4 text-center bg-gray-50 border border-gray-100 text-gray-400 rounded-[2px]">
                          Aucune candidature enregistrée pour cet apprenant.
                        </div>
                      }
                    </div>

                    <!-- Inscriptions & Certificats -->
                    <div class="mt-4">
                      <h4 class="font-bold text-xs text-[#1B1D1F] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-[#F0791E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        Formations Inscrites & Certifications
                      </h4>
                      @if (dossierSelectionne.certificats?.length) {
                        <div class="space-y-2 mb-3">
                          @for (cert of dossierSelectionne.certificats; track cert.id) {
                            <div class="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-[2px] flex items-center justify-between">
                              <div>
                                <span class="font-bold text-emerald-900">{{ cert.formation?.titre }}</span>
                                <div class="text-[10px] text-emerald-700 font-mono">Série: {{ cert.numeroSerie }} · Moyenne: {{ cert.moyenneGenerale }}/20</div>
                              </div>
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                                Certifié
                              </span>
                            </div>
                          }
                        </div>
                      }
                      @if (dossierSelectionne.apprenantProfile?.inscriptions?.length) {
                        <div class="space-y-2">
                          @for (ins of dossierSelectionne.apprenantProfile.inscriptions; track ins.id) {
                            <div class="p-2.5 bg-gray-50 border border-gray-200 rounded-[2px] flex items-center justify-between">
                              <div>
                                <span class="font-semibold">{{ ins.formation?.titre }}</span>
                                <div class="text-[10px] text-gray-500">Inscrit le : {{ ins.dateDebut | date:'dd/MM/yyyy' }}</div>
                              </div>
                              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1C75BC]">{{ ins.statut }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- SECTION FORMATEUR : Séances, Cours, Notes -->
                @if (dossierSelectionne.role === 'FORMATEUR') {
                  <div class="space-y-4">
                    <div class="flex items-center justify-between border-b border-[#D7DBDE] pb-2">
                      <h3 class="font-bold text-sm text-[#124F80] uppercase tracking-wider flex items-center gap-2">
                        <svg class="w-4 h-4 text-[#F0791E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                        </svg>
                        Activité Pédagogique & Enseignement
                      </h3>
                      <span class="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-bold">
                        Corps Professoral
                      </span>
                    </div>

                    <!-- Séances récentes -->
                    <div>
                      <h4 class="font-bold text-xs text-[#1B1D1F] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        Dernières Séances Programmées / Animées
                      </h4>
                      @if (dossierSelectionne.seances?.length) {
                        <div class="space-y-2">
                          @for (s of dossierSelectionne.seances; track s.id) {
                            <div class="p-2.5 bg-gray-50 border border-gray-200 rounded-[2px] flex items-center justify-between">
                              <div>
                                <div class="font-bold text-xs text-[#124F80]">{{ s.titreActivite }}</div>
                                <div class="text-[10px] text-gray-500">Module : {{ s.module?.titre }} · Type : {{ s.typeSession }}</div>
                              </div>
                              <div class="text-[11px] font-mono text-gray-600">
                                {{ s.dateHeureDebut | date:'dd/MM/yyyy HH:mm' }}
                              </div>
                            </div>
                          }
                        </div>
                      } @else {
                        <div class="p-4 text-center bg-gray-50 text-gray-400 rounded-[2px]">
                          Aucune séance planifiée pour ce formateur.
                        </div>
                      }
                    </div>

                    <!-- Notes attribuées -->
                    <div>
                      <h4 class="font-bold text-xs text-[#1B1D1F] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                        </svg>
                        Dernières Notations Effectuées
                      </h4>
                      @if (dossierSelectionne.notesFormateur?.length) {
                        <div class="space-y-2">
                          @for (n of dossierSelectionne.notesFormateur; track n.id) {
                            <div class="p-2 bg-gray-50 border border-gray-200 rounded-[2px] flex items-center justify-between text-xs">
                              <div>
                                <span class="font-medium">Apprenant : {{ n.utilisateur?.prenom }} {{ n.utilisateur?.nom }}</span>
                                <div class="text-[10px] text-gray-500">Évaluation : {{ n.evaluation?.titre }}</div>
                              </div>
                              <span class="font-bold text-[#1C75BC] font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {{ n.valeur }} / 20
                              </span>
                            </div>
                          }
                        </div>
                      } @else {
                        <div class="p-4 text-center bg-gray-50 text-gray-400 rounded-[2px]">
                          Aucune notation récente enregistrée.
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- SECTION ADMINISTRATIF : Habilitations & Antenne -->
                @if (dossierSelectionne.role === 'ADMIN_CENTRE' || dossierSelectionne.role === 'ADMIN_ETABLISSEMENT' || dossierSelectionne.role === 'PERSONNEL_ADMINISTRATIF') {
                  <div class="space-y-4">
                    <div class="flex items-center justify-between border-b border-[#D7DBDE] pb-2">
                      <h3 class="font-bold text-sm text-[#124F80] uppercase tracking-wider flex items-center gap-2">
                        <svg class="w-4 h-4 text-[#F0791E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        Habilitations Administratives & Périmètre
                      </h3>
                      <span class="px-2 py-0.5 bg-blue-50 text-[#1C75BC] border border-blue-200 rounded text-xs font-bold">
                        Staff Administratif
                      </span>
                    </div>

                    <div class="p-3 bg-gray-50 border border-gray-200 rounded-[2px] space-y-2">
                      <div class="flex justify-between">
                        <span class="text-gray-500">Périmètre d'autorité :</span>
                        <span class="font-bold text-[#1B1D1F]">{{ dossierSelectionne.role === 'ADMIN_CENTRE' ? 'National (Tous les campus & antennes)' : (dossierSelectionne.etablissement?.nom || 'Antenne Locale') }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-500">Droits d'admission :</span>
                        <span class="font-bold text-emerald-700">Traitement & validation des candidatures</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-500">Émargement & Assiduité :</span>
                        <span class="font-bold text-emerald-700">Supervision des feuilles de présence</span>
                      </div>
                    </div>
                  </div>
                } <!-- end @if admin role -->

                } <!-- end @if ongletDossier === 'IDENTITE' -->

                <!-- ================================================================ -->
                <!-- ONGLET: DOCUMENTS DOSSIER                                        -->
                <!-- ================================================================ -->
                @if (ongletDossier === 'DOCUMENTS') {
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="font-bold text-sm text-[#124F80] flex items-center gap-2">
                          <svg class="w-4 h-4 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                          </svg>
                          Documents du Dossier Personnel
                        </h3>
                        <p class="text-[11px] text-gray-500 mt-0.5">Pièces administratives, contrats, diplômes et tout document officiel rattaché à ce profil.</p>
                      </div>
                      <button type="button"
                        (click)="ouvrirModalAjoutDocument()"
                        class="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-[2px] bg-[#1C75BC] text-white hover:bg-[#124F80] cursor-pointer"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        Ajouter un Document
                      </button>
                    </div>

                    @if (loadingDocuments) {
                      <div class="flex items-center justify-center py-8 gap-2 text-gray-400">
                        <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Chargement des documents...
                      </div>
                    } @else if (documentsDossier.length === 0) {
                      <div class="text-center py-10 border-2 border-dashed border-gray-200 rounded-[2px] bg-gray-50">
                        <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p class="font-semibold text-gray-700">Aucun document dans le dossier</p>
                        <p class="text-gray-400 text-[11px] mt-1">Ajoutez des pièces administratives, contrats, ou tout autre document officiel.</p>
                      </div>
                    } @else {
                      <div class="space-y-2">
                        @for (doc of documentsDossier; track doc.id) {
                          <div class="p-3 bg-white border border-[#D7DBDE] rounded-[2px] flex items-center justify-between hover:border-[#1C75BC]/40 transition-colors">
                            <div class="flex items-start gap-3">
                              <div class="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1C75BC] shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                              </div>
                              <div>
                                <div class="font-semibold text-[#1B1D1F]">{{ doc.titre }}</div>
                                <div class="text-[10px] text-gray-500">{{ doc.typeDocument }} · {{ doc.nomFichier }}</div>
                                @if (doc.commentaire) {
                                  <div class="text-[10px] text-gray-400 italic mt-0.5">{{ doc.commentaire }}</div>
                                }
                                <div class="text-[10px] text-gray-400 mt-0.5">Ajouté le {{ doc.createdAt | date:'dd/MM/yyyy' }} par {{ doc.ajoutePar?.prenom }} {{ doc.ajoutePar?.nom }}</div>
                              </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                              <span class="px-2 py-0.5 rounded text-[10px] font-bold border"
                                [ngClass]="doc.statut === 'VALIDE' ? 'bg-green-50 text-green-700 border-green-200' : doc.statut === 'EN_ATTENTE_VALIDATION' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-600 border-gray-200'"
                              >{{ doc.statut }}</span>
                              <button type="button" (click)="supprimerDocument(doc.id)" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer" title="Supprimer">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                } <!-- end onglet DOCUMENTS -->

                <!-- ================================================================ -->
                <!-- ONGLET: RÉGULARISATIONS                                          -->
                <!-- ================================================================ -->
                @if (ongletDossier === 'REGULARISATIONS') {
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div>
                        <h3 class="font-bold text-sm text-[#124F80] flex items-center gap-2">
                          <svg class="w-4 h-4 text-[#F0791E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                          </svg>
                          Demandes de Régularisation
                        </h3>
                        <p class="text-[11px] text-gray-500 mt-0.5">Injonctions administratives émises pour ce profil avec délai de réponse impératif.</p>
                      </div>
                      <button type="button"
                        (click)="ouvrirModalRegularisation()"
                        class="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-[2px] bg-[#F0791E] text-white hover:bg-[#d96714] cursor-pointer shadow-sm"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                        Exiger une Régularisation
                      </button>
                    </div>

                    @if (loadingRegularisations) {
                      <div class="flex items-center justify-center py-8 gap-2 text-gray-400">
                        <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Chargement...
                      </div>
                    } @else if (regularisations.length === 0) {
                      <div class="text-center py-10 border-2 border-dashed border-emerald-200 rounded-[2px] bg-emerald-50/40">
                        <svg class="w-10 h-10 mx-auto mb-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p class="font-semibold text-emerald-800">Aucune demande de régularisation</p>
                        <p class="text-gray-400 text-[11px] mt-1">Le dossier est conforme. Aucune action requise.</p>
                      </div>
                    } @else {
                      <div class="space-y-3">
                        @for (reg of regularisations; track reg.id) {
                          <div class="p-4 border rounded-[2px]" [ngClass]="reg.statut === 'EN_ATTENTE' ? 'border-amber-300 bg-amber-50/60' : 'border-[#D7DBDE] bg-white'">
                            <div class="flex items-start justify-between gap-3">
                              <div class="flex-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                  <span class="font-bold text-[#1B1D1F]">{{ reg.motif }}</span>
                                  <span class="px-2 py-0.5 rounded text-[10px] font-bold border" [ngClass]="getStatutRegularisationClass(reg.statut)">{{ getStatutRegularisationLabel(reg.statut) }}</span>
                                </div>
                                <p class="text-gray-600 mt-1">{{ reg.description }}</p>
                                @if (reg.piecesDemandees?.length) {
                                  <div class="mt-2">
                                    <span class="font-semibold text-[10px] text-gray-500 uppercase">Pièces demandées :</span>
                                    <ul class="mt-1 space-y-0.5">
                                      @for (piece of reg.piecesDemandees; track piece) {
                                        <li class="flex items-center gap-1 text-[10px] text-gray-700"><span class="text-[#F0791E] font-bold">•</span> {{ piece }}</li>
                                      }
                                    </ul>
                                  </div>
                                }
                                <div class="mt-2 flex items-center gap-4 text-[10px] text-gray-400">
                                  <span class="inline-flex items-center gap-1">
                                    <svg class="w-3 h-3 text-[#ED1C24]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    Date limite : <strong class="text-[#ED1C24]">{{ reg.dateLimite | date:'dd/MM/yyyy' }}</strong>
                                  </span>
                                  <span>Par : {{ reg.auteur?.prenom }} {{ reg.auteur?.nom }}</span>
                                  <span>Créé le : {{ reg.createdAt | date:'dd/MM/yyyy' }}</span>
                                </div>
                                @if (reg.decisionCommentaire) {
                                  <div class="mt-2 p-2 bg-gray-100 rounded text-[10px] text-gray-600 italic flex items-start gap-1.5">
                                    <svg class="w-3.5 h-3.5 text-[#4B5157] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                    </svg>
                                    <span>{{ reg.decisionCommentaire }}</span>
                                  </div>
                                }
                              </div>
                              @if (reg.statut === 'EN_ATTENTE') {
                                <button type="button"
                                  (click)="ouvrirModalDecision(reg)"
                                  class="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-[2px] bg-[#1C75BC] text-white hover:bg-[#124F80] cursor-pointer"
                                >
                                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                  </svg>
                                  Statuer
                                </button>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                } <!-- end onglet REGULARISATIONS -->

                </div> <!-- end p-6 space-y-6 -->
              </div> <!-- end flex-1 overflow-y-auto -->

              <!-- Footer Dossier -->
              <div class="p-4 border-t border-[#D7DBDE] bg-gray-50 flex items-center justify-between">
                <button
                  type="button"
                  (click)="ouvrirModalEdition(dossierSelectionne)"
                  class="btn btn-secondary text-xs py-2 px-4 font-semibold inline-flex items-center gap-2 bg-white border border-[#D7DBDE] hover:bg-gray-100 text-[#1B1D1F] cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Modifier Habilitations
                </button>
                <button
                  type="button"
                  (click)="fermerDossier()"
                  class="btn btn-primary text-xs py-2 px-4 font-semibold bg-[#1C75BC] hover:bg-[#124F80] text-white cursor-pointer"
                >
                  Fermer la Fiche
                </button>
              </div>

            </div>
          </div>
        }

        <!-- ========================================================================= -->
        <!-- MODAL : RÉINITIALISATION ADMINISTRATIVE DU MOT DE PASSE                   -->
        <!-- ========================================================================= -->
        @if (modalResetPasswordOuvert && userToReset) {
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white max-w-md w-full rounded-[2px] shadow-2xl p-6 border border-[#D7DBDE] animate-scale-up">
              <div class="flex items-center justify-between border-b border-[#D7DBDE] pb-3 mb-4">
                <h3 class="text-base font-bold text-[#1B1D1F] flex items-center gap-2">
                  <svg class="w-5 h-5 text-[#F0791E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                  </svg>
                  Réinitialiser l'Accès
                </h3>
                <button (click)="fermerModalResetPassword()" class="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">✕</button>
              </div>

              <div class="text-xs text-[#4B5157] space-y-3">
                <p>
                  Vous allez réinitialiser le mot de passe du compte de <strong class="text-[#1B1D1F]">{{ userToReset.prenom }} {{ userToReset.nom }}</strong> (<span class="font-mono">{{ userToReset.email }}</span>).
                </p>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Nouveau mot de passe temporaire</label>
                  <input
                    type="text"
                    [(ngModel)]="nouveauMotDePasse"
                    placeholder="Laisser vide pour générer 'Vitalis2026!'"
                    class="w-full text-xs p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] font-mono"
                  />
                  <p class="text-[10px] text-gray-400 mt-1">Si laissé vide, le mot de passe par défaut <strong>Vitalis2026!</strong> sera attribué.</p>
                </div>

                @if (motDePasseReinitialiseResult) {
                  <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-[2px] text-emerald-800 space-y-1">
                    <div class="font-bold inline-flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Mot de passe mis à jour !
                    </div>
                    <div class="text-xs">Mot de passe temporaire à communiquer à l'utilisateur :</div>
                    <div class="p-2 bg-white rounded border border-emerald-300 font-mono font-bold text-center text-sm select-all text-[#1B1D1F]">
                      {{ motDePasseReinitialiseResult }}
                    </div>
                  </div>
                }
              </div>

              <div class="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#D7DBDE]">
                <button
                  type="button"
                  (click)="fermerModalResetPassword()"
                  class="btn btn-ghost text-xs py-2 px-3 text-gray-600 cursor-pointer"
                >
                  {{ motDePasseReinitialiseResult ? 'Fermer' : 'Annuler' }}
                </button>
                @if (!motDePasseReinitialiseResult) {
                  <button
                    type="button"
                    (click)="confirmerResetPassword()"
                    [disabled]="submittingReset"
                    class="btn btn-primary text-xs py-2 px-4 font-semibold bg-[#F0791E] hover:bg-[#d96714] text-white cursor-pointer"
                  >
                    {{ submittingReset ? 'Réinitialisation...' : 'Confirmer la Réinitialisation' }}
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- ========================================================================= -->
        <!-- MODAL : ÉDITION DES HABILITATIONS & PROFIL                                 -->
        <!-- ========================================================================= -->
        @if (modalEditionOuvert && editingUser) {
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white max-w-lg w-full rounded-[2px] shadow-2xl p-6 border border-[#D7DBDE] animate-scale-up">
              <div class="flex items-center justify-between border-b border-[#D7DBDE] pb-3 mb-4">
                <h3 class="text-base font-bold text-[#1B1D1F] flex items-center gap-2">
                  <svg class="w-5 h-5 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Modifier Habilitations : {{ editingUser.prenom }} {{ editingUser.nom }}
                </h3>
                <button (click)="fermerModalEdition()" class="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">✕</button>
              </div>

              <form (ngSubmit)="soumettreModification()" class="space-y-4 text-xs">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Nom *</label>
                    <input
                      type="text"
                      [(ngModel)]="formulaireEdition.nom"
                      name="nom"
                      required
                      class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC]"
                    />
                  </div>
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Prénom *</label>
                    <input
                      type="text"
                      [(ngModel)]="formulaireEdition.prenom"
                      name="prenom"
                      required
                      class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC]"
                    />
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Rôle Métier & Privilèges RBAC *</label>
                  <select
                    [(ngModel)]="formulaireEdition.role"
                    name="role"
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
                  >
                    <optgroup label="Personnel Administratif">
                      <option value="ADMIN_CENTRE">Administrateur Central (Direction Nationale)</option>
                      <option value="ADMIN_ETABLISSEMENT">Directeur d'Antenne Territoriale</option>
                      <option value="PERSONNEL_ADMINISTRATIF">Personnel Administratif & Scolarité</option>
                    </optgroup>
                    <optgroup label="Personnel Technique & Enseignants">
                      <option value="FORMATEUR">Formateur / Encadreur Technique</option>
                    </optgroup>
                    <optgroup label="Apprenants">
                      <option value="APPRENANT">Apprenant / Stagiaire</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Établissement / Antenne de rattachement *</label>
                  <select
                    [(ngModel)]="formulaireEdition.etablissementId"
                    name="etablissementId"
                    required
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
                  >
                    @for (e of etablissements; track e.id) {
                      <option [value]="e.id">{{ e.nom }} ({{ e.codeAntenne || 'SANS-CODE' }})</option>
                    }
                  </select>
                </div>

                <div class="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#D7DBDE]">
                  <button
                    type="button"
                    (click)="fermerModalEdition()"
                    class="btn btn-ghost text-xs py-2 px-3 text-gray-600 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    [disabled]="submittingEdition"
                    class="btn btn-primary text-xs py-2 px-4 font-semibold bg-[#1C75BC] hover:bg-[#124F80] text-white cursor-pointer"
                  >
                    {{ submittingEdition ? 'Mise à jour...' : 'Sauvegarder les Droits' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- ========================================================================= -->
        <!-- MODAL : NOUVEL ENRÔLEMENT CONTEXTUEL                                      -->
        <!-- ========================================================================= -->
        @if (modalOuvert) {
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white max-w-lg w-full rounded-[2px] shadow-2xl p-6 border border-[#D7DBDE] animate-scale-up">
              <div class="flex items-center justify-between border-b border-[#D7DBDE] pb-3 mb-4">
                <h3 class="text-base font-bold text-[#1B1D1F] flex items-center gap-2">
                  <svg class="w-5 h-5 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                  {{ getTitreEnrolementModal() }}
                </h3>
                <button (click)="fermerModalEnrolement()" class="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">✕</button>
              </div>

              <form (ngSubmit)="soumettreEnrolement()" class="space-y-4 text-xs">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Nom *</label>
                    <input
                      type="text"
                      [(ngModel)]="formulaire.nom"
                      name="nom"
                      required
                      placeholder="Ex: Dupont"
                      class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC]"
                    />
                  </div>
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Prénom *</label>
                    <input
                      type="text"
                      [(ngModel)]="formulaire.prenom"
                      name="prenom"
                      required
                      placeholder="Ex: Jean"
                      class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC]"
                    />
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Email Professionnel / Académique *</label>
                  <input
                    type="email"
                    [(ngModel)]="formulaire.email"
                    name="email"
                    required
                    placeholder="jean.dupont@vitalis-center.cd"
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC]"
                  />
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Mot de passe temporaire * (Min. 12 caractères)</label>
                  <input
                    type="password"
                    [(ngModel)]="formulaire.password"
                    name="password"
                    required
                    placeholder="••••••••••••"
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC]"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Rôle Attribué *</label>
                    <select
                      [(ngModel)]="formulaire.role"
                      name="role"
                      class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
                    >
                      <option value="ADMIN_ETABLISSEMENT">Directeur d'Antenne</option>
                      <option value="PERSONNEL_ADMINISTRATIF">Personnel Administratif</option>
                      <option value="FORMATEUR">Formateur / Technique</option>
                      <option value="APPRENANT">Apprenant</option>
                    </select>
                  </div>
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Établissement de rattachement *</label>
                    <select
                      [(ngModel)]="formulaire.etablissementId"
                      name="etablissementId"
                      required
                      class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer"
                    >
                      @for (e of etablissements; track e.id) {
                        <option [value]="e.id">{{ e.nom }}</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#D7DBDE]">
                  <button
                    type="button"
                    (click)="fermerModalEnrolement()"
                    class="btn btn-ghost text-xs py-2 px-3 text-gray-600 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    [disabled]="submitting"
                    class="btn btn-primary text-xs py-2 px-4 font-semibold bg-[#1C75BC] hover:bg-[#124F80] text-white cursor-pointer"
                  >
                    {{ submitting ? 'Enrôlement...' : 'Valider l’Enrôlement' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- ========================================================================= -->
        <!-- MODAL : AJOUTER UN DOCUMENT AU DOSSIER                                    -->
        <!-- ========================================================================= -->
        @if (modalAjoutDocumentOuvert && dossierSelectionne) {
          <div class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white max-w-md w-full rounded-[2px] shadow-2xl border border-[#D7DBDE] animate-scale-up">
              <div class="flex items-center justify-between border-b border-[#D7DBDE] px-5 py-4">
                <h3 class="text-sm font-bold text-[#1B1D1F] flex items-center gap-2">
                  <svg class="w-4 h-4 text-[#1C75BC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Ajouter un Document au Dossier
                  <span class="text-xs font-normal text-gray-500">— {{ dossierSelectionne.prenom }} {{ dossierSelectionne.nom }}</span>
                </h3>
                <button (click)="fermerModalAjoutDocument()" class="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
              </div>

              <form class="p-5 space-y-4 text-xs" (ngSubmit)="soumettreAjoutDocument()">
                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Titre du document *</label>
                  <input type="text" [(ngModel)]="ajoutDocumentTitre" name="titre" required
                    placeholder="Ex: Contrat de travail 2026, Diplôme BAC+2..."
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC]"/>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Type de document *</label>
                  <select [(ngModel)]="ajoutDocumentType" name="typeDocument"
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer">
                    <option value="CONTRAT">Contrat de travail</option>
                    <option value="DIPLOME">Diplôme / Attestation</option>
                    <option value="CNI">Carte Nationale d'Identité</option>
                    <option value="PASSEPORT">Passeport</option>
                    <option value="CASIER">Casier judiciaire</option>
                    <option value="PHOTO">Photo d'identité</option>
                    <option value="CURRICULUM_VITAE">Curriculum Vitae</option>
                    <option value="LETTRE_MISSION">Lettre de mission</option>
                    <option value="AUTRE">Autre document</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Fichier *</label>
                  <input type="file" (change)="onFichierDocumentChange($event)" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    class="w-full p-2 border border-[#D7DBDE] rounded-[2px] text-xs bg-gray-50 cursor-pointer"/>
                  <p class="text-[10px] text-gray-400 mt-1">PDF, image (JPG/PNG) ou document Word. Max 10 Mo.</p>
                  @if (ajoutDocumentFichier) {
                    <div class="mt-1 text-[10px] text-[#1C75BC] font-medium inline-flex items-center gap-1">
                      <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      {{ ajoutDocumentFichier.name }}
                    </div>
                  }
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Commentaire (optionnel)</label>
                  <textarea [(ngModel)]="ajoutDocumentCommentaire" name="commentaire" rows="2"
                    placeholder="Remarque ou précision sur ce document..."
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] resize-none"></textarea>
                </div>

                <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#D7DBDE]">
                  <button type="button" (click)="fermerModalAjoutDocument()"
                    class="btn btn-ghost text-xs py-2 px-3 text-gray-600 cursor-pointer">Annuler</button>
                  <button type="submit" [disabled]="submittingDocument"
                    class="btn btn-primary text-xs py-2 px-4 font-semibold bg-[#1C75BC] hover:bg-[#124F80] text-white cursor-pointer inline-flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    {{ submittingDocument ? 'Enregistrement...' : 'Enregistrer le Document' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- ========================================================================= -->
        <!-- MODAL : DEMANDE DE RÉGULARISATION (INJONCTION ADMINISTRATIVE)              -->
        <!-- ========================================================================= -->
        @if (modalRegularisationOuvert && dossierSelectionne) {
          <div class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white max-w-lg w-full rounded-[2px] shadow-2xl border border-amber-200 animate-scale-up">
              <div class="flex items-center justify-between border-b px-5 py-4 bg-amber-50">
                <h3 class="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <svg class="w-4 h-4 text-[#F0791E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                  </svg>
                  Demande de Régularisation — Injonction Officielle
                  <span class="text-xs font-normal text-amber-700">— {{ dossierSelectionne.prenom }} {{ dossierSelectionne.nom }}</span>
                </h3>
                <button (click)="fermerModalRegularisation()" class="text-amber-600 hover:text-amber-800 cursor-pointer">✕</button>
              </div>

              <div class="px-5 py-3 bg-amber-50/50 border-b border-amber-100 text-[11px] text-amber-800 flex items-start gap-2">
                <svg class="w-4 h-4 text-[#F0791E] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span><strong>Information :</strong> Cette demande sera immédiatement notifiée à l'utilisateur via son tableau de bord. Il devra soumettre les pièces manquantes avant la date limite indiquée.</span>
              </div>

              <form class="p-5 space-y-4 text-xs" (ngSubmit)="soumettreDemandeRegularisation()">
                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Motif de régularisation *</label>
                  <input type="text" [(ngModel)]="demandeRegularisation.motif" name="motif" required
                    placeholder="Ex: Dossier incomplet – pièce d'identité manquante"
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#F0791E]"/>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Description détaillée *</label>
                  <textarea [(ngModel)]="demandeRegularisation.description" name="description" rows="3" required
                    placeholder="Expliquer précisément ce qui est demandé, pourquoi et quelles sont les conséquences si non régularisé..."
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#F0791E] resize-none"></textarea>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Date limite impérative *</label>
                  <input type="date" [(ngModel)]="demandeRegularisation.dateLimite" name="dateLimite" required
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#F0791E]"/>
                  <p class="text-[10px] text-gray-400 mt-1">L'utilisateur sera notifié en urgence si la date approche.</p>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Pièces demandées (optionnel)</label>
                  <div class="flex gap-2">
                    <input type="text" [(ngModel)]="nouvellePiece" name="nouvellePiece"
                      placeholder="Ex: Copie de CNI certifiée..."
                      class="flex-1 p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#F0791E]"/>
                    <button type="button" (click)="ajouterPieceDemandee()"
                      class="px-3 py-2 bg-[#F0791E] text-white rounded-[2px] hover:bg-[#d96714] cursor-pointer font-bold">+</button>
                  </div>
                  @if (demandeRegularisation.piecesDemandees.length > 0) {
                    <ul class="mt-2 space-y-1">
                      @for (piece of demandeRegularisation.piecesDemandees; track $index) {
                        <li class="flex items-center justify-between bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                          <span>{{ piece }}</span>
                          <button type="button" (click)="retirerPieceDemandee($index)" class="text-red-400 hover:text-red-600 cursor-pointer text-[11px]">✕</button>
                        </li>
                      }
                    </ul>
                  }
                </div>

                <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#D7DBDE]">
                  <button type="button" (click)="fermerModalRegularisation()"
                    class="btn btn-ghost text-xs py-2 px-3 text-gray-600 cursor-pointer">Annuler</button>
                  <button type="submit" [disabled]="submittingRegularisation"
                    class="btn btn-primary text-xs py-2 px-4 font-semibold bg-[#F0791E] hover:bg-[#d96714] text-white cursor-pointer inline-flex items-center gap-1.5 shadow-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                    {{ submittingRegularisation ? 'Envoi...' : 'Émettre l\'Injonction' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- ========================================================================= -->
        <!-- MODAL : DÉCISION SUR UNE DEMANDE DE RÉGULARISATION                        -->
        <!-- ========================================================================= -->
        @if (modalDecisionRegularisationOuvert && demandeSelectionnee) {
          <div class="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white max-w-md w-full rounded-[2px] shadow-2xl border border-[#D7DBDE] animate-scale-up">
              <div class="flex items-center justify-between border-b border-[#D7DBDE] px-5 py-4">
                <h3 class="text-sm font-bold text-[#1B1D1F] flex items-center gap-2">
                  <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Statuer sur la Régularisation
                </h3>
                <button (click)="fermerModalDecision()" class="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
              </div>

              <div class="p-5 space-y-4 text-xs">
                <div class="p-3 bg-gray-50 border border-gray-200 rounded-[2px]">
                  <div class="font-semibold text-[#1B1D1F]">{{ demandeSelectionnee.motif }}</div>
                  <div class="text-gray-500 mt-1">{{ demandeSelectionnee.description }}</div>
                  <div class="text-[10px] text-red-600 font-medium mt-2 inline-flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Date limite : {{ demandeSelectionnee.dateLimite | date:'dd/MM/yyyy' }}
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-2">Décision *</label>
                  <div class="space-y-2">
                    <label class="flex items-center gap-3 p-2.5 border rounded-[2px] cursor-pointer hover:bg-green-50 transition-colors"
                      [ngClass]="decisionRegularisation.statut === 'REGULARISE' ? 'border-green-400 bg-green-50' : 'border-gray-200'">
                      <input type="radio" [(ngModel)]="decisionRegularisation.statut" value="REGULARISE" name="statutDecision" class="cursor-pointer"/>
                      <div>
                        <div class="font-semibold text-green-700 inline-flex items-center gap-1">
                          <svg class="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                          Valider — Dossier conforme
                        </div>
                        <div class="text-[10px] text-gray-400">Le dossier est complet et conforme aux exigences.</div>
                      </div>
                    </label>
                    <label class="flex items-center gap-3 p-2.5 border rounded-[2px] cursor-pointer hover:bg-gray-50 transition-colors"
                      [ngClass]="decisionRegularisation.statut === 'CLOTURE' ? 'border-gray-400 bg-gray-50' : 'border-gray-200'">
                      <input type="radio" [(ngModel)]="decisionRegularisation.statut" value="CLOTURE" name="statutDecision" class="cursor-pointer"/>
                      <div>
                        <div class="font-semibold text-gray-700 inline-flex items-center gap-1">
                          <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                          Clôturer
                        </div>
                        <div class="text-[10px] text-gray-400">Clôturer la demande sans validation complète.</div>
                      </div>
                    </label>
                    <label class="flex items-center gap-3 p-2.5 border rounded-[2px] cursor-pointer hover:bg-red-50 transition-colors"
                      [ngClass]="decisionRegularisation.statut === 'REJETE' ? 'border-red-400 bg-red-50' : 'border-gray-200'">
                      <input type="radio" [(ngModel)]="decisionRegularisation.statut" value="REJETE" name="statutDecision" class="cursor-pointer"/>
                      <div>
                        <div class="font-semibold text-red-700 inline-flex items-center gap-1">
                          <svg class="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          Rejeter
                        </div>
                        <div class="text-[10px] text-gray-400">Les documents fournis sont insuffisants ou invalides.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label class="block font-semibold text-[#1B1D1F] mb-1">Commentaire (optionnel)</label>
                  <textarea [(ngModel)]="decisionRegularisation.commentaire" name="decisionCommentaire" rows="2"
                    placeholder="Motiver votre décision..."
                    class="w-full p-2.5 border border-[#D7DBDE] rounded-[2px] focus:outline-none focus:border-[#1C75BC] resize-none"></textarea>
                </div>

                <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#D7DBDE]">
                  <button type="button" (click)="fermerModalDecision()"
                    class="btn btn-ghost text-xs py-2 px-3 text-gray-600 cursor-pointer">Annuler</button>
                  <button type="submit" [disabled]="submittingDecision"
                    class="btn btn-primary text-xs py-2 px-4 font-semibold bg-[#1C75BC] hover:bg-[#124F80] text-white cursor-pointer inline-flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    {{ submittingDecision ? 'Enregistrement...' : 'Enregistrer la Décision' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

      </div>
    </app-main-layout>
  `,
})
export class UtilisateursComponent implements OnInit, OnDestroy {
  utilisateurs: Utilisateur[] = [];
  etablissements: Etablissement[] = [];
  loading = false;
  refreshing = false;
  submitting = false;
  submittingEdition = false;
  submittingReset = false;
  actionEnCours: string | null = null;
  
  // Navigation sous-modules
  ongletActif: SousModuleType = 'ADMINISTRATIF';

  // Filtres
  recherche = '';
  filtreEtablissement = '';
  filtreStatut = '';

  // Dossier sélectionné
  dossierSelectionne: any | null = null;

  // Modal Enrôlement
  modalOuvert = false;
  formulaire = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'PERSONNEL_ADMINISTRATIF',
    etablissementId: '',
  };

  // Modal Édition
  modalEditionOuvert = false;
  editingUser: Utilisateur | null = null;
  formulaireEdition = {
    nom: '',
    prenom: '',
    role: 'PERSONNEL_ADMINISTRATIF',
    etablissementId: '',
  };

  // Modal Reset Password
  modalResetPasswordOuvert = false;
  userToReset: Utilisateur | null = null;
  nouveauMotDePasse = '';
  motDePasseReinitialiseResult = '';

  // ─── Dossier Documents ────────────────────────────────────────────────────────
  documentsDossier: any[] = [];
  loadingDocuments = false;
  modalAjoutDocumentOuvert = false;
  ajoutDocumentFichier: File | null = null;
  ajoutDocumentTitre = '';
  ajoutDocumentType = 'CONTRAT';
  ajoutDocumentCommentaire = '';
  submittingDocument = false;

  // ─── Demandes de Régularisation ───────────────────────────────────────────────
  regularisations: any[] = [];
  loadingRegularisations = false;
  modalRegularisationOuvert = false;
  demandeRegularisation = {
    motif: '',
    description: '',
    piecesDemandees: [] as string[],
    dateLimite: '',
  };
  nouvellePiece = '';
  submittingRegularisation = false;
  modalDecisionRegularisationOuvert = false;
  demandeSelectionnee: any | null = null;
  decisionRegularisation = { statut: 'REGULARISE', commentaire: '' };
  submittingDecision = false;
  ongletDossier: 'IDENTITE' | 'SECURITE' | 'DOCUMENTS' | 'REGULARISATIONS' = 'IDENTITE';

  private streamUsersSub?: Subscription;
  private streamEtabsSub?: Subscription;
  private sseSub?: Subscription;

  constructor(
    private service: UtilisateursService,
    private etablissementsService: EtablissementsService,
    private toast: ToastService,
    private notifications: NotificationsService
  ) {}

  ngOnInit() {
    const cachedUsers = this.service.getCached();
    if (cachedUsers && cachedUsers.length > 0) {
      this.utilisateurs = [...cachedUsers];
      this.loading = false;
    } else {
      this.loading = true;
    }

    const cachedEtabs = this.etablissementsService.getCached();
    if (cachedEtabs && cachedEtabs.length > 0) {
      this.etablissements = [...cachedEtabs];
      if (!this.formulaire.etablissementId) {
        this.formulaire.etablissementId = cachedEtabs[0].id;
      }
    }

    // Flux réactifs continus (0ms)
    this.streamUsersSub = this.service.utilisateurs$.subscribe((list) => {
      if (list) {
        this.utilisateurs = list;
        this.loading = false;
        this.refreshing = false;
      }
    });

    this.streamEtabsSub = this.etablissementsService.etablissements$.subscribe((list) => {
      if (list && list.length > 0) {
        this.etablissements = list;
        if (!this.formulaire.etablissementId) {
          this.formulaire.etablissementId = list[0].id;
        }
      }
    });

    // Écoute temps réel SSE pour synchronisation instantanée des dossiers et utilisateurs
    this.sseSub = this.notifications.messages().subscribe({
      next: (msg: NotificationPayload) => {
        if (!msg || typeof msg !== 'object') return;

        // 1. Événements Dossiers & Documents
        if (
          msg.type === 'DOSSIER_DOCUMENT_AJOUTE' ||
          msg.type === 'DOSSIER_DOCUMENT_SUPPRIME' ||
          msg.type === 'DOCUMENT_REGULARISATION_SOUMIS'
        ) {
          const targetId = msg.recipientUserId || msg.data?.['userId'];
          if (this.dossierSelectionne && targetId && this.dossierSelectionne.id === targetId) {
            this.chargerDocuments(targetId);
            this.service.getDossier(targetId).subscribe({
              next: (d) => { this.dossierSelectionne = d; }
            });
            this.toast.info(`⚡ Dossier mis à jour en direct : ${msg.message || msg.title}`);
          }
        }

        // 2. Événements de Régularisation
        if (
          msg.type === 'DEMANDE_REGULARISATION' ||
          msg.type === 'REGULARISATION_DECISION' ||
          msg.type === 'DOCUMENT_REGULARISATION_SOUMIS'
        ) {
          const targetId = msg.recipientUserId || msg.data?.['userId'];
          if (this.dossierSelectionne && targetId && this.dossierSelectionne.id === targetId) {
            this.chargerRegularisations(targetId);
            if (msg.type === 'DOCUMENT_REGULARISATION_SOUMIS') {
              this.toast.info(`📥 Nouvelle pièce justificative transmise par l'utilisateur.`);
            }
          }
        }

        // 3. Cycle de vie utilisateur (enrôlement, rôles, activation, etc.)
        if (
          msg.type === 'UTILISATEUR_UPDATE' ||
          msg.type === 'UTILISATEUR_ENROLE' ||
          msg.type === 'auth'
        ) {
          this.service.getAll(true).subscribe();
          if (msg.type === 'UTILISATEUR_ENROLE') {
            this.toast.info(`👤 ${msg.message || 'Nouvel utilisateur enrôlé.'}`);
          }
        }
      },
    });

    this.chargerDonnees(false);
    this.chargerEtablissements();
  }

  ngOnDestroy() {
    this.streamUsersSub?.unsubscribe();
    this.streamEtabsSub?.unsubscribe();
    this.sseSub?.unsubscribe();
  }

  chargerDonnees(forceRefresh = false) {
    if (this.utilisateurs.length === 0) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }

    this.service.getAll(forceRefresh).subscribe({
      next: (d) => {
        this.utilisateurs = d;
        this.loading = false;
        this.refreshing = false;
      },
      error: () => {
        if (this.utilisateurs.length === 0) {
          this.toast.error('Erreur lors du chargement des utilisateurs');
        }
        this.loading = false;
        this.refreshing = false;
      },
    });
  }

  chargerEtablissements() {
    this.etablissementsService.getAll().subscribe({
      next: (etabs) => {
        this.etablissements = etabs;
        if (etabs.length > 0 && !this.formulaire.etablissementId) {
          this.formulaire.etablissementId = etabs[0].id;
        }
      },
    });
  }

  changerSousModule(onglet: SousModuleType) {
    this.ongletActif = onglet;
    this.recherche = '';
    this.filtreStatut = '';
  }

  getTitreSousModule(): string {
    switch (this.ongletActif) {
      case 'ADMINISTRATIF': return 'Personnel Administratif & Direction';
      case 'TECHNIQUE': return 'Personnel Technique & Formateurs';
      case 'APPRENANTS': return 'Apprenants & Stagiaires';
      case 'SECURITE': return 'Gouvernance & Droits d’Accès (RBAC)';
    }
  }

  getLabelEnrolement(): string {
    switch (this.ongletActif) {
      case 'ADMINISTRATIF': return 'Enrôler un Administratif';
      case 'TECHNIQUE': return 'Enrôler un Formateur';
      case 'APPRENANTS': return 'Inscrire un Apprenant';
      default: return 'Enrôler un Utilisateur';
    }
  }

  getTitreEnrolementModal(): string {
    switch (this.ongletActif) {
      case 'ADMINISTRATIF': return 'Enrôlement d’un Cadre ou Agent Administratif';
      case 'TECHNIQUE': return 'Enrôlement d’un Formateur / Encadreur';
      case 'APPRENANTS': return 'Enrôlement d’un Apprenant';
      default: return 'Enrôlement d’un Nouvel Utilisateur';
    }
  }

  // Filtrage intelligent par sous-module
  get utilisateursFiltres(): Utilisateur[] {
    return this.utilisateurs.filter((u) => {
      // 1. Filtrage par Sous-Module
      if (this.ongletActif === 'ADMINISTRATIF') {
        const estAdmin = u.role === 'ADMIN_CENTRE' || u.role === 'ADMIN_ETABLISSEMENT' || u.role === 'PERSONNEL_ADMINISTRATIF';
        if (!estAdmin) return false;
      } else if (this.ongletActif === 'TECHNIQUE') {
        if (u.role !== 'FORMATEUR') return false;
      } else if (this.ongletActif === 'APPRENANTS') {
        if (u.role !== 'APPRENANT') return false;
      }

      // 2. Recherche textuelle
      if (this.recherche.trim()) {
        const query = this.recherche.toLowerCase().trim();
        const matchNom = u.nom?.toLowerCase().includes(query);
        const matchPrenom = u.prenom?.toLowerCase().includes(query);
        const matchEmail = u.email?.toLowerCase().includes(query);
        if (!matchNom && !matchPrenom && !matchEmail) return false;
      }

      // 3. Établissement
      if (this.filtreEtablissement && u.etablissementId !== this.filtreEtablissement) {
        return false;
      }

      // 4. Statut
      if (this.filtreStatut === 'actif' && u.actif === false) return false;
      if (this.filtreStatut === 'inactif' && u.actif !== false) return false;

      return true;
    });
  }

  // Calculs de compteurs
  countAdministratifs(): number {
    return this.utilisateurs.filter((u) => 
      u.role === 'ADMIN_CENTRE' || u.role === 'ADMIN_ETABLISSEMENT' || u.role === 'PERSONNEL_ADMINISTRATIF'
    ).length;
  }

  countTechniques(): number {
    return this.utilisateurs.filter((u) => u.role === 'FORMATEUR').length;
  }

  countTechniquesActifs(): number {
    return this.utilisateurs.filter((u) => u.role === 'FORMATEUR' && u.actif !== false).length;
  }

  countApprenants(): number {
    return this.utilisateurs.filter((u) => u.role === 'APPRENANT').length;
  }

  countApprenantsActifs(): number {
    return this.utilisateurs.filter((u) => u.role === 'APPRENANT' && u.actif !== false).length;
  }

  countTotalActifs(): number {
    return this.utilisateurs.filter((u) => u.actif !== false).length;
  }

  countRole(role: string): number {
    return this.utilisateurs.filter((u) => u.role === role).length;
  }

  countEtablissementsAvecFormateurs(): number {
    const etabs = new Set(this.utilisateurs.filter((u) => u.role === 'FORMATEUR' && u.etablissementId).map((u) => u.etablissementId));
    return etabs.size;
  }

  getTauxActivationApprenants(): number {
    const total = this.countApprenants();
    if (!total) return 100;
    return Math.round((this.countApprenantsActifs() / total) * 100);
  }

  getNomEtablissement(id?: string): string {
    if (!id) return 'Siège National Vitalis Center';
    const e = this.etablissements.find((item) => item.id === id);
    return e?.nom || 'Antenne Locale';
  }

  formatRole(role: string): string {
    const map: Record<string, string> = {
      ADMIN_CENTRE: 'Admin Central',
      ADMIN_ETABLISSEMENT: 'Directeur d’Antenne',
      FORMATEUR: 'Formateur / Technique',
      PERSONNEL_ADMINISTRATIF: 'Personnel Administratif',
      APPRENANT: 'Apprenant / Stagiaire',
    };
    return map[role] || role;
  }

  getBadgeRoleClass(role: string): string {
    switch (role) {
      case 'ADMIN_CENTRE':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'ADMIN_ETABLISSEMENT':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'FORMATEUR':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'PERSONNEL_ADMINISTRATIF':
        return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
      case 'APPRENANT':
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  }

  // Consultation du dossier individuel complet
  ouvrirDossier(u: Utilisateur) {
    this.service.getDossier(u.id).subscribe({
      next: (dossier) => {
        this.dossierSelectionne = dossier;
        this.ongletDossier = 'IDENTITE';
        this.chargerDocuments(dossier.id);
        this.chargerRegularisations(dossier.id);
      },
      error: () => {
        this.toast.error('Impossible de charger le dossier complet de cet utilisateur.');
      },
    });
  }

  fermerDossier() {
    this.dossierSelectionne = null;
  }

  // Déverrouillage compte ANSSI
  deverrouillerCompte(userId: string) {
    this.service.deverrouillerCompte(userId).subscribe({
      next: (res) => {
        this.toast.success(res.message);
        if (this.dossierSelectionne && this.dossierSelectionne.id === userId) {
          this.dossierSelectionne.securite.estVerrouille = false;
        }
      },
      error: () => {
        this.toast.error('Erreur lors du déverrouillage du compte.');
      },
    });
  }

  // Réinitialisation mot de passe
  ouvrirModalResetPassword(u: Utilisateur) {
    this.userToReset = u;
    this.nouveauMotDePasse = '';
    this.motDePasseReinitialiseResult = '';
    this.modalResetPasswordOuvert = true;
  }

  fermerModalResetPassword() {
    this.modalResetPasswordOuvert = false;
    this.userToReset = null;
    this.nouveauMotDePasse = '';
    this.motDePasseReinitialiseResult = '';
  }

  confirmerResetPassword() {
    if (!this.userToReset) return;
    this.submittingReset = true;
    this.service.reinitialiserAcces(this.userToReset.id, this.nouveauMotDePasse || undefined).subscribe({
      next: (res) => {
        this.toast.success('Mot de passe réinitialisé avec succès');
        this.motDePasseReinitialiseResult = res.motDePasseTemporaire || 'Vitalis2026!';
        this.submittingReset = false;
      },
      error: () => {
        this.toast.error('Erreur lors de la réinitialisation du mot de passe');
        this.submittingReset = false;
      },
    });
  }

  // Activation / Suspension de compte
  toggleActif(u: Utilisateur) {
    const nouvelEtat = u.actif === false;
    this.actionEnCours = u.id;
    this.service.setActif(u.id, nouvelEtat).subscribe({
      next: () => {
        u.actif = nouvelEtat;
        const idx = this.utilisateurs.findIndex((item) => item.id === u.id);
        if (idx !== -1) {
          this.utilisateurs[idx] = { ...this.utilisateurs[idx], actif: nouvelEtat };
          this.utilisateurs = [...this.utilisateurs];
        }
        if (this.dossierSelectionne && this.dossierSelectionne.id === u.id) {
          this.dossierSelectionne.actif = nouvelEtat;
        }
        this.actionEnCours = null;
        this.toast.success(`Compte ${nouvelEtat ? 'activé' : 'suspendu'} avec succès`);
      },
      error: () => {
        this.actionEnCours = null;
        this.toast.error('Erreur lors du changement de statut du compte');
      },
    });
  }

  // Modal Enrôlement
  ouvrirModalEnrolement() {
    let roleDefaut = 'PERSONNEL_ADMINISTRATIF';
    if (this.ongletActif === 'TECHNIQUE') roleDefaut = 'FORMATEUR';
    else if (this.ongletActif === 'APPRENANTS') roleDefaut = 'APPRENANT';

    this.formulaire = {
      nom: '',
      prenom: '',
      email: '',
      password: '',
      role: roleDefaut,
      etablissementId: this.etablissements.length > 0 ? this.etablissements[0].id : '',
    };
    this.modalOuvert = true;
  }

  fermerModalEnrolement() {
    this.modalOuvert = false;
  }

  soumettreEnrolement() {
    if (!this.formulaire.nom || !this.formulaire.prenom || !this.formulaire.email || !this.formulaire.password || !this.formulaire.etablissementId) {
      this.toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (this.formulaire.password.length < 12) {
      this.toast.error('Le mot de passe doit comporter au moins 12 caractères.');
      return;
    }

    this.submitting = true;
    this.service.enroler(this.formulaire).subscribe({
      next: (res: any) => {
        this.toast.success('Utilisateur enrôlé avec succès');
        const etab = this.etablissements.find((e) => e.id === this.formulaire.etablissementId);
        const newUser: Utilisateur = {
          id: (res && res.id) ? res.id : 'user-' + Date.now(),
          nom: this.formulaire.nom,
          prenom: this.formulaire.prenom,
          email: this.formulaire.email,
          role: this.formulaire.role as any,
          etablissementId: this.formulaire.etablissementId,
          etablissement: etab ? { id: etab.id, nom: etab.nom, codeAntenne: etab.codeAntenne } : undefined,
          actif: true,
          createdAt: new Date().toISOString(),
          ...(res || {}),
        };
        this.utilisateurs = [newUser, ...this.utilisateurs];
        this.fermerModalEnrolement();
        this.submitting = false;
      },
      error: (err) => {
        const message = err?.error?.message || "Erreur lors de l'enrôlement";
        this.toast.error(message);
        this.submitting = false;
      },
    });
  }

  // Modal Édition
  ouvrirModalEdition(u: Utilisateur) {
    this.editingUser = u;
    this.formulaireEdition = {
      nom: u.nom,
      prenom: u.prenom,
      role: u.role || 'PERSONNEL_ADMINISTRATIF',
      etablissementId: u.etablissementId || (this.etablissements.length > 0 ? this.etablissements[0].id : ''),
    };
    this.modalEditionOuvert = true;
  }

  fermerModalEdition() {
    this.modalEditionOuvert = false;
    this.editingUser = null;
  }

  soumettreModification() {
    if (!this.editingUser) return;
    if (!this.formulaireEdition.nom.trim() || !this.formulaireEdition.prenom.trim() || !this.formulaireEdition.etablissementId) {
      this.toast.error('Veuillez renseigner le nom, prénom et établissement.');
      return;
    }

    this.submittingEdition = true;
    this.service.updateUser(this.editingUser.id, this.formulaireEdition).subscribe({
      next: (res: any) => {
        const etab = this.etablissements.find((e) => e.id === this.formulaireEdition.etablissementId);
        const idx = this.utilisateurs.findIndex((item) => item.id === this.editingUser!.id);
        if (idx !== -1) {
          this.utilisateurs[idx] = {
            ...this.utilisateurs[idx],
            nom: this.formulaireEdition.nom,
            prenom: this.formulaireEdition.prenom,
            role: this.formulaireEdition.role as any,
            etablissementId: this.formulaireEdition.etablissementId,
            etablissement: etab ? { id: etab.id, nom: etab.nom, codeAntenne: etab.codeAntenne } : this.utilisateurs[idx].etablissement,
            ...(res || {}),
          };
          this.utilisateurs = [...this.utilisateurs];
        }
        if (this.dossierSelectionne && this.dossierSelectionne.id === this.editingUser!.id) {
          this.dossierSelectionne.nom = this.formulaireEdition.nom;
          this.dossierSelectionne.prenom = this.formulaireEdition.prenom;
          this.dossierSelectionne.role = this.formulaireEdition.role;
          this.dossierSelectionne.etablissement = etab ? { id: etab.id, nom: etab.nom } : undefined;
        }
        this.toast.success('Habilitations et informations mises à jour avec succès');
        this.fermerModalEdition();
        this.submittingEdition = false;
      },
      error: (err) => {
        const msg = err?.error?.message || "Erreur lors de la mise à jour";
        this.toast.error(msg);
        this.submittingEdition = false;
      },
    });
  }

  // ─── Documents Dossier ────────────────────────────────────────────────────────

  changerOngletDossier(onglet: 'IDENTITE' | 'SECURITE' | 'DOCUMENTS' | 'REGULARISATIONS') {
    this.ongletDossier = onglet;
    if (onglet === 'DOCUMENTS' && this.dossierSelectionne) {
      this.chargerDocuments(this.dossierSelectionne.id);
    }
    if (onglet === 'REGULARISATIONS' && this.dossierSelectionne) {
      this.chargerRegularisations(this.dossierSelectionne.id);
    }
  }

  chargerDocuments(userId: string) {
    this.loadingDocuments = true;
    this.service.getDocuments(userId).subscribe({
      next: (docs) => { this.documentsDossier = docs; this.loadingDocuments = false; },
      error: () => { this.loadingDocuments = false; },
    });
  }

  chargerRegularisations(userId: string) {
    this.loadingRegularisations = true;
    this.service.getRegularisations(userId).subscribe({
      next: (regs) => { this.regularisations = regs; this.loadingRegularisations = false; },
      error: () => { this.loadingRegularisations = false; },
    });
  }

  ouvrirModalAjoutDocument() {
    this.ajoutDocumentTitre = '';
    this.ajoutDocumentType = 'CONTRAT';
    this.ajoutDocumentCommentaire = '';
    this.ajoutDocumentFichier = null;
    this.modalAjoutDocumentOuvert = true;
  }

  fermerModalAjoutDocument() { this.modalAjoutDocumentOuvert = false; }

  onFichierDocumentChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.ajoutDocumentFichier = input.files[0];
    }
  }

  soumettreAjoutDocument() {
    if (!this.dossierSelectionne || !this.ajoutDocumentFichier || !this.ajoutDocumentTitre.trim()) {
      this.toast.error('Veuillez remplir le titre et sélectionner un fichier.');
      return;
    }
    this.submittingDocument = true;
    this.service.ajouterDocument(
      this.dossierSelectionne.id,
      this.ajoutDocumentFichier,
      this.ajoutDocumentTitre.trim(),
      this.ajoutDocumentType,
      this.ajoutDocumentCommentaire || undefined,
    ).subscribe({
      next: (res) => {
        this.toast.success('Document ajouté avec succès au dossier');
        this.chargerDocuments(this.dossierSelectionne.id);
        this.fermerModalAjoutDocument();
        this.submittingDocument = false;
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Erreur lors de l\'ajout du document');
        this.submittingDocument = false;
      },
    });
  }

  supprimerDocument(docId: string) {
    if (!this.dossierSelectionne) return;
    if (!confirm('Confirmer la suppression de ce document ?')) return;
    this.service.supprimerDocument(this.dossierSelectionne.id, docId).subscribe({
      next: () => {
        this.toast.success('Document supprimé');
        this.chargerDocuments(this.dossierSelectionne.id);
      },
      error: () => this.toast.error('Erreur lors de la suppression'),
    });
  }

  // ─── Demandes de Régularisation ───────────────────────────────────────────────

  ouvrirModalRegularisation() {
    this.demandeRegularisation = { motif: '', description: '', piecesDemandees: [], dateLimite: '' };
    this.nouvellePiece = '';
    this.modalRegularisationOuvert = true;
  }

  fermerModalRegularisation() { this.modalRegularisationOuvert = false; }

  ajouterPieceDemandee() {
    if (this.nouvellePiece.trim()) {
      this.demandeRegularisation.piecesDemandees.push(this.nouvellePiece.trim());
      this.nouvellePiece = '';
    }
  }

  retirerPieceDemandee(index: number) {
    this.demandeRegularisation.piecesDemandees.splice(index, 1);
  }

  soumettreDemandeRegularisation() {
    if (!this.dossierSelectionne) return;
    const { motif, description, dateLimite } = this.demandeRegularisation;
    if (!motif.trim() || !description.trim() || !dateLimite) {
      this.toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    this.submittingRegularisation = true;
    this.service.creerDemandeRegularisation(this.dossierSelectionne.id, {
      motif: motif.trim(),
      description: description.trim(),
      piecesDemandees: this.demandeRegularisation.piecesDemandees,
      dateLimite,
    }).subscribe({
      next: () => {
        this.toast.success('Demande de régularisation envoyée avec succès');
        this.chargerRegularisations(this.dossierSelectionne.id);
        this.fermerModalRegularisation();
        this.submittingRegularisation = false;
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Erreur lors de l\'envoi de la demande');
        this.submittingRegularisation = false;
      },
    });
  }

  ouvrirModalDecision(demande: any) {
    this.demandeSelectionnee = demande;
    this.decisionRegularisation = { statut: 'REGULARISE', commentaire: '' };
    this.modalDecisionRegularisationOuvert = true;
  }

  fermerModalDecision() {
    this.modalDecisionRegularisationOuvert = false;
    this.demandeSelectionnee = null;
  }

  soumettreDecision() {
    if (!this.demandeSelectionnee) return;
    this.submittingDecision = true;
    this.service.decisionRegularisation(this.demandeSelectionnee.id, {
      statut: this.decisionRegularisation.statut,
      commentaire: this.decisionRegularisation.commentaire || undefined,
    }).subscribe({
      next: () => {
        this.toast.success('Décision enregistrée avec succès');
        this.chargerRegularisations(this.dossierSelectionne.id);
        this.fermerModalDecision();
        this.submittingDecision = false;
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Erreur lors de l\'enregistrement de la décision');
        this.submittingDecision = false;
      },
    });
  }

  getStatutRegularisationClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'REGULARISE': return 'bg-green-100 text-green-800 border-green-200';
      case 'REJETE': return 'bg-red-100 text-red-800 border-red-200';
      case 'CLOTURE': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  getStatutRegularisationLabel(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return '⏳ En attente';
      case 'REGULARISE': return '✅ Régularisé';
      case 'REJETE': return '❌ Rejeté';
      case 'CLOTURE': return '🔒 Clôturé';
      default: return statut;
    }
  }

  getConformiteBadge(userId: string): { label: string; class: string } {
    const regs = this.regularisations;
    const enAttente = regs.some(r => r.statut === 'EN_ATTENTE');
    const docs = this.documentsDossier;
    if (enAttente) {
      return { label: '⚠️ Régularisation demandée', class: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (docs.length === 0) {
      return { label: '📂 Dossier vide', class: 'bg-gray-100 text-gray-700 border-gray-300' };
    }
    return { label: '✅ Conforme', class: 'bg-green-100 text-green-800 border-green-300' };
  }
}

