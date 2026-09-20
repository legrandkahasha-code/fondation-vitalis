import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, filter } from 'rxjs';
import { ApprenantService, ApprenantCertificat, ApprenantFormation } from '../../../core/services/apprenant.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-mes-certificats',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-8 animate-fade-in pb-12 min-w-0">

      <!-- ══════════ HEADER OFFICIEL VITALIS CENTER ══════════ -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[#1B1D1F] font-heading">Mes Certificats Officiels</h1>
          <div class="barre"></div>
          <p class="text-xs text-[#4B5157] mt-2 leading-relaxed">
            Titres professionnels et certificats d'aptitude délivrés sous la tutelle du Ministère de la Formation Professionnelle.
          </p>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          @if (!loading && certificats.length > 0) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#E7F1FA] border border-[#1C75BC]/30 text-[#1C75BC] text-[11px] font-bold">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              {{ certificats.length }} Certif{{ certificats.length > 1 ? 'icats' : 'icat' }}
            </span>
          }

          <!-- BOUTON ACTUALISER -->
          <button
            type="button"
            (click)="loadCertificats(true, true)"
            [disabled]="loading"
            class="px-3 py-1.5 rounded-xs bg-white hover:bg-[#F5F6F7] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="Rafraîchir la liste des certificats"
          >
            <svg
              class="w-3.5 h-3.5 text-[#1C75BC]"
              [class.animate-spin]="loading"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span class="hidden sm:inline">{{ loading ? 'Vérification...' : 'Actualiser' }}</span>
          </button>
        </div>
      </div>

      <!-- ══════════ BARRE DE RECHERCHE / FILTRE RAPIDE (Si > 1 certificat) ══════════ -->
      @if (!loading && certificats.length > 1) {
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-[#D7DBDE] rounded-xs shadow-xs">
          <div class="relative flex-1">
            <svg class="w-4 h-4 text-[#4B5157] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Rechercher par titre de formation, N° de série..."
              class="w-full pl-9 pr-8 py-2 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs text-[#1B1D1F] placeholder-[#4B5157] focus:outline-none focus:border-[#1C75BC] focus:bg-white transition-all font-sans"
            />
            @if (searchTerm) {
              <button
                type="button"
                (click)="searchTerm = ''"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4B5157] hover:text-[#1B1D1F] text-xs font-bold cursor-pointer"
                title="Effacer la recherche"
              >
                ✕
              </button>
            }
          </div>
          <div class="text-[11px] font-semibold text-[#4B5157] shrink-0 text-right sm:text-left">
            {{ certificatsFiltres.length }} sur {{ certificats.length }} affiché{{ certificatsFiltres.length > 1 ? 's' : '' }}
          </div>
        </div>
      }

      <!-- ══════════ KPI BAR ══════════ -->
      @if (!loading && certificats.length > 0) {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="flex items-center gap-4 p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs hover:border-[#1C75BC]/40 hover:shadow-md transition-all">
            <div class="w-10 h-10 rounded-xs bg-[#E7F1FA] flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-[#1C75BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] text-[#4B5157] uppercase font-bold tracking-wider">Certifiés</p>
              <p class="text-2xl font-black text-[#1C75BC] font-mono leading-none mt-0.5">{{ certificats.length }}</p>
              <p class="text-[10px] text-[#4B5157] mt-0.5">formation{{ certificats.length > 1 ? 's' : '' }} validée{{ certificats.length > 1 ? 's' : '' }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4 p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs hover:border-[#F0791E]/40 hover:shadow-md transition-all">
            <div class="w-10 h-10 rounded-xs bg-[#FDECDD] flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] text-[#4B5157] uppercase font-bold tracking-wider">Meilleure Moyenne</p>
              <p class="text-2xl font-black text-[#F0791E] font-mono leading-none mt-0.5">{{ bestMoyenne }}<span class="text-sm font-bold text-[#4B5157]">/20</span></p>
              <p class="text-[10px] text-[#4B5157] mt-0.5">score maximum obtenu</p>
            </div>
          </div>

          <div class="flex items-center gap-4 p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs transition-all" style="border-color: #D7DBDE">
            <div class="w-10 h-10 rounded-xs flex items-center justify-center shrink-0" style="background-color: #E6F6F5">
              <svg class="w-5 h-5" style="color:#2AA9A0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] text-[#4B5157] uppercase font-bold tracking-wider">Authenticité</p>
              <p class="text-sm font-black leading-none mt-0.5" style="color:#2AA9A0">Vérifiés EUP</p>
              <p class="text-[10px] text-[#4B5157] mt-0.5">protection SHA-256 active</p>
            </div>
          </div>
        </div>
      }

      <!-- ══════════ FORMATIONS ÉLIGIBLES EN ATTENTE DE CERTIFICATION (BR-03) ══════════ -->
      @if (formationsEligiblesSansCertificat.length > 0) {
        <div class="space-y-3">
          @for (f of formationsEligiblesSansCertificat; track f.id) {
            <div class="p-5 bg-[#E7F1EA] border-l-4 border-[#276B44] border border-[#D7DBDE] rounded-xs shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xs bg-[#276B44] text-white flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2 py-0.5 rounded-xs bg-[#276B44] text-white text-[10px] font-bold uppercase">Éligibilité BR-03 Validée</span>
                    <span class="text-xs font-bold text-[#1B1D1F]">{{ f.titre }}</span>
                  </div>
                  <p class="text-xs text-[#276B44] mt-1">
                    Félicitations ! Vous avez validé l'intégralité des modules. Votre titre officiel d'aptitude professionnelle peut être émis immédiatement.
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="genererCertificat(f.id)"
                [disabled]="generatingId === f.id"
                class="px-4 py-2.5 rounded-xs bg-[#276B44] hover:bg-[#1e5234] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60 transition-all"
              >
                @if (generatingId === f.id) {
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

      <!-- ══════════ CHARGEMENT ══════════ -->
      @if (loading) {
        <div class="p-16 text-center text-[#4B5157] bg-white border border-[#D7DBDE] rounded-xs">
          <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-xs font-semibold text-[#4B5157]">Vérification de vos certificats officiels...</p>
        </div>

      <!-- ══════════ ÉTAT VIDE ══════════ -->
      } @else if (certificats.length === 0) {
        <div class="p-12 text-center bg-white border border-[#D7DBDE] rounded-xs text-[#4B5157] space-y-5 shadow-xs">
          <div class="w-20 h-20 rounded-xs bg-[#FDECDD] text-[#F0791E] flex items-center justify-center mx-auto border border-[#F0791E]/30">
            <svg class="w-10 h-10 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div class="space-y-1.5">
            <h3 class="text-base font-bold text-[#1B1D1F]">Aucun certificat émis pour le moment</h3>
            <p class="text-xs text-[#4B5157] max-w-md mx-auto leading-relaxed">
              Pour obtenir votre certificat officiel, vous devez terminer <strong>100% des modules</strong> de votre formation et obtenir une <strong>moyenne pondérée ≥ 10/20</strong> (Règle BR-03).
            </p>
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              routerLink="/apprenant/formations"
              class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Poursuivre mon apprentissage</span>
            </a>
            <a
              routerLink="/apprenant/evaluations/depot-devoir"
              class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xs bg-[#F5F6F7] hover:bg-[#D7DBDE] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Consulter mes évaluations & devoirs</span>
            </a>
          </div>
        </div>

      <!-- ══════════ LISTE DES CERTIFICATS ══════════ -->
      } @else {
        @if (certificatsFiltres.length === 0) {
          <div class="p-8 text-center bg-white border border-[#D7DBDE] rounded-xs text-[#4B5157] space-y-3">
            <p class="text-sm font-semibold">Aucun certificat ne correspond à votre recherche « {{ searchTerm }} ».</p>
            <button
              type="button"
              (click)="searchTerm = ''"
              class="px-4 py-2 rounded-xs bg-[#1C75BC] text-white text-xs font-bold cursor-pointer"
            >
              Réinitialiser la recherche
            </button>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (c of certificatsFiltres; track c.id) {
              <div class="cert-card group bg-white border border-[#D7DBDE] rounded-xs overflow-hidden shadow-xs hover:shadow-lg hover:border-[#1C75BC]/40 transition-all duration-300 flex flex-col" style="border-top: 4px solid #F0791E">

                <!-- ── Gradient Header (Bleu Cobalt institutionnel) ── -->
                <div class="relative px-5 pt-5 pb-6 overflow-hidden" style="background: linear-gradient(135deg, #1C75BC 0%, #124F80 100%)">
                  <!-- Watermark décoration -->
                  <div class="absolute -right-4 -top-4 w-24 h-24 opacity-10 pointer-events-none">
                    <svg viewBox="0 0 24 24" fill="white">
                      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                    </svg>
                  </div>

                  <!-- Row badges -->
                  <div class="flex items-center justify-between gap-2 mb-3">
                    <span class="px-2.5 py-1 rounded-xs bg-white/15 text-white text-[11px] font-bold tracking-wider font-mono border border-white/20">
                      N° {{ c.numeroSerie }}
                    </span>
                    <span class="px-2.5 py-1 rounded-xs bg-[#276B44]/90 text-white text-[10px] font-bold flex items-center gap-1 border border-white/20">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Authentifié · EUP
                    </span>
                  </div>

                  <!-- Formation icon + titre -->
                  <div class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-xs bg-[#F0791E] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    </div>
                    <div>
                      <h2 class="text-sm font-bold text-white leading-snug">{{ c.formation.titre }}</h2>
                      <p class="text-[11px] text-white/80 mt-0.5">
                        {{ c.formation.etablissement.nom || 'Vitalis Center EUP' }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- ── Body ── -->
                <div class="flex-1 p-5 space-y-4">

                  <!-- Stats: Moyenne + Date -->
                  <div class="grid grid-cols-2 gap-3">
                    <!-- Moyenne avec jauge de couleur -->
                    <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs space-y-2">
                      <p class="text-[10px] text-[#4B5157] uppercase font-bold tracking-wider">Moyenne Générale</p>
                      <p class="text-2xl font-black font-mono leading-none" [class]="getMoyenneColor(c.moyenneGenerale)">
                        {{ c.moyenneGenerale }}<span class="text-sm font-bold text-[#4B5157]">/20</span>
                      </p>
                      <!-- Jauge -->
                      <div class="h-1.5 bg-[#D7DBDE] rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-700"
                          [style.width.%]="(c.moyenneGenerale / 20) * 100"
                          [class]="getMoyenneBarColor(c.moyenneGenerale)"
                        ></div>
                      </div>
                      <p class="text-[10px] font-semibold" [class]="getMoyenneColor(c.moyenneGenerale)">{{ getMentionLabel(c.moyenneGenerale) }}</p>
                    </div>

                    <!-- Date d'émission -->
                    <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs">
                      <p class="text-[10px] text-[#4B5157] uppercase font-bold tracking-wider">Date d'Émission</p>
                      <div class="flex items-center gap-1.5 mt-2">
                        <svg class="w-4 h-4 text-[#1C75BC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p class="text-xs font-bold text-[#1B1D1F] font-mono">{{ formatDateFR(c.dateEmission) }}</p>
                      </div>
                      <p class="text-[10px] text-[#4B5157] mt-1.5">Ministère FP</p>
                    </div>
                  </div>

                  <!-- ── Accordéon Sécurité (Teal) ── -->
                  <div class="border rounded-xs overflow-hidden" style="border-color: #2AA9A0">
                    <button
                      type="button"
                      (click)="toggleHash(c.id)"
                      class="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer"
                      [style.background]="hashOpenId === c.id ? '#E6F6F5' : '#F5F6F7'"
                    >
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 shrink-0" style="color:#2AA9A0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span class="text-[11px] font-bold" style="color:#2AA9A0">Empreinte anti-fraude SHA-256</span>
                      </div>
                      <svg
                        class="w-4 h-4 transition-transform duration-200"
                        style="color:#2AA9A0"
                        [class.rotate-180]="hashOpenId === c.id"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    @if (hashOpenId === c.id) {
                      <div class="px-3 py-3 border-t" style="border-color:#2AA9A0; background:#E6F6F5">
                        <p class="font-mono text-[9px] break-all leading-relaxed" style="color:#1B6B62">{{ c.hashVerification }}</p>
                        <button
                          type="button"
                          (click)="copyHash(c.id, c.hashVerification)"
                          class="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xs text-[10px] font-bold transition-all cursor-pointer text-white"
                          [style.background]="copiedHashId === c.id ? '#276B44' : '#2AA9A0'"
                        >
                          @if (copiedHashId === c.id) {
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>✓ Empreinte copiée !</span>
                          } @else {
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copier l'empreinte SHA-256</span>
                          }
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <!-- ── Actions Bar (100% Fonctionnelle & Responsive) ── -->
                <div class="px-5 pb-5">
                  <div class="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-4 border-t border-[#D7DBDE]">
                    
                    <!-- 1. Aperçu Officiel (Modal) -->
                    <button
                      type="button"
                      (click)="ouvrirApercu(c)"
                      class="px-3 py-2.5 rounded-xs bg-[#E7F1FA] hover:bg-[#1C75BC] text-[#1C75BC] hover:text-white border border-[#1C75BC]/30 hover:border-[#1C75BC] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Aperçu officiel et impression"
                    >
                      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Aperçu</span>
                    </button>

                    <!-- 2. Télécharger PDF (Requête sécurisée avec fallback et spinner) -->
                    <button
                      type="button"
                      (click)="telechargerPdf(c)"
                      [disabled]="downloadingId === c.id"
                      class="col-span-2 sm:flex-1 px-4 py-2.5 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold text-center shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      title="Télécharger le document PDF original"
                    >
                      @if (downloadingId === c.id) {
                        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Génération...</span>
                      } @else {
                        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Télécharger PDF</span>
                      }
                    </button>

                    <!-- 3. Vérifier en ligne sur le registre -->
                    <a
                      [routerLink]="['/certificats/verifier', c.numeroSerie]"
                      class="px-3 py-2.5 rounded-xs bg-[#F5F6F7] hover:bg-[#D7DBDE] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Vérifier sur le registre public officiel"
                    >
                      <svg class="w-4 h-4 text-[#1C75BC] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Vérifier</span>
                    </a>

                    <!-- 4. Partager (Web Share API ou Copier lien) -->
                    <button
                      type="button"
                      (click)="partagerCertificat(c)"
                      class="px-3 py-2.5 rounded-xs text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border"
                      [class]="copiedLinkId === c.id
                        ? 'bg-[#E7F1EA] border-[#276B44] text-[#276B44]'
                        : 'bg-[#F5F6F7] border-[#D7DBDE] text-[#4B5157] hover:bg-[#D7DBDE] hover:text-[#1B1D1F]'"
                      title="Partager le lien de vérification officiel"
                    >
                      @if (copiedLinkId === c.id) {
                        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copié</span>
                      } @else {
                        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>Partager</span>
                      }
                    </button>

                    <!-- 5. Retour vers formation liée -->
                    <a
                      [routerLink]="['/apprenant/formations', c.formation.id]"
                      class="px-3 py-2.5 rounded-xs bg-[#F5F6F7] hover:bg-[#D7DBDE] text-[#4B5157] hover:text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Accéder aux modules de la formation"
                    >
                      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span class="sm:hidden">Formation</span>
                    </a>

                  </div>
                </div>

              </div>
            }
          </div>
        }
      }

      <!-- ══════════ MODAL D'APERÇU OFFICIEL DU CERTIFICAT ══════════ -->
      @if (certificatApercu) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            class="bg-white border-2 border-[#1C75BC] rounded-xs shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            (click)="$event.stopPropagation()"
          >
            <!-- Header du Modal -->
            <div class="px-6 py-4 bg-[#124F80] text-white flex items-center justify-between border-b-2 border-[#F0791E]">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xs bg-[#F0791E] flex items-center justify-center text-white font-bold">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold tracking-wide">Certificat d'Aptitude Professionnelle</h3>
                  <p class="text-[11px] text-[#E7F1FA] font-mono">N° {{ certificatApercu.numeroSerie }}</p>
                </div>
              </div>
              <button
                type="button"
                (click)="fermerApercu()"
                class="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
                title="Fermer"
              >
                ✕
              </button>
            </div>

            <!-- Corps du Diplôme (Rendu Précieux) -->
            <div class="p-6 sm:p-8 overflow-y-auto space-y-6 bg-radial from-white to-[#F5F6F7]">
              <!-- En-tête officiel Ministère -->
              <div class="text-center space-y-1 pb-4 border-b border-[#D7DBDE]">
                <p class="text-[10px] font-bold tracking-widest text-[#4B5157] uppercase">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</p>
                <p class="text-xs font-bold text-[#1B1D1F] uppercase">Ministère de la Formation Professionnelle</p>
                <p class="text-[11px] font-semibold text-[#1C75BC]">{{ certificatApercu.formation.etablissement.nom || 'Vitalis Center EUP' }}</p>
              </div>

              <div class="text-center space-y-3">
                <p class="text-xs italic text-[#4B5157]">Il est officiellement certifié que les compétences du programme :</p>
                <h4 class="text-lg sm:text-xl font-extrabold text-[#124F80] font-heading px-4">
                  « {{ certificatApercu.formation.titre }} »
                </h4>
                <p class="text-xs text-[#4B5157]">ont été validées avec succès conformément aux exigences réglementaires BR-03.</p>
              </div>

              <!-- Cartouche Note & Mention -->
              <div class="grid grid-cols-2 gap-4 p-4 bg-white border border-[#D7DBDE] rounded-xs shadow-xs text-center">
                <div>
                  <p class="text-[10px] font-bold text-[#4B5157] uppercase">Moyenne Pondérée</p>
                  <p class="text-xl font-black font-mono mt-0.5" [class]="getMoyenneColor(certificatApercu.moyenneGenerale)">
                    {{ certificatApercu.moyenneGenerale }} / 20
                  </p>
                  <span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-xs bg-[#E7F1EA] text-[#276B44]">
                    Mention {{ getMentionLabel(certificatApercu.moyenneGenerale) }}
                  </span>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-[#4B5157] uppercase">Date de Délivrance</p>
                  <p class="text-sm font-bold text-[#1B1D1F] mt-1 font-mono">
                    {{ formatDateFR(certificatApercu.dateEmission) }}
                  </p>
                  <span class="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-xs bg-[#E7F1FA] text-[#1C75BC]">
                    Registre EUP Actif
                  </span>
                </div>
              </div>

              <!-- Empreinte numérique anti-fraude -->
              <div class="p-3 bg-[#E6F6F5] border border-[#2AA9A0] rounded-xs space-y-1 text-center sm:text-left">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase tracking-wider" style="color:#1B6B62">Sceau Cryptographique SHA-256</span>
                  <span class="text-[10px] font-mono text-[#276B44] font-bold">✓ Intégrité Vérifiée</span>
                </div>
                <p class="font-mono text-[9px] break-all" style="color:#1B6B62">{{ certificatApercu.hashVerification }}</p>
              </div>
            </div>

            <!-- Footer d'actions du Modal -->
            <div class="p-4 bg-[#F5F6F7] border-t border-[#D7DBDE] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                (click)="imprimerCertificat()"
                class="px-4 py-2 rounded-xs bg-white hover:bg-[#D7DBDE] text-[#1B1D1F] border border-[#D7DBDE] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg class="w-4 h-4 text-[#4B5157]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimer</span>
              </button>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="fermerApercu()"
                  class="px-4 py-2 rounded-xs bg-white hover:bg-[#D7DBDE] text-[#4B5157] border border-[#D7DBDE] text-xs font-bold cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  (click)="telechargerPdf(certificatApercu)"
                  [disabled]="downloadingId === certificatApercu.id"
                  class="px-5 py-2 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Télécharger PDF Officiel</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .cert-card {
      position: relative;
    }
    .cert-card:hover {
      transform: translateY(-2px);
    }
    @media print {
      body * {
        visibility: hidden;
      }
      .bg-radial, .bg-radial * {
        visibility: visible;
      }
      .bg-radial {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
    }
  `]
})
export class MesCertificatsComponent implements OnInit, OnDestroy {
  certificats: ApprenantCertificat[] = [];
  formations: ApprenantFormation[] = [];
  loading = true;
  searchTerm = '';
  hashOpenId: string | null = null;
  copiedHashId: string | null = null;
  copiedLinkId: string | null = null;
  downloadingId: string | null = null;
  generatingId: string | null = null;
  certificatApercu: ApprenantCertificat | null = null;

  private liveSub: Subscription | null = null;
  private bootstrapSub: Subscription | null = null;

  constructor(
    private apprenantService: ApprenantService,
    private toast: ToastService,
  ) {}

  get formationsEligiblesSansCertificat(): ApprenantFormation[] {
    const certFormationIds = new Set(this.certificats.map((c) => c.formation.id));
    return this.formations.filter((f) => f.pourcentage === 100 && !certFormationIds.has(f.id));
  }

  get certificatsFiltres(): ApprenantCertificat[] {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      return this.certificats;
    }
    const term = this.searchTerm.trim().toLowerCase();
    return this.certificats.filter((c) =>
      c.formation.titre.toLowerCase().includes(term) ||
      c.numeroSerie.toLowerCase().includes(term) ||
      (c.formation.etablissement.nom && c.formation.etablissement.nom.toLowerCase().includes(term)) ||
      this.getMentionLabel(c.moyenneGenerale).toLowerCase().includes(term)
    );
  }

  get bestMoyenne(): string {
    if (!this.certificats.length) return '—';
    const max = Math.max(...this.certificats.map(c => c.moyenneGenerale));
    return max.toFixed(1).replace('.', ',');
  }

  getMoyenneColor(moyenne: number): string {
    if (moyenne >= 16) return 'text-[#276B44]';
    if (moyenne >= 14) return 'text-[#2AA9A0]';
    if (moyenne >= 10) return 'text-[#1C75BC]';
    return 'text-[#ED1C24]';
  }

  getMoyenneBarColor(moyenne: number): string {
    if (moyenne >= 16) return 'bg-[#276B44]';
    if (moyenne >= 14) return 'bg-[#2AA9A0]';
    if (moyenne >= 10) return 'bg-[#1C75BC]';
    return 'bg-[#ED1C24]';
  }

  getMentionLabel(moyenne: number): string {
    if (moyenne >= 16) return 'Très Bien';
    if (moyenne >= 14) return 'Bien';
    if (moyenne >= 12) return 'Assez Bien';
    if (moyenne >= 10) return 'Passable';
    return 'Insuffisant';
  }

  formatDateFR(dateStr: string | Date): string {
    const d = new Date(dateStr);
    const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  toggleHash(id: string) {
    this.hashOpenId = this.hashOpenId === id ? null : id;
  }

  /**
   * Copie sécurisée avec support des environnements stricts et iframes
   */
  private async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
  }

  async copyHash(id: string, hash: string) {
    try {
      await this.copyToClipboard(hash);
      this.copiedHashId = id;
      setTimeout(() => { this.copiedHashId = null; }, 2500);
      this.toast.success('Empreinte SHA-256 copiée !');
    } catch {
      this.toast.error('Impossible de copier l\'empreinte.');
    }
  }

  /**
   * Partage moderne : Web Share API sur mobile, copie de lien sur desktop
   */
  async partagerCertificat(c: ApprenantCertificat) {
    const url = `${window.location.origin}/certificats/verifier/${c.numeroSerie}`;
    const title = `Certificat Officiel - ${c.formation.titre}`;
    const text = `Consultez mon certificat officiel Vitalis Center N° ${c.numeroSerie} (Note : ${c.moyenneGenerale}/20).`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        this.toast.success('Certificat partagé avec succès !');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Annulation utilisateur volontaire
      }
    }

    try {
      await this.copyToClipboard(url);
      this.copiedLinkId = c.id;
      setTimeout(() => { this.copiedLinkId = null; }, 2500);
      this.toast.success('Lien de vérification copié dans le presse-papiers !');
    } catch {
      this.toast.error('Impossible de copier le lien.');
    }
  }

  /**
   * Téléchargement PDF robuste :
   * 1. Tentative de stream Blob via l'API sécurisée
   * 2. Fallback automatique et transparent vers urlPdfS3 si besoin
   */
  telechargerPdf(c: ApprenantCertificat) {
    if (this.downloadingId === c.id) return;
    this.downloadingId = c.id;

    this.apprenantService.telechargerCertificat(c.id).subscribe({
      next: (blob: Blob) => {
        this.downloadingId = null;
        if (!blob || blob.size === 0) {
          this.toast.error('Le document PDF retourné est vide.');
          return;
        }
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${c.numeroSerie}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
        this.toast.success(`Certificat ${c.numeroSerie} téléchargé avec succès.`);
      },
      error: (err) => {
        this.downloadingId = null;
        console.error('Erreur téléchargement certificat:', err);
        if (c.urlPdfS3) {
          window.open(c.urlPdfS3, '_blank');
          this.toast.info('Ouverture du document...');
        } else {
          this.toast.error('Erreur lors du téléchargement du certificat.');
        }
      },
    });
  }

  ouvrirApercu(c: ApprenantCertificat) {
    this.certificatApercu = c;
  }

  fermerApercu() {
    this.certificatApercu = null;
  }

  imprimerCertificat() {
    window.print();
  }

  ngOnInit() {
    // 1. Rendu instantané depuis le snapshot localStorage (0ms !)
    const cached = this.apprenantService.getCertificatsSnapshot();
    if (cached) {
      this.certificats = cached;
      this.loading = false;
    }

    const formationsSnap = this.apprenantService.getFormationsSnapshot();
    if (formationsSnap) {
      this.formations = formationsSnap;
    }

    // Synchronisation unifiée avec le flux bootstrap
    this.bootstrapSub = this.apprenantService.bootstrap$.subscribe((data) => {
      if (data?.formations) this.formations = data.formations;
      if (data?.certificats) {
        this.certificats = data.certificats;
        this.loading = false;
      }
    });

    // 2. Revalidation silencieuse en tâche de fond
    this.loadCertificats(cached === null, false);

    // 3. Abonnement réactif temps réel SSE — ne recharger QUE lors d'un CERTIFICAT_EMIS
    this.liveSub = this.apprenantService.liveUpdates$
      .pipe(filter((event) => event.type === 'CERTIFICAT_EMIS'))
      .subscribe(() => {
        this.loadCertificats(false, false);
      });
  }

  ngOnDestroy() {
    this.liveSub?.unsubscribe();
    this.bootstrapSub?.unsubscribe();
  }

  genererCertificat(formationId: string) {
    if (this.generatingId === formationId) return;
    this.generatingId = formationId;
    this.apprenantService.genererCertificat(formationId).subscribe({
      next: (cert) => {
        this.generatingId = null;
        this.toast.success(`Certificat officiel N° ${cert.numeroSerie} émis avec succès !`);
        this.loadCertificats(false, false);
      },
      error: (err) => {
        this.generatingId = null;
        this.toast.error(err.error?.message || 'Erreur lors de la génération du certificat.');
      },
    });
  }

  loadCertificats(showSpinner = true, isManual = false) {
    if (showSpinner) {
      this.loading = true;
    }
    this.apprenantService.getCertificats().subscribe({
      next: (data) => {
        this.certificats = data;
        this.loading = false;
        if (isManual) {
          this.toast.success('Liste des certificats actualisée avec succès.');
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Erreur lors du chargement des certificats.');
      },
    });
  }
}

