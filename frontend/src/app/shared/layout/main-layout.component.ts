import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastService } from '../../core/services/toast.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { EtablissementsService } from '../../core/services/etablissements.service';
import { UtilisateursService } from '../../core/services/utilisateurs.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen bg-vc-bg font-sans text-[#1B1D1F] relative">
      <!-- MOBILE BACKDROP OVERLAY -->
      @if (showNav && isMobileMenuOpen) {
        <div
          (click)="toggleMobileMenu(false)"
          class="fixed inset-0 bg-[#1B1D1F]/60 backdrop-blur-xs z-30 md:hidden animate-fade-in"
        ></div>
      }

      @if (showNav) {
        <aside
          class="fixed md:static inset-y-0 left-0 w-64 text-white flex flex-col shadow-2xl md:shadow-xl z-40 flex-shrink-0 transform transition-transform duration-300 ease-in-out md:translate-x-0"
          [class.-translate-x-full]="!isMobileMenuOpen"
          [class.translate-x-0]="isMobileMenuOpen"
          style="background-color: var(--color-vc-dark, #124F80);"
        >
          <!-- Logo & Brand Header -->
          <div class="p-5 border-b border-white/10 bg-black/10">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <img 
                  src="assets/logo-vitalis.png" 
                  alt="Logo Vitalis Center EUP" 
                  width="160"
                  height="40"
                  class="h-10 w-auto object-contain bg-white/95 p-1 rounded-xs shadow-xs"
                />
                <div>
                  <h2 class="text-sm font-bold tracking-tight text-white font-heading leading-tight">VITALIS CENTER</h2>
                  <span class="text-[10px] tracking-wider uppercase font-semibold text-[#F0791E]">Espace Personnel & Staff</span>
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
            <div class="mt-2 text-[10px] text-white/70 leading-tight">
              Aut Foct N°CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026
            </div>

            @if (auth.currentUser) {
              <div class="mt-3 p-2.5 rounded-xs bg-white/10 border border-white/15 flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-full bg-[#1C75BC] text-white font-bold flex items-center justify-center text-xs border border-white/30 shrink-0">
                  {{ auth.currentUser.prenom.charAt(0) }}{{ auth.currentUser.nom.charAt(0) }}
                </div>
                <div class="overflow-hidden">
                  <p class="text-xs font-semibold text-white truncate leading-tight">{{ auth.currentUser.prenom }} {{ auth.currentUser.nom }}</p>
                  <span class="inline-block mt-0.5 px-1.5 py-0.2 rounded-xs bg-white/20 text-white text-[9px] font-bold uppercase">{{ auth.currentUser.role }}</span>
                </div>
              </div>
            }
          </div>

          <!-- Navigation Links -->
          <nav class="flex-1 p-3 space-y-1 overflow-y-auto font-['Public_Sans',sans-serif]">
            
            <!-- ========================================================================= -->
            <!-- ========================================================================= -->
            <!-- 1. ESPACE ADMINISTRATEUR CENTRAL (DIRECTION GÉNÉRALE NATIONALE)          -->
            <!-- ========================================================================= -->
            @if (auth.hasRole('ADMIN_CENTRE')) {
              <div class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#F0791E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Direction & Gouvernance</span>
              </div>

              <a 
                routerLink="/admin/analytics" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Indicateurs & Stats Nationales</span>
              </a>

              <a 
                routerLink="/admin/etablissements" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Réseau des Établissements</span>
              </a>

              <a 
                routerLink="/admin/utilisateurs" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Gestion des Utilisateurs</span>
              </a>

              <a 
                routerLink="/admin/admissions" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Admissions & Doléances</span>
              </a>

              <a 
                routerLink="/admin/accueil" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>CMS & Portail Public</span>
              </a>

              <div class="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#F0791E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                <span>Supervision Pédagogique</span>
              </div>

              <a 
                routerLink="/formations" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Programmes & Formations</span>
              </a>

              <a 
                routerLink="/seances" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Planning & Emploi du temps</span>
              </a>

              <a 
                routerLink="/personnel/assiduite" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Registre d'Assiduité</span>
              </a>
            }

            <!-- ========================================================================= -->
            <!-- 2. ESPACE DIRECTEUR D'ÉTABLISSEMENT SATELLITE (ADMIN_ETABLISSEMENT)       -->
            <!-- ========================================================================= -->
            @if (auth.hasRole('ADMIN_ETABLISSEMENT')) {
              <div class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#F0791E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Administration Établissement</span>
              </div>

              <a 
                routerLink="/admin-etab/dashboard" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                <span>Tableau de bord Antenne</span>
              </a>

              <a 
                routerLink="/admin-etab/utilisateurs" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Utilisateurs de l'Établissement</span>
              </a>

              <a
                routerLink="/admin-etab/sessions-admission"
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Sessions & Candidatures</span>
              </a>

              <div class="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#F0791E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                <span>Pédagogie & Évaluations</span>
              </div>

              <a 
                routerLink="/formations" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Formations</span>
              </a>

              <a 
                routerLink="/seances" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Emploi du temps</span>
              </a>

              <a 
                routerLink="/notes" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Notes & Bulletins</span>
              </a>

              <a 
                routerLink="/devoirs/noter" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Devoirs à corriger</span>
              </a>

              <a 
                routerLink="/personnel/assiduite" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Assiduité & Présences</span>
              </a>
            }

            <!-- ========================================================================= -->
            <!-- 3. ESPACE FORMATEUR                                                       -->
            <!-- ========================================================================= -->
            @if (auth.hasRole('FORMATEUR')) {
              <div class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#F0791E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                <span>Espace Pédagogique</span>
              </div>

              <a 
                routerLink="/dashboard" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Tableau de bord</span>
              </a>

              <a 
                routerLink="/formations" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Mes Formations & Cours</span>
              </a>

              <a 
                routerLink="/seances" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Séances & Émargement</span>
              </a>

              <a 
                routerLink="/notes" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Saisie des Évaluations</span>
              </a>

              <a 
                routerLink="/devoirs/noter" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Correction des Devoirs</span>
              </a>
            }

            <!-- ========================================================================= -->
            <!-- 4. ESPACE PERSONNEL ADMINISTRATIF                                         -->
            <!-- ========================================================================= -->
            @if (auth.hasRole('PERSONNEL_ADMINISTRATIF')) {
              <div class="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-[#F0791E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Scolarité & Secrétariat</span>
              </div>

              <a 
                routerLink="/dashboard" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Tableau de bord</span>
              </a>

              <a
                routerLink="/admin-etab/sessions-admission"
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs"
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Enrôlement & Candidatures</span>
              </a>

              <a 
                routerLink="/personnel/assiduite" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Assiduité & Feuilles d'émargement</span>
              </a>

              <a 
                routerLink="/seances" 
                (click)="toggleMobileMenu(false)"
                routerLinkActive="bg-white/15 text-white font-bold border-l-4 border-[#F0791E] shadow-xs" 
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-[#E7F1FA] hover:bg-white/10 hover:text-white transition-all group"
              >
                <svg class="w-4 h-4 shrink-0 text-[#93C5FD] group-hover:text-[#F0791E] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Planning des Séances</span>
              </a>
            }
          </nav>

          <!-- Logout Button -->
          <div class="p-3 border-t border-white/10 bg-black/10">
            <button
              (click)="auth.logout()"
              class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xs text-xs font-medium text-red-200 hover:bg-red-900/30 hover:text-red-100 transition-all cursor-pointer"
            >
              <svg class="w-4 h-4 text-[#ED1C24]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>
      }

      <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <!-- Top bar with mobile hamburger button if showNav is true -->
        @if (showNav) {
          <div class="md:hidden bg-white border-b border-[#D7DBDE] px-4 py-2.5 flex items-center justify-between">
            <button
              (click)="toggleMobileMenu()"
              class="p-2 rounded-xs border border-[#D7DBDE] hover:bg-[#E7F1FA] text-[#124F80] transition-colors cursor-pointer"
              aria-label="Ouvrir le menu"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span class="text-xs font-bold text-[#124F80]">Vitalis Center EUP</span>
          </div>
        }

        <!-- Bannière d'alerte injonction de régularisation pour l'utilisateur connecté -->
        @if (demandeActive) {
          <div class="bg-[#F0791E] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-[#d86613] z-20 animate-fade-in">
            <div class="flex items-center gap-2.5 text-xs">
              <svg class="w-4 h-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <strong class="font-bold uppercase tracking-wide text-[11px] bg-white/20 px-1.5 py-0.5 rounded-xs">Régularisation administrative requise</strong>
                <span class="ml-2 font-medium">{{ demandeActive.motif }}</span>
                <span class="ml-1 opacity-90">— Transmettez vos pièces justificatives avant le <strong>{{ demandeActive.dateLimite | date:'dd/MM/yyyy' }}</strong>.</span>
              </div>
            </div>
            <button
              type="button"
              (click)="ouvrirModalSoumission()"
              class="bg-white text-[#1B1D1F] font-bold px-3 py-1.5 rounded-xs text-xs hover:bg-[#FDECDD] shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <svg class="w-3.5 h-3.5 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>Déposer les pièces demandées</span>
            </button>
          </div>
        }

        <main class="flex-1 overflow-auto">
          <ng-content />
        </main>

        <!-- MODAL DE SOUMISSION DE PIÈCE DE RÉGULARISATION PAR L'UTILISATEUR -->
        @if (modalSoumissionOuvert && demandeActive) {
          <div class="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white max-w-md w-full rounded-xs shadow-2xl border border-[#D7DBDE] animate-scale-up max-h-[90vh] flex flex-col">
              <div class="flex items-center justify-between border-b border-[#D7DBDE] px-5 py-4 bg-[#FDECDD]">
                <h3 class="text-sm font-bold text-[#1B1D1F] flex items-center gap-2">
                  <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <span>Régularisation de votre dossier</span>
                </h3>
                <button (click)="fermerModalSoumission()" class="text-[#4B5157] hover:text-[#1B1D1F] cursor-pointer">✕</button>
              </div>
              <div class="p-5 space-y-4 text-xs overflow-y-auto">
                <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-[#1B1D1F]">
                  <div class="font-bold mb-1">Motif : {{ demandeActive.motif }}</div>
                  <p class="text-[#4B5157] leading-relaxed">{{ demandeActive.description }}</p>
                  <div class="text-[11px] text-[#124F80] mt-2 font-semibold flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Échéance impérative : {{ demandeActive.dateLimite | date:'dd/MM/yyyy' }}</span>
                  </div>
                </div>

                <form (ngSubmit)="envoyerDocumentSoumission()" class="space-y-4">
                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Intitulé de la pièce transmise *</label>
                    <input type="text" [(ngModel)]="titreSoumission" name="titre" required
                      placeholder="Ex: Carte d'identité recto-verso, Copie certifiée du diplôme..."
                      class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC]"/>
                  </div>

                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Type de document *</label>
                    <select [(ngModel)]="typeDocumentSoumission" name="typeDocument"
                      class="w-full p-2.5 border border-[#9AA1A8] rounded-xs focus:outline-none focus:border-[#1C75BC] bg-white cursor-pointer">
                      <option value="CNI">Carte Nationale d'Identité</option>
                      <option value="PASSEPORT">Passeport</option>
                      <option value="DIPLOME">Diplôme / Certificat</option>
                      <option value="CONTRAT">Contrat / Convention</option>
                      <option value="CURRICULUM_VITAE">Curriculum Vitae</option>
                      <option value="AUTRE">Autre justificatif</option>
                    </select>
                  </div>

                  <div>
                    <label class="block font-semibold text-[#1B1D1F] mb-1">Fichier justificatif *</label>
                    <input type="file" (change)="onFichierSoumissionChange($event)" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required
                      class="w-full p-2 border border-[#9AA1A8] rounded-xs text-xs bg-[#F5F6F7] cursor-pointer"/>
                    @if (fichierSoumission) {
                      <div class="mt-1 text-[10px] text-[#276B44] font-medium flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-[#276B44]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{{ fichierSoumission.name }}</span>
                      </div>
                    }
                  </div>

                  <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#D7DBDE]">
                    <button type="button" (click)="fermerModalSoumission()" class="btn btn-ghost text-xs py-2 px-3 cursor-pointer">
                      Annuler
                    </button>
                    <button type="submit" [disabled]="submittingSoumission" class="btn btn-primary text-xs py-2 px-4 font-semibold cursor-pointer inline-flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                      </svg>
                      <span>{{ submittingSoumission ? 'Envoi en cours...' : 'Transmettre la pièce' }}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @Input() showNav = true;
  isMobileMenuOpen = false;
  private sub: Subscription | null = null;

  demandeActive: any = null;
  modalSoumissionOuvert = false;
  fichierSoumission: File | null = null;
  titreSoumission = '';
  typeDocumentSoumission = 'CNI';
  submittingSoumission = false;

  constructor(
    public auth: AuthService,
    private notifications: NotificationsService,
    private toast: ToastService,
    private analyticsService: AnalyticsService,
    private etablissementsService: EtablissementsService,
    private utilisateursService: UtilisateursService,
  ) {}

  ngOnInit(): void {
    // Pré-chargement proactif en tâche de fond pour l'Admin Central (affichage instantané 0ms sans attente)
    if (this.auth.hasRole('ADMIN_CENTRE')) {
      this.analyticsService.getGlobalDetailed().subscribe({ error: () => {} });
      this.etablissementsService.getAll().subscribe({ error: () => {} });
      this.utilisateursService.getAll().subscribe({ error: () => {} });
    }

    // Vérifier si l'utilisateur connecté fait l'objet d'une demande de régularisation active
    this.verifierRegularisations();

    this.sub = this.notifications.messages().subscribe({
      next: (msg) => {
        if (msg && typeof msg === 'object') {
          if (msg.type?.startsWith('ADMISSION_')) {
            if (this.auth.hasAnyRole(['ADMIN_CENTRE', 'ADMIN_ETABLISSEMENT', 'PERSONNEL_ADMINISTRATIF'])) {
              this.toast.info(msg.message || 'Activité sur les admissions réseau');
            }
          } else if (msg.type === 'DEMANDE_REGULARISATION') {
            this.toast.info(msg.message || 'L\'administration demande la régularisation de votre dossier.');
            this.verifierRegularisations();
          }
        }
      },
    });
  }

  verifierRegularisations() {
    if (this.auth.currentUser) {
      this.utilisateursService.getMesDemandesRegularisation().subscribe({
        next: (demandes) => {
          if (Array.isArray(demandes)) {
            this.demandeActive = demandes.find(d => d.statut === 'EN_ATTENTE' || d.statut === 'REJETEE') || null;
          }
        },
        error: () => {
          this.demandeActive = null;
        }
      });
    }
  }

  ouvrirModalSoumission() {
    this.modalSoumissionOuvert = true;
    this.titreSoumission = '';
    this.fichierSoumission = null;
    this.typeDocumentSoumission = 'CNI';
  }

  fermerModalSoumission() {
    this.modalSoumissionOuvert = false;
    this.fichierSoumission = null;
    this.titreSoumission = '';
  }

  onFichierSoumissionChange(e: any) {
    if (e.target.files && e.target.files.length > 0) {
      this.fichierSoumission = e.target.files[0];
    }
  }

  envoyerDocumentSoumission() {
    if (!this.demandeActive || !this.fichierSoumission || !this.titreSoumission) {
      this.toast.error('Veuillez renseigner le titre et sélectionner le fichier à transmettre.');
      return;
    }
    this.submittingSoumission = true;
    this.utilisateursService.soumettreDocumentRegularisation(
      this.demandeActive.id,
      this.fichierSoumission,
      this.titreSoumission,
      this.typeDocumentSoumission,
    ).subscribe({
      next: () => {
        this.submittingSoumission = false;
        this.toast.success('Document transmis avec succès à l\'Administration. Votre dossier est en cours de révision.');
        this.fermerModalSoumission();
        this.verifierRegularisations();
      },
      error: () => {
        this.submittingSoumission = false;
        this.toast.error('Échec lors de la transmission du document. Veuillez réessayer.');
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleMobileMenu(open?: boolean) {
    this.isMobileMenuOpen = open !== undefined ? open : !this.isMobileMenuOpen;
  }
}
