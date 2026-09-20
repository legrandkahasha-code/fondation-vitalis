import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ApprenantService } from '../../../core/services/apprenant.service';
import { NotificationsService, NotificationPayload } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-apprenant-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <!-- ─── TOASTS TEMPS RÉEL (Adaptive Responsive Positioning) ─────────────────────────────────────────── -->
    <div class="fixed top-3 sm:top-4 inset-x-3 sm:left-auto sm:right-4 z-[9999] flex flex-col gap-2 sm:max-w-sm pointer-events-none">
      @for (toast of toasts; track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-lg shadow-2xl border text-xs sm:text-sm animate-slide-in"
          [ngClass]="{
            'bg-[#1B4B82] border-[#2563EB] text-white': toast.type === 'COURS_PUBLIE' || toast.type === 'DEVOIR_DEPOSE',
            'bg-[#1A4731] border-[#16A34A] text-white': toast.type === 'CERTIFICAT_EMIS' || toast.type === 'COURS_COMPLETED',
            'bg-[#1C3A5A] border-[#0EA5E9] text-white': toast.type === 'NOTE_PUBLIEE' || toast.type === 'DEVOIR_NOTE' || toast.type === 'QUIZ_SUBMITTED',
            'bg-[#9A3412] border-[#F97316] text-white': toast.type === 'DEMANDE_REGULARISATION' || toast.type === 'ASSIDUITE_UPDATE',
            'bg-[#1B1D1F] border-[#4B5157] text-white': toast.type === 'BROADCAST' || toast.type === 'SEANCE_UPDATE' || toast.type === 'DOSSIER_DOCUMENT_AJOUTE' || toast.type === 'DOCUMENT_REGULARISATION_SOUMIS'
          }"
        >
          <span class="text-lg sm:text-xl shrink-0 mt-0.5">{{ toastIcon(toast.type) }}</span>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-xs sm:text-sm leading-tight">{{ toast.title }}</p>
            <p class="text-[11px] sm:text-xs mt-0.5 opacity-90 leading-snug">{{ toast.message }}</p>
          </div>
          <button
            (click)="dismissToast(toast.id)"
            class="shrink-0 text-white/60 hover:text-white text-base sm:text-lg leading-none cursor-pointer p-1"
          >×</button>
        </div>
      }
    </div>

    <div class="flex min-h-screen bg-[#F5F6F7] font-sans text-[#1B1D1F] relative">
      <!-- MOBILE BACKDROP OVERLAY -->
      @if (isMobileMenuOpen) {
        <div
          (click)="toggleMobileMenu(false)"
          class="fixed inset-0 bg-[#1B1D1F]/60 backdrop-blur-xs z-30 md:hidden animate-fade-in"
        ></div>
      }

      <!-- SIDEBAR APPRENANT DÉDIÉE (Responsive Drawer on Mobile, Fixed Sidebar on Desktop) -->
      <aside
        class="fixed md:static inset-y-0 left-0 w-64 bg-[#124F80] text-white flex flex-col shadow-2xl md:shadow-xl z-40 flex-shrink-0 border-r border-[#0D3B61] transform transition-transform duration-300 ease-in-out md:translate-x-0"
        [class.-translate-x-full]="!isMobileMenuOpen"
        [class.translate-x-0]="isMobileMenuOpen"
      >
        <!-- Brand Header avec Logo Officiel & Tutelle -->
        <div class="p-5 border-b border-white/15 bg-[#0D3B61]/60">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img 
                src="assets/logo-vitalis.png" 
                alt="Logo Vitalis Center EUP" 
                width="160"
                height="40"
                class="h-10 w-auto object-contain bg-white p-1 rounded-xs shadow-xs"
              />
              <div>
                <h2 class="text-sm font-bold tracking-tight text-white font-heading leading-tight">VITALIS CENTER</h2>
                <span class="text-[10px] tracking-wider uppercase font-bold text-[#F0791E] block mt-0.5">Espace Apprenant</span>
              </div>
            </div>

            <!-- Close Button on Mobile -->
            <button
              (click)="toggleMobileMenu(false)"
              class="md:hidden w-8 h-8 rounded-xs bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
          
          <div class="mt-2.5 pt-2 border-t border-white/10 text-[9px] text-[#C6D2E3] leading-tight font-medium">
            Aut Foct N°CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026
          </div>

          <!-- User Card -->
          @if (user) {
            <div class="mt-3.5 p-2.5 rounded-xs bg-white/10 border border-white/15 flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-[#1C75BC] text-white font-bold flex items-center justify-center text-xs border border-white/30 shrink-0 shadow-xs">
                {{ user.prenom?.charAt(0) }}{{ user.nom?.charAt(0) }}
              </div>
              <div class="overflow-hidden min-w-0">
                <p class="text-xs font-bold text-white truncate leading-tight">{{ user.prenom }} {{ user.nom }}</p>
                <p class="text-[10px] text-[#C6D2E3] truncate font-mono">{{ user.email }}</p>
                @if (matricule) {
                  <span class="inline-block mt-1 px-1.5 py-0.2 bg-[#F0791E] text-white text-[9px] font-mono font-bold rounded-xs tracking-wider">
                    {{ matricule }}
                  </span>
                }
              </div>
            </div>
          }

          <!-- Badge connexion SSE -->
          <div class="mt-2 flex items-center gap-1.5 text-[10px]" [ngClass]="sseConnected ? 'text-[#4ADE80]' : 'text-[#F87171]'">
            <span class="w-1.5 h-1.5 rounded-full" [ngClass]="sseConnected ? 'bg-[#4ADE80] animate-pulse' : 'bg-[#F87171]'"></span>
            <span>{{ sseConnected ? 'Temps réel actif' : 'Connexion...' }}</span>
          </div>
        </div>

        <!-- Navigation Links avec Icônes Vectorielles Professionnelles (SVG) -->
        <nav class="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <!-- 1. Tableau de bord -->
          <a
            routerLink="/apprenant/dashboard"
            (click)="toggleMobileMenu(false)"
            routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
          >
            <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Tableau de bord</span>
          </a>

          <!-- 2. Mes Formations -->
          <a
            routerLink="/apprenant/formations"
            (click)="toggleMobileMenu(false)"
            routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
          >
            <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Mes Formations</span>
          </a>

          <!-- 2b. Emploi du temps & Assiduité -->
          <a
            routerLink="/apprenant/seances"
            (click)="toggleMobileMenu(false)"
            routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
          >
            <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Emploi du temps & Assiduité</span>
          </a>

          <!-- 2c. Mes Candidatures -->
          <a
            routerLink="/apprenant/candidatures"
            (click)="toggleMobileMenu(false)"
            routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
          >
            <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Mes candidatures</span>
          </a>

          <!-- 3. Devoirs & Évaluations -->
          <a
            routerLink="/apprenant/evaluations/depot-devoir"
            (click)="toggleMobileMenu(false)"
            routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
          >
            <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Devoirs & Évaluations</span>
          </a>

          <!-- 4. Mes Certificats -->
          <a
            routerLink="/apprenant/certificats"
            (click)="toggleMobileMenu(false)"
            routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
          >
            <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span>Mes Certificats</span>
          </a>

          <!-- 5. Mon Profil -->
          <a
            routerLink="/apprenant/profil"
            (click)="toggleMobileMenu(false)"
            routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
            class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
          >
            <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Mon Profil</span>
          </a>
        </nav>

        <!-- Quick Progression Bar -->
        @if (completionGlobale !== null) {
          <div class="p-3.5 mx-3 mb-3 rounded-xs bg-[#0D3B61] border border-white/15">
            <div class="flex justify-between items-center text-[11px] mb-1.5">
              <span class="text-[#C6D2E3] font-medium">Progression globale</span>
              <span class="font-bold text-[#F0791E] font-mono">{{ completionGlobale }}%</span>
            </div>
            <div class="w-full bg-white/20 h-1.5 overflow-hidden">
              <div
                class="bg-[#F0791E] h-1.5 transition-all duration-500"
                [style.width.%]="completionGlobale"
              ></div>
            </div>
          </div>
        }

        <!-- Footer Actions -->
        <div class="p-3 border-t border-white/15 bg-[#0D3B61]">
          <button
            (click)="logout()"
            class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xs text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white border border-white/20 transition-all cursor-pointer"
          >
            <svg class="w-4 h-4 text-[#ED1C24]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <!-- MAIN WRAPPER -->
      <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <!-- Top Bar avec Double Logo Ministère + Hamburger Toggle Mobile -->
        <header class="bg-white border-b border-[#D7DBDE] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-2xs">
          <div class="flex items-center gap-3">
            <!-- Mobile Menu Toggle Button -->
            <button
              (click)="toggleMobileMenu()"
              class="md:hidden p-2 rounded-xs border border-[#D7DBDE] hover:bg-[#E7F1FA] text-[#124F80] transition-colors cursor-pointer"
              aria-label="Ouvrir le menu de navigation"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div class="flex items-center gap-2 text-xs text-[#4B5157]">
              <span class="font-bold text-[#1B1D1F] hidden sm:inline">Portail Apprenant</span>
              <span class="text-[#D7DBDE] hidden sm:inline">/</span>
              <span class="text-[#1C75BC] font-semibold truncate">Session Ouverte</span>
            </div>
          </div>

          <div class="flex items-center gap-3 sm:gap-4 relative">
            <!-- Notifications Bell Icon with Badge -->
            <div class="relative">
              <button
                type="button"
                (click)="toggleNotificationsPanel()"
                class="relative p-2 rounded-xs border border-[#D7DBDE] hover:bg-[#E7F1FA] text-[#124F80] transition-colors cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                @if (unreadNotificationsCount > 0) {
                  <span class="absolute -top-1 -right-1 bg-[#ED1C24] text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}
                  </span>
                }
              </button>

              <!-- Notifications Dropdown Popover -->
              @if (isNotificationsOpen) {
                <div
                  (click)="toggleNotificationsPanel(false)"
                  class="fixed inset-0 z-40 cursor-default"
                ></div>

                <div class="absolute right-0 top-11 w-80 sm:w-96 bg-white border border-[#D7DBDE] rounded-xs shadow-2xl z-50 overflow-hidden animate-fade-in text-left">
                  <!-- Popover Header -->
                  <div class="p-3.5 border-b border-[#D7DBDE] bg-[#F5F6F7] flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <h3 class="text-xs font-bold text-[#1B1D1F]">Notifications</h3>
                      @if (unreadNotificationsCount > 0) {
                        <span class="px-1.5 py-0.2 bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC] text-[10px] font-bold rounded-xs">
                          {{ unreadNotificationsCount }} nouvelle{{ unreadNotificationsCount > 1 ? 's' : '' }}
                        </span>
                      }
                    </div>

                    <div class="flex items-center gap-2 text-[11px]">
                      @if (notificationsHistory.length > 0) {
                        <button
                          type="button"
                          (click)="markAllNotificationsAsRead()"
                          class="text-[#1C75BC] hover:underline font-semibold cursor-pointer"
                        >
                          Tout marquer lu
                        </button>
                        <span class="text-[#D7DBDE]">·</span>
                        <button
                          type="button"
                          (click)="clearNotifications()"
                          class="text-[#ED1C24] hover:underline cursor-pointer"
                        >
                          Effacer
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Popover Content -->
                  <div class="max-h-80 overflow-y-auto divide-y divide-[#D7DBDE]">
                    @if (notificationsHistory.length === 0) {
                      <div class="p-8 text-center text-[#4B5157]">
                        <span class="text-2xl block mb-2">🔔</span>
                        <p class="text-xs font-semibold text-[#1B1D1F]">Aucune notification</p>
                        <p class="text-[10px] text-[#4B5157] mt-0.5">Vous recevrez ici les alertes de notes, cours et devoirs en temps réel.</p>
                      </div>
                    } @else {
                      @for (item of notificationsHistory; track item.id) {
                        <div
                          (click)="markNotificationAsRead(item.id)"
                          class="p-3 hover:bg-[#F5F6F7] transition-colors flex items-start gap-3 cursor-pointer"
                          [class.bg-[#E7F1FA]/30]="!item.read"
                        >
                          <span class="text-base shrink-0 mt-0.5">{{ toastIcon(item.type) }}</span>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-1">
                              <p class="text-xs font-bold text-[#1B1D1F] truncate leading-tight">{{ item.title || 'Alerte pédagogique' }}</p>
                              @if (!item.read) {
                                <span class="w-1.5 h-1.5 rounded-full bg-[#1C75BC] shrink-0"></span>
                              }
                            </div>
                            <p class="text-[11px] text-[#4B5157] mt-0.5 line-clamp-2 leading-snug">{{ item.message }}</p>
                            <span class="text-[9px] text-[#4B5157] font-mono block mt-1">
                              {{ item.receivedAt | date:'dd MMM à HH:mm' }}
                            </span>
                          </div>
                        </div>
                      }
                    }
                  </div>
                </div>
              }
            </div>

            <img 
              src="assets/logo-ministere.png" 
              alt="Ministère de la Formation Professionnelle" 
              class="h-7 sm:h-8 w-auto object-contain opacity-95 hidden md:block" 
              title="Organisme agréé sous tutelle ministérielle"
            />
            <div class="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-xs bg-[#E7F1EA] border border-[#276B44] text-[#276B44] text-[11px] sm:text-xs font-bold shadow-2xs whitespace-nowrap">
              <span class="w-2 h-2 rounded-full" [ngClass]="isOffline ? 'bg-[#F0791E]' : 'bg-[#276B44] animate-pulse'"></span>
              <span>{{ isOffline ? 'Mode Hors-Ligne' : 'En ligne · EUP' }}</span>
            </div>
          </div>
        </header>

        <!-- BANDEAU HORS-LIGNE RÉSILIANT -->
        @if (isOffline) {
          <div class="bg-[#FDECDD] border-b border-[#F0791E] px-4 py-2.5 text-xs text-[#1B1D1F] flex items-center justify-between gap-3 shadow-2xs animate-fade-in">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full bg-[#F0791E] shrink-0 animate-ping"></span>
              <span class="font-bold text-[#F0791E] shrink-0">Mode Hors-Ligne actif :</span>
              <span class="text-[#4B5157] truncate">Connexion réseau interrompue. Les cours et devoirs sont consultables en lecture seule depuis votre session locale.</span>
            </div>
            <button
              type="button"
              (click)="checkConnection()"
              class="px-3 py-1 rounded-xs bg-white border border-[#F0791E] text-[#F0791E] font-bold text-[11px] hover:bg-[#F0791E] hover:text-white transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              Vérifier la connexion
            </button>
          </div>
        }

        <!-- Dynamic Outlet with Responsive Margin & Padding -->
        <main class="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { transform: translateX(110%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .animate-slide-in { animation: slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
  `],
})
export class ApprenantShellComponent implements OnInit, OnDestroy {
  user: any = null;
  completionGlobale: number | null = null;
  isMobileMenuOpen = false;
  sseConnected = false;
  isNotificationsOpen = false;

  // Détection Réseau / Mode Hors-Ligne
  isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  private onlineHandler?: () => void;
  private offlineHandler?: () => void;

  /** Historique des notifications reçues dans la session */
  notificationsHistory: Array<NotificationPayload & { id: number; read: boolean; receivedAt: Date }> = [];

  /** Liste des toasts affichés en overlay */
  toasts: Array<NotificationPayload & { id: number }> = [];
  private toastCounter = 0;

  private sseSubscription?: Subscription;

  get unreadNotificationsCount(): number {
    return this.notificationsHistory.filter((n) => !n.read).length;
  }

  toggleNotificationsPanel(open?: boolean) {
    this.isNotificationsOpen = open !== undefined ? open : !this.isNotificationsOpen;
  }

  markNotificationAsRead(id: number) {
    const notif = this.notificationsHistory.find((n) => n.id === id);
    if (notif) notif.read = true;
  }

  markAllNotificationsAsRead() {
    this.notificationsHistory.forEach((n) => { n.read = true; });
  }

  clearNotifications() {
    this.notificationsHistory = [];
  }

  matricule: string | null = null;

  constructor(
    private auth: AuthService,
    private apprenantService: ApprenantService,
    private notificationsService: NotificationsService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.user = this.auth.currentUser;

    // Récupération instantanée du matricule en cache si disponible
    const profileSnap = this.apprenantService.getProfileSnapshot();
    if (profileSnap?.matricule) {
      this.matricule = profileSnap.matricule;
    }

    this.loadQuickStats();
    this.connectSSE();

    // 1 seule requête HTTP unifiée (Bootstrap) qui peuple immédiatement tout le bundle apprenant
    this.apprenantService.getBootstrap().subscribe({
      next: (bundle) => {
        if (bundle.profile?.matricule) {
          this.matricule = bundle.profile.matricule;
        }
        if (bundle.dashboard) {
          this.completionGlobale = bundle.dashboard.completionGlobale;
        }
      },
      error: () => {},
    });

    // Écouter les mises à jour du Store réactif
    this.apprenantService.bootstrap$.subscribe((bundle) => {
      if (bundle?.profile?.matricule) {
        this.matricule = bundle.profile.matricule;
      }
      if (bundle?.dashboard) {
        this.completionGlobale = bundle.dashboard.completionGlobale;
      }
    });

    // Enregistrement des écouteurs de réseau (Online / Offline)
    if (typeof window !== 'undefined') {
      this.onlineHandler = () => {
        this.isOffline = false;
        this.showToast({
          type: 'BROADCAST',
          title: 'Connexion rétablie',
          message: 'Vos données académiques et notifications sont de nouveau synchronisées en direct.',
        });
        this.connectSSE();
        this.apprenantService.getBootstrap(true).subscribe({ error: () => {} });
      };
      this.offlineHandler = () => {
        this.isOffline = true;
        this.sseConnected = false;
      };
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }

    // Rafraîchir la progression globale à chaque événement temps réel sans rechargement bloquant
    this.apprenantService.liveUpdates$.subscribe((event) => {
      if (
        event.type === 'DEVOIR_NOTE' ||
        event.type === 'NOTE_PUBLIEE' ||
        event.type === 'CERTIFICAT_EMIS' ||
        event.type === 'COURS_COMPLETED' ||
        event.type === 'QUIZ_SUBMITTED' ||
        event.type === 'DEVOIR_DEPOSE'
      ) {
        this.apprenantService.getDashboard().subscribe({
          next: (res) => { this.completionGlobale = res.completionGlobale; },
          error: () => {},
        });
      }
    });
  }

  checkConnection(): void {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.isOffline = false;
      this.connectSSE();
      this.apprenantService.preloadAllLearnerData();
      this.showToast({
        type: 'BROADCAST',
        title: 'Connexion active',
        message: 'Accès au serveur académique confirmé et synchronisé.',
      });
    } else {
      this.isOffline = true;
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      if (this.onlineHandler) window.removeEventListener('online', this.onlineHandler);
      if (this.offlineHandler) window.removeEventListener('offline', this.offlineHandler);
    }
    this.sseSubscription?.unsubscribe();
    this.notificationsService.close();
  }

  /** Ouvre la connexion SSE et branche la logique d'événements. */
  private connectSSE() {
    this.sseSubscription = this.notificationsService.messages().subscribe({
      next: (payload: NotificationPayload) => {
        this.sseConnected = true;
        // 1. Afficher un toast immédiat
        this.showToast(payload);
        // 1b. Ajouter à l'historique des notifications de la session
        this.notificationsHistory.unshift({
          ...payload,
          id: Date.now() + Math.floor(Math.random() * 1000),
          read: false,
          receivedAt: new Date(),
        });
        if (this.notificationsHistory.length > 30) {
          this.notificationsHistory.pop();
        }
        // 2. Invalider le cache + recharger les données en arrière-plan
        this.apprenantService.triggerRealtimeRefresh(payload);
      },
      error: () => { this.sseConnected = false; },
    });

    // Marquer comme connecté dès l'ouverture (EventSource ouvert)
    setTimeout(() => { this.sseConnected = true; }, 1000);
  }

  showToast(payload: NotificationPayload) {
    const id = ++this.toastCounter;
    this.toasts.push({ ...payload, id });
    // Auto-dismiss après 6 secondes
    setTimeout(() => this.dismissToast(id), 6000);
  }

  dismissToast(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  toastIcon(type: string): string {
    const icons: Record<string, string> = {
      DEVOIR_NOTE:                    '📝',
      DEVOIR_DEPOSE:                  '📤',
      NOTE_PUBLIEE:                   '🎯',
      COURS_PUBLIE:                   '📚',
      COURS_COMPLETED:                '✅',
      QUIZ_SUBMITTED:                 '🏆',
      CERTIFICAT_EMIS:                '🎓',
      SEANCE_UPDATE:                  '📅',
      ASSIDUITE_UPDATE:               '⏱️',
      DEMANDE_REGULARISATION:         '⚠️',
      DOCUMENT_REGULARISATION_SOUMIS: '📎',
      DOSSIER_DOCUMENT_AJOUTE:        '📄',
      BROADCAST:                      '📢',
    };
    return icons[type] ?? '🔔';
  }

  toggleMobileMenu(open?: boolean) {
    this.isMobileMenuOpen = open !== undefined ? open : !this.isMobileMenuOpen;
  }

  loadQuickStats() {
    // Charger depuis le cache immédiatement (0ms)
    const snapshot = this.apprenantService.getDashboardSnapshot();
    if (snapshot) this.completionGlobale = snapshot.completionGlobale;

    // Revalider en arrière-plan
    this.apprenantService.getDashboard().subscribe({
      next: (res) => { this.completionGlobale = res.completionGlobale; },
      error: () => {},
    });
  }

  logout() {
    this.notificationsService.close();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
