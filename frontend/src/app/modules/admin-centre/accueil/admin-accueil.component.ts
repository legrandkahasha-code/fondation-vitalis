import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LandingService } from '../../../core/services/landing.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { environment } from '../../../../environments/environment';
import {
  LandingPageSettings,
  LandingPageSection,
  LandingPageTemoignage,
  LandingPageActualite,
  LandingPageFormateur,
  LandingPageCampus,
  LandingPagePartenaire,
  LandingNewsletterAbonne,
  ContactMessageItem,
} from '../../../core/models';
import { buildWhatsappUrl, notifyLandingSettingsChanged, isWhatsappEnabled } from '../../../core/utils/whatsapp.util';

@Component({
  selector: 'app-admin-accueil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="max-w-6xl mx-auto pb-16 font-['Public_Sans',sans-serif]">
        
        <!-- En-tête de section avec signature charte graphique -->
        <div class="mb-8 bg-white border border-[#D7DBDE] p-6 rounded-[2px] shadow-2xs">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="text-[12px] uppercase font-semibold tracking-[0.06em] text-[#4B5157]">
                01 · Administration Centrale · CMS Landing Page 100% Dynamique
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] mt-1 tracking-tight">
                Gestion Intégrale de la Page d'Accueil
              </h1>
              <div class="barre"></div>
              <p class="text-[14px] text-[#4B5157] mt-3 max-w-2xl leading-relaxed">
                Administrez en temps réel l'intégralité du portail public : Hero, Chiffres clés, Formateurs, Campus & Ateliers, Partenaires, Témoignages vérifiés, Actualités, Pédagogie APC, FAQ et Abonnés Newsletter.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <a routerLink="/" target="_blank" class="btn btn-secondary text-xs py-2 px-4 shadow-2xs font-semibold">
                Voir le site public ↗
              </a>
              <button type="button" (click)="chargerDonnees()" [disabled]="loading" class="btn btn-ghost text-xs py-2 px-3.5">
                Actualiser
              </button>
            </div>
          </div>
        </div>

        <!-- Système d'onglets conforme charte graphique (.app-tabs avec accent orange) -->
        <div class="bg-white border border-[#D7DBDE] mb-6 rounded-[2px] shadow-2xs">
          <div class="flex overflow-x-auto border-b border-[#D7DBDE] px-3">
            <button
              *ngFor="let tab of tabs"
              (click)="activeTab = tab.id"
              [class.text-[#1C75BC]]="activeTab === tab.id"
              [class.border-b-[#F0791E]]="activeTab === tab.id"
              [class.bg-[#F5F6F7]]="activeTab === tab.id"
              [class.text-[#4B5157]]="activeTab !== tab.id"
              [class.border-b-transparent]="activeTab !== tab.id"
              class="px-3 sm:px-4 py-2.5 sm:py-3 text-[12px] sm:text-[13px] font-semibold transition-all border-b-[3px] flex items-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer hover:text-[#1B1D1F] hover:bg-[#F5F6F7]/50"
            >
              <span>{{ tab.label }}</span>
            </button>
          </div>
        </div>

        <!-- 1. ONGLET PARAMÈTRES GÉNÉRAUX & HERO & STATS & VIDÉO & RÉSEAUX -->
        <div *ngIf="activeTab === 'settings'" class="space-y-6 animate-fade-in-up">
          
          <div class="notice">
            <strong>Configuration en direct</strong>
            Toute modification enregistrée prend immédiatement effet sur la page d'accueil accessible à tous les visiteurs.
          </div>

          <form (ngSubmit)="sauvegarderSettings()" class="space-y-6">
            
            <!-- Topbar & Autorisation Officielle -->
            <div class="card border-t-[5px] border-t-[#124F80]">
              <div class="label">Bandeau Supérieur & Agréments Officiels</div>
              
              <div class="grid md:grid-cols-2 gap-4">
                <div class="field">
                  <label for="topbarTexte">Texte du Bandeau d'En-tête (Topbar Institutionnelle)</label>
                  <input id="topbarTexte" type="text" [(ngModel)]="settings.topbarTexte" name="topbarTexte" class="font-medium" placeholder="Ex : République Démocratique du Congo · Ministère de la Formation Professionnelle" />
                  <div class="hint">Affiché tout en haut sur fond bleu nuit.</div>
                </div>

                <div class="field">
                  <label for="heroAgrement">Numéro d'Agrément / Autorisation Ministérielle</label>
                  <input id="heroAgrement" type="text" [(ngModel)]="settings.heroNumeroAgrement" name="heroNumeroAgrement" class="font-mono font-bold text-[#124F80]" required />
                  <div class="hint">Mention légale officielle affichée dans la topbar, le badge Hero et le footer.</div>
                </div>
              </div>
            </div>

            <!-- Section Hero -->
            <div class="card border-t-[5px] border-t-[#1C75BC]">
              <div class="label">Section Principale (Hero) — Split Layout International</div>
              <p class="text-xs text-[#4B5157] mb-4">
                Conforme aux standards internationaux : texte institutionnel à gauche et composition visuelle humaine avec micro-badges à droite.
              </p>
              
              <div class="space-y-4">
                <div class="field">
                  <label for="heroTitre">Titre Principal du Hero *</label>
                  <input id="heroTitre" type="text" [(ngModel)]="settings.heroTitre" name="heroTitre" class="font-bold text-[#1B1D1F]" required />
                </div>

                <div class="field">
                  <label for="heroSousTitre">Texte de Présentation / Sous-titre Institutionnel *</label>
                  <textarea id="heroSousTitre" rows="3" [(ngModel)]="settings.heroSousTitre" name="heroSousTitre" required></textarea>
                  <div class="hint">Présentation de la mission d'utilité publique, de la tutelle et de l'Approche par Compétences (APC).</div>
                </div>

                <!-- Image Visuelle du Hero (Split Layout International) -->
                <div class="p-4 bg-[#F9FAFB] border border-[#D7DBDE] rounded-[4px] space-y-3">
                  <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div class="font-bold text-[#124F80] text-xs flex items-center gap-1.5">
                        <span>📸</span> Photo Principale du Hero (Mise en page Split internationale)
                      </div>
                      <div class="text-[11px] text-[#4B5157]">
                        Recommandé : photo haute définition d'un atelier pratique, salle informatique ou apprenants en formation (ratio 4:3 ou 16:9).
                      </div>
                    </div>
                    @if (settings.heroImage) {
                      <button 
                        type="button" 
                        (click)="supprimerHeroImage()" 
                        class="text-[11px] text-[#ED1C24] hover:underline font-bold cursor-pointer"
                      >
                        ✕ Réinitialiser la photo
                      </button>
                    }
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <!-- Aperçu Image -->
                    <div class="md:col-span-4 relative rounded-lg overflow-hidden border border-[#D7DBDE] bg-slate-100 aspect-[4/3] shadow-xs">
                      <img 
                        [src]="getHeroImagePreview()" 
                        (error)="onImageError($event)" 
                        alt="Aperçu Hero" 
                        class="w-full h-full object-cover"
                      />
                      <div class="absolute bottom-1 right-1 bg-black/65 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                        {{ settings.heroImage ? 'Personnalisée' : 'Par défaut' }}
                      </div>
                    </div>

                    <!-- Contrôles d'upload et URL directe -->
                    <div class="md:col-span-8 space-y-2.5">
                      <input 
                        id="heroImageFileInput" 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp,image/gif" 
                        (change)="onHeroImageSelected($event)" 
                        class="hidden" 
                      />

                      <div class="flex flex-wrap items-center gap-2">
                        <button 
                          type="button" 
                          (click)="declencherInputHeroImage()" 
                          [disabled]="uploadingHeroImage"
                          class="btn btn-primary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>📁</span>
                          <span>{{ uploadingHeroImage ? 'Téléversement en cours...' : 'Choisir une photo sur votre appareil' }}</span>
                        </button>
                      </div>

                      <div class="field">
                        <label for="heroImageUrlInput" class="text-[11px] text-[#4B5157]">Ou coller une URL d'image web directe</label>
                        <input 
                          id="heroImageUrlInput" 
                          type="url" 
                          [(ngModel)]="settings.heroImage" 
                          name="heroImage" 
                          placeholder="https://images.unsplash.com/..." 
                          class="text-xs p-2 bg-white border border-[#D7DBDE] rounded-[2px]" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Micro-badges flottants du Hero -->
                <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[4px] space-y-3">
                  <div class="font-bold text-[#124F80] text-xs flex items-center gap-1.5">
                    <span>🏷️</span> Textes des Micro-Badges Flottants du Hero
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="field">
                      <label class="text-[11px] text-[#124F80]">Badge 1 (Insertion)</label>
                      <input type="text" [(ngModel)]="settings.heroBadge1Texte" name="heroBadge1Texte" placeholder="94% Insertion Professionnelle" class="text-xs" />
                    </div>
                    <div class="field">
                      <label class="text-[11px] text-[#276B44]">Badge 2 (Agrément)</label>
                      <input type="text" [(ngModel)]="settings.heroBadge2Texte" name="heroBadge2Texte" placeholder="Agrément Officiel RDC" class="text-xs" />
                    </div>
                    <div class="field">
                      <label class="text-[11px] text-[#F0791E]">Badge 3 (Sécurité)</label>
                      <input type="text" [(ngModel)]="settings.heroBadge3Texte" name="heroBadge3Texte" placeholder="Certificats Infalsifiables" class="text-xs" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- Notification Live & Raccourci Vidéo -->
            <div class="card border-t-[5px] border-t-[#2AA9A0]">
              <div class="label">Flux Live Activity & Présentation Vidéo</div>
              <div class="grid md:grid-cols-2 gap-4">
                <div class="field">
                  <label for="liveActivityTexte">Bandeau d'Activité / Notification d'Inscription en Temps Réel</label>
                  <input id="liveActivityTexte" type="text" [(ngModel)]="settings.liveActivityTexte" name="liveActivityTexte" placeholder="Ex : 🚀 Session d'avril 2026 ouverte : 87 candidats déjà inscrits cette semaine !" />
                  <div class="hint">Affiché en toast ou ticker dynamique pour stimuler l'urgence d'inscription.</div>
                </div>

                <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px] flex flex-col justify-between">
                  <div>
                    <div class="font-bold text-xs text-[#124F80] flex items-center gap-1.5">
                      <span>🎬</span>
                      <span>Section Vidéo Institutionnelle Dédiée</span>
                    </div>
                    <p class="text-xs text-[#4B5157] mt-1 leading-snug">
                      La présentation officielle dispose d'un onglet dédié complet avec aperçu visuel en direct, réglage des textes, miniature et badges.
                    </p>
                  </div>
                  <button type="button" (click)="activeTab = 'video'" class="btn btn-secondary text-xs mt-2 py-1.5 px-3 self-start cursor-pointer font-semibold text-[#1C75BC]">
                    Ouvrir l'onglet Vidéo Institutionnelle ↗
                  </button>
                </div>
              </div>
            </div>

            <!-- Réseaux Sociaux & Géolocalisation Map -->
            <div class="card border-t-[5px] border-t-[#0077B5]">
              <div class="label">Réseaux Sociaux Officiels & Plan d'Accès Google Maps</div>
              <div class="grid md:grid-cols-3 gap-4">
                <div class="field">
                  <label>Page LinkedIn</label>
                  <input type="url" [(ngModel)]="settings.socialLinkedin" name="socialLinkedin" placeholder="https://linkedin.com/company/vitalis-center" />
                </div>
                <div class="field">
                  <label>Page Facebook</label>
                  <input type="url" [(ngModel)]="settings.socialFacebook" name="socialFacebook" placeholder="https://facebook.com/vitaliscenter" />
                </div>
                <div class="field">
                  <label>Chaîne YouTube</label>
                  <input type="url" [(ngModel)]="settings.socialYoutube" name="socialYoutube" placeholder="https://youtube.com/@vitaliscenter" />
                </div>
              </div>

              <div class="field mt-4">
                <label>URL d'Intégration Carte Interactive (Google Maps / OpenStreetMap Embed)</label>
                <input type="url" [(ngModel)]="settings.mapEmbedUrl" name="mapEmbedUrl" placeholder="https://www.google.com/maps/embed?pb=..." />
                <div class="hint">Permet d'afficher la carte géographique exacte du campus principal dans la section Contact.</div>
              </div>
            </div>

            <!-- Section Chiffres Clés (Stat-row) -->
            <div class="card border-t-[5px] border-t-[#F0791E]">
              <div class="label">Chiffres Clés & Indicateurs d'Impact</div>
              <p class="text-xs text-[#4B5157] mb-4">Ces valeurs alimentent l'animation de décompte progressif au scroll sur la page d'accueil.</p>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                  <div class="field">
                    <label class="text-[#124F80]">Lauréats Certifiés</label>
                    <input type="number" [(ngModel)]="settings.statsLaureats" name="statsLaureats" class="font-bold text-lg text-[#124F80]" />
                    <div class="hint">Affiché avec « + »</div>
                  </div>
                </div>

                <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                  <div class="field">
                    <label class="text-[#F0791E]">Taux de Réussite (%)</label>
                    <input type="number" [(ngModel)]="settings.statsTauxReussite" name="statsTauxReussite" min="0" max="100" class="font-bold text-lg text-[#F0791E]" />
                    <div class="hint">Affiché avec « % »</div>
                  </div>
                </div>

                <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                  <div class="field">
                    <label class="text-[#276B44]">Filières Métiers</label>
                    <input type="number" [(ngModel)]="settings.statsFilieres" name="statsFilieres" class="font-bold text-lg text-[#276B44]" />
                    <div class="hint">Affiché avec « + »</div>
                  </div>
                </div>

                <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                  <div class="field">
                    <label class="text-[#1C75BC]">Titres Vérifiables (%)</label>
                    <input type="number" [(ngModel)]="settings.statsTitresVerif" name="statsTitresVerif" min="0" max="100" class="font-bold text-lg text-[#1C75BC]" />
                    <div class="hint">Vérification QR Code</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- CTA Bannière -->
            <div class="card border-t-[5px] border-t-[#276B44]">
              <div class="label">Bannière d'Appel à l'Action (CTA Inscription)</div>
              <div class="grid md:grid-cols-2 gap-4">
                <div class="field">
                  <label>Titre de la Bannière d'Inscription</label>
                  <input type="text" [(ngModel)]="settings.ctaTitre" name="ctaTitre" class="font-bold" />
                </div>
                <div class="field">
                  <label>Période / Sous-titre d'Ouverture des Sessions</label>
                  <input type="text" [(ngModel)]="settings.ctaSousTitre" name="ctaSousTitre" />
                </div>
              </div>
            </div>

            <!-- Bouton d'enregistrement -->
            <div class="flex justify-end pt-2">
              <button type="submit" [disabled]="savingSettings" class="btn bg-[#F0791E] hover:bg-[#d6610b] text-white border-none font-bold py-3 px-8 shadow-xs hover:scale-102 transition-transform cursor-pointer">
                {{ savingSettings ? 'Enregistrement en cours...' : '💾 Enregistrer les Paramètres' }}
              </button>
            </div>

          </form>

        </div>

        <!-- 1.BIS ONGLET DÉDIÉ : VIDÉO INSTITUTIONNELLE & IMMERSION -->
        <div *ngIf="activeTab === 'video'" class="space-y-6 animate-fade-in-up">
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2px] border border-[#D7DBDE] shadow-2xs">
            <div>
              <div class="label" style="margin-bottom: 2px;">Section Multimédia Vitrine</div>
              <h3 class="text-lg font-bold text-[#1B1D1F]">🎬 Vidéo Institutionnelle & Immersion</h3>
              <p class="text-xs text-[#4B5157] mt-0.5">
                Pilotez la présentation officielle affichée entre la visite des campus et le processus d'admission.
              </p>
            </div>

            <!-- Interrupteur d'activation globale du bloc -->
            <div class="flex items-center gap-3 bg-[#F5F6F7] border border-[#D7DBDE] px-4 py-2 rounded-[2px]">
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" [(ngModel)]="settings.videoActif" (change)="sauvegarderSettings()" class="sr-only peer" />
                <div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#276B44]"></div>
              </label>
              <div class="text-xs font-semibold" [ngClass]="settings.videoActif !== false ? 'text-[#276B44]' : 'text-[#7B838A]'">
                {{ settings.videoActif !== false ? 'Section Activée sur le site' : 'Section Masquée' }}
              </div>
            </div>
          </div>

          <form (ngSubmit)="sauvegarderSettings()" class="space-y-6">

            <div class="grid lg:grid-cols-12 gap-6">
              
              <!-- Volet Gauche : Textes & Liens d'action -->
              <div class="lg:col-span-6 space-y-5">
                
                <div class="card border-t-[5px] border-t-[#124F80]">
                  <div class="label">Textes & Boutons d'Action (Volet Gauche)</div>
                  
                  <div class="space-y-4">
                    <div class="field">
                      <label for="videoSousTitre">Badge Supérieur (Catégorie avec pastille orange)</label>
                      <input id="videoSousTitre" type="text" [(ngModel)]="settings.videoSousTitre" name="videoSousTitre" placeholder="Vidéo Institutionnelle" />
                      <div class="hint">Ex : Vidéo Institutionnelle, Présentation Officielle...</div>
                    </div>

                    <div class="field">
                      <label for="videoTitre">Grand Titre Principal *</label>
                      <input id="videoTitre" type="text" [(ngModel)]="settings.videoTitre" name="videoTitre" class="font-bold text-base" placeholder="Découvrez Vitalis Center en Action" required />
                    </div>

                    <div class="field">
                      <label for="videoDescription">Description / Paragraphe de Présentation *</label>
                      <textarea id="videoDescription" [(ngModel)]="settings.videoDescription" name="videoDescription" rows="4" placeholder="Visionnez la présentation officielle de notre établissement d'utilité publique : témoignages de formateurs, immersion en atelier et parcours des diplômés." required></textarea>
                    </div>

                    <div class="grid sm:grid-cols-2 gap-4 pt-2">
                      <div class="field">
                        <label for="videoBoutonPrincipal">Bouton Principal (Ouvre le lecteur)</label>
                        <input id="videoBoutonPrincipal" type="text" [(ngModel)]="settings.videoBoutonPrincipal" name="videoBoutonPrincipal" placeholder="Lancer la présentation (3 min)" />
                      </div>
                      <div class="field">
                        <label for="videoBoutonSecondaire">Bouton Secondaire (Libellé)</label>
                        <input id="videoBoutonSecondaire" type="text" [(ngModel)]="settings.videoBoutonSecondaire" name="videoBoutonSecondaire" placeholder="Prendre rendez-vous sur place" />
                      </div>
                    </div>

                    <div class="field">
                      <label for="videoBoutonSecondaireUrl">Lien / Cible du Bouton Secondaire</label>
                      <input id="videoBoutonSecondaireUrl" type="text" [(ngModel)]="settings.videoBoutonSecondaireUrl" name="videoBoutonSecondaireUrl" placeholder="#contact ou /candidature" />
                      <div class="hint">Lien d'ancrage (#contact) ou URL interne/externe.</div>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Volet Droit : Lecteur, Média et Habillage de la Vidéo -->
              <div class="lg:col-span-6 space-y-5">
                
                <div class="card border-t-[5px] border-t-[#F0791E]">
                  <div class="label">Média Vidéo & Habillage du Lecteur</div>

                  <div class="space-y-4">
                    <div class="field">
                      <label for="videoUrlInput">Vidéo de Présentation (Lien ou Fichier Local)</label>
                      <div class="flex gap-2 items-center">
                        <input id="videoUrlInput" type="url" [(ngModel)]="settings.videoPresentationUrl" (blur)="formatVideoUrlInput()" name="videoPresentationUrl" placeholder="https://www.youtube.com/watch?v=... ou fichier téléversé" class="font-mono text-xs grow" />
                        <label class="btn btn-secondary text-xs px-3 py-2 cursor-pointer flex items-center gap-1 shrink-0">
                          <span>🎬 Téléverser vidéo</span>
                          <input type="file" (change)="onVideoPresentationSelected($event)" accept="video/mp4,video/webm,video/ogg,video/quicktime" class="hidden" />
                        </label>
                      </div>
                      <div *ngIf="uploadingVideoPresentation" class="text-xs text-[#F0791E] mt-1 font-semibold animate-pulse">
                        ⏳ Téléversement de la vidéo en cours… Veuillez patienter.
                      </div>
                      <div class="hint">Accepte les liens YouTube (watch?v=…), courts (youtu.be), Vimeo — OU téléversez un fichier vidéo directement (MP4, WebM, MOV, max 200 Mo).</div>
                    </div>

                    <!-- Téléversement ou choix de la miniature -->
                    <div class="field">
                      <label>Image Miniature / Poster de Couverture</label>
                      <div class="flex gap-2">
                        <input type="text" [(ngModel)]="settings.videoPosterUrl" name="videoPosterUrl" placeholder="assets/actualites/actu-lms-deploiement.jpg ou URL" class="text-xs font-mono grow" />
                        <label class="btn btn-secondary text-xs px-3 py-2 cursor-pointer flex items-center gap-1 shrink-0">
                          <span>📁 Téléverser</span>
                          <input type="file" (change)="onVideoPosterSelected($event)" accept="image/*" class="hidden" />
                        </label>
                      </div>
                      <div *ngIf="uploadingVideoPoster" class="text-xs text-[#1C75BC] mt-1 font-semibold animate-pulse">
                        Téléversement de la miniature en cours...
                      </div>
                    </div>

                    <!-- Incrustations graphiques sur la miniature -->
                    <div class="grid sm:grid-cols-2 gap-3 pt-2">
                      <div class="field">
                        <label class="text-[11px]">Badge Haut Gauche</label>
                        <input type="text" [(ngModel)]="settings.videoBadgeHaut" name="videoBadgeHaut" placeholder="VITALIS CENTER EUP" class="text-xs" />
                      </div>
                      <div class="field">
                        <label class="text-[11px] text-[#F0791E]">Badge Bas (Orange)</label>
                        <input type="text" [(ngModel)]="settings.videoBadgeBas" name="videoBadgeBas" placeholder="INNOVATION NATIONALE" class="text-xs font-bold" />
                      </div>
                    </div>

                    <div class="field">
                      <label class="text-[11px]">Titre en Surimpression sur la Vidéo</label>
                      <input type="text" [(ngModel)]="settings.videoTitreOverlay" name="videoTitreOverlay" placeholder="Déploiement National du Système Numérique..." class="text-xs font-semibold" />
                    </div>

                    <div class="field">
                      <label class="text-[11px]">Sous-titre en Surimpression sur la Vidéo</label>
                      <input type="text" [(ngModel)]="settings.videoSousTitreOverlay" name="videoSousTitreOverlay" placeholder="Centre de Formation Professionnelle Agréé · Kinshasa, RDC" class="text-xs" />
                    </div>

                    <div class="grid sm:grid-cols-2 gap-3">
                      <div class="field">
                        <label class="text-[11px]">Légende en Pied de Vidéo</label>
                        <input type="text" [(ngModel)]="settings.videoLegende" name="videoLegende" placeholder="Reportage Ministère de la Formation Professionnelle" class="text-xs" />
                      </div>
                      <div class="field">
                        <label class="text-[11px]">Durée Affichée</label>
                        <input type="text" [(ngModel)]="settings.videoDuree" name="videoDuree" placeholder="03:15" class="text-xs font-mono" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <!-- APERÇU EN DIRECT (LIVE PREVIEW HAUTE FIDÉLITÉ) -->
            <div class="card border-t-[5px] border-t-[#2AA9A0]">
              <div class="flex items-center justify-between mb-3">
                <div class="label" style="margin-bottom: 0;">👁️ Aperçu Visuel en Direct (Rendu Public pour les Visiteurs)</div>
                <span class="text-xs text-[#4B5157] italic">Se met à jour en temps réel selon vos saisies ci-dessus</span>
              </div>

              <div class="bg-[#124F80] rounded-xl text-white p-5 sm:p-8 shadow-xl overflow-hidden relative">
                <div class="grid lg:grid-cols-12 gap-6 items-center">
                  <div class="lg:col-span-5 space-y-3">
                    <div class="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-[#C6D2E3]">
                      <span class="w-2 h-2 rounded-full bg-[#F0791E]"></span>
                      <span>{{ settings.videoSousTitre || 'Vidéo Institutionnelle' }}</span>
                    </div>
                    <h3 class="text-xl sm:text-2xl font-bold leading-tight">{{ settings.videoTitre || 'Découvrez Vitalis Center en Action' }}</h3>
                    <p class="text-xs sm:text-sm text-[#C6D2E3] leading-relaxed">
                      {{ settings.videoDescription || 'Visionnez la présentation officielle de notre établissement d\'utilité publique...' }}
                    </p>
                    <div class="pt-2 flex flex-wrap gap-2.5">
                      <span class="btn bg-[#F0791E] text-white py-2 px-4 font-bold text-xs shadow-md inline-flex items-center gap-2">
                        <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <span>{{ settings.videoBoutonPrincipal || 'Lancer la présentation (3 min)' }}</span>
                      </span>
                      <span class="btn btn-secondary text-white border-white/30 py-2 px-3 text-xs font-semibold">
                        {{ settings.videoBoutonSecondaire || 'Prendre rendez-vous sur place' }}
                      </span>
                    </div>
                  </div>

                  <div class="lg:col-span-7">
                    <div class="aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/20 relative shadow-2xl">
                      <img [src]="getMediaUrl(settings.videoPosterUrl) || 'assets/actualites/actu-lms-deploiement.jpg'" alt="Aperçu vidéo" class="w-full h-full object-cover opacity-80" />
                      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/30 flex flex-col justify-between p-3.5 sm:p-4">
                        <div class="flex items-center justify-between">
                          <span class="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold tracking-wide text-white uppercase">
                            {{ settings.videoBadgeHaut || 'VITALIS CENTER EUP' }}
                          </span>
                        </div>
                        <div class="flex items-center justify-center my-auto">
                          <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#F0791E] text-white flex items-center justify-center shadow-lg">
                            <svg class="w-6 h-6 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                        <div class="space-y-1">
                          <div *ngIf="settings.videoBadgeBas" class="inline-block px-1.5 py-0.5 bg-[#F0791E] text-white rounded text-[9px] font-bold uppercase">
                            {{ settings.videoBadgeBas }}
                          </div>
                          <div *ngIf="settings.videoTitreOverlay" class="text-xs sm:text-sm font-bold text-white leading-tight">
                            {{ settings.videoTitreOverlay }}
                          </div>
                          <div *ngIf="settings.videoSousTitreOverlay" class="text-[10px] text-white/80">
                            {{ settings.videoSousTitreOverlay }}
                          </div>
                          <div class="pt-1.5 border-t border-white/20 flex justify-between items-center text-[10px] text-white/90">
                            <span class="truncate">{{ settings.videoLegende || 'Reportage Ministère de la Formation Professionnelle' }}</span>
                            <span class="bg-black/60 px-1.5 py-0.5 rounded font-mono">{{ settings.videoDuree || '03:15' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bouton d'enregistrement général pour la section vidéo -->
            <div class="flex justify-end pt-3">
              <button type="submit" [disabled]="savingSettings" class="btn bg-[#F0791E] hover:bg-[#d6610b] text-white border-none font-bold py-3 px-8 shadow-xs hover:scale-102 transition-transform cursor-pointer">
                {{ savingSettings ? 'Enregistrement en cours...' : '💾 Enregistrer les Modifications Vidéo' }}
              </button>
            </div>

          </form>

        </div>

        <!-- 2. ONGLET FORMATEURS & EXPERTS MÉTIERS -->
        <div *ngIf="activeTab === 'formateurs'" class="space-y-6 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2px] border border-[#D7DBDE] shadow-2xs">
            <div>
              <div class="label" style="margin-bottom: 2px;">Corps Pédagogique & Experts Métiers</div>
              <h3 class="text-lg font-bold text-[#1B1D1F]">Formateurs, Mentors & Praticiens Certifiés</h3>
              <p class="text-xs text-[#4B5157] mt-0.5">Mettez en avant l'excellence de votre équipe pédagogique et leur expérience industrielle.</p>
            </div>
            <button (click)="ouvrirModalFormateur()" class="btn btn-primary text-xs py-2.5 px-5 font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
              <span>+</span>
              <span>Ajouter un formateur</span>
            </button>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div *ngFor="let f of formateursList" class="card border border-[#D7DBDE] flex flex-col justify-between hover:border-[#1C75BC] transition-all bg-white">
              <div>
                <div class="flex items-start gap-3.5 mb-3 pb-3 border-b border-[#F5F6F7]">
                  <img 
                    [src]="getMediaUrl(f.photoUrl || f.photo) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'" 
                    [alt]="f.nom"
                    class="w-14 h-14 rounded-full object-cover border-2 border-[#1C75BC] shrink-0"
                    (error)="onImageError($event, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop')"
                  />
                  <div class="min-w-0">
                    <h4 class="font-bold text-[#1B1D1F] text-sm truncate">{{ f.nom }}</h4>
                    <div class="text-[11px] font-semibold text-[#1C75BC] truncate">{{ f.titre }}</div>
                    <div class="text-[10px] text-[#276B44] font-medium mt-0.5">⏱️ {{ f.experience }}</div>
                  </div>
                </div>

                <div class="text-xs font-semibold text-[#F0791E] mb-1">
                  🎓 Spécialité : {{ f.specialite }}
                </div>
                <div *ngIf="f.linkedin" class="text-[11px] text-[#0077B5] flex items-center gap-1 mb-2">
                  <span>🔗</span> <a [href]="f.linkedin" target="_blank" class="hover:underline truncate">{{ f.linkedin }}</a>
                </div>
              </div>

              <div class="pt-3 border-t border-[#F5F6F7] flex items-center justify-between gap-2">
                <span class="tag" [ngClass]="f.actif !== false ? 'valide' : 'attente'">
                  {{ f.actif !== false ? 'En ligne' : 'Masqué' }}
                </span>
                <div class="flex items-center gap-1">
                  <button (click)="toggleFormateurActif(f)" class="btn btn-ghost text-xs py-1 px-2.5" [title]="f.actif !== false ? 'Masquer' : 'Afficher'">
                    {{ f.actif !== false ? '👁️' : '✅' }}
                  </button>
                  <button (click)="editerFormateur(f)" class="btn btn-ghost text-xs py-1 px-2.5" title="Modifier">
                    ✏️
                  </button>
                  <button (click)="supprimerFormateur(f.id!)" class="btn btn-ghost text-xs py-1 px-2.5 text-[#ED1C24] border-[#ED1C24]" title="Supprimer">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="formateursList.length === 0" class="p-10 text-center bg-white border border-[#D7DBDE] rounded-[2px] text-xs text-[#4B5157]">
            Aucun formateur enregistré. Cliquez sur « + Ajouter un formateur » pour créer votre première fiche.
          </div>
        </div>

        <!-- 3. ONGLET CAMPUS, ATELIERS & ÉQUIPEMENTS -->
        <div *ngIf="activeTab === 'campus'" class="space-y-6 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2px] border border-[#D7DBDE] shadow-2xs">
            <div>
              <div class="label" style="margin-bottom: 2px;">Infrastructures & Espaces Techniques</div>
              <h3 class="text-lg font-bold text-[#1B1D1F]">Campus, Ateliers Pratiques & Laboratoires</h3>
              <p class="text-xs text-[#4B5157] mt-0.5">Présentez les installations, plateaux techniques et équipements professionnels du centre.</p>
            </div>
            <button (click)="ouvrirModalCampus()" class="btn btn-primary text-xs py-2.5 px-5 font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
              <span>+</span>
              <span>Ajouter un espace campus</span>
            </button>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div *ngFor="let c of campusList" class="card border border-[#D7DBDE] flex flex-col justify-between hover:border-[#1C75BC] transition-all bg-white p-0 overflow-hidden">
              <div class="relative h-40 bg-slate-100">
                <img 
                  [src]="getMediaUrl(c.photoUrl || c.photo) || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop'" 
                  [alt]="c.titre"
                  class="w-full h-full object-cover"
                  (error)="onImageError($event, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop')"
                />
                <div class="absolute top-2.5 left-2.5">
                  <span *ngIf="c.badge" class="px-2 py-0.5 text-[10px] font-bold bg-[#1C75BC] text-white uppercase rounded-2xs shadow-xs">
                    {{ c.badge }}
                  </span>
                </div>
                <div class="absolute top-2.5 right-2.5">
                  <span class="tag" [ngClass]="c.actif !== false ? 'valide' : 'attente'">
                    {{ c.actif !== false ? 'Visible' : 'Masqué' }}
                  </span>
                </div>
              </div>

              <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="font-bold text-[#1B1D1F] text-sm mb-1">{{ c.titre }}</h4>
                  <p class="text-xs text-[#4B5157] line-clamp-3 mb-2 leading-relaxed">{{ c.description }}</p>
                  <div class="text-[11px] font-semibold text-[#124F80] bg-[#E7F1FA] p-2 rounded-2xs border border-[#1C75BC]/20">
                    ⚙️ <strong>Équipements :</strong> {{ c.equipements }}
                  </div>
                </div>

                <div class="pt-3 mt-3 border-t border-[#F5F6F7] flex items-center justify-end gap-1.5">
                  <button (click)="toggleCampusActif(c)" class="btn btn-ghost text-xs py-1 px-2.5" [title]="c.actif !== false ? 'Masquer' : 'Afficher'">
                    {{ c.actif !== false ? '👁️' : '✅' }}
                  </button>
                  <button (click)="editerCampus(c)" class="btn btn-ghost text-xs py-1 px-2.5" title="Modifier">
                    ✏️
                  </button>
                  <button (click)="supprimerCampus(c.id!)" class="btn btn-ghost text-xs py-1 px-2.5 text-[#ED1C24] border-[#ED1C24]" title="Supprimer">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="campusList.length === 0" class="p-10 text-center bg-white border border-[#D7DBDE] rounded-[2px] text-xs text-[#4B5157]">
            Aucun espace campus configuré. Cliquez sur « + Ajouter un espace campus » pour commencer.
          </div>
        </div>

        <!-- 4. ONGLET PARTENAIRES & ENTREPRISES -->
        <div *ngIf="activeTab === 'partenaires'" class="space-y-6 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2px] border border-[#D7DBDE] shadow-2xs">
            <div>
              <div class="label" style="margin-bottom: 2px;">Alliance & Réseau Industriel</div>
              <h3 class="text-lg font-bold text-[#1B1D1F]">Partenaires & Entreprises Recruteuses</h3>
              <p class="text-xs text-[#4B5157] mt-0.5">Gérez les logos des entreprises partenaires et ministères affichés dans le carrousel institutionnel.</p>
            </div>
            <button (click)="ouvrirModalPartenaire()" class="btn btn-primary text-xs py-2.5 px-5 font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
              <span>+</span>
              <span>Ajouter un partenaire</span>
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div *ngFor="let p of partenairesList" class="card border border-[#D7DBDE] flex flex-col justify-between hover:border-[#1C75BC] transition-all bg-white p-4">
              <div class="flex flex-col items-center text-center">
                <div class="w-20 h-16 flex items-center justify-center mb-3 bg-[#F5F6F7] p-2 rounded-xs border border-[#D7DBDE]">
                  <img 
                    [src]="getMediaUrl(p.logoUrl || p.logo) || 'https://placehold.co/150x60?text=Logo'" 
                    [alt]="p.nom"
                    class="max-h-full max-w-full object-contain"
                    (error)="onImageError($event, 'https://placehold.co/150x60?text=Logo')"
                  />
                </div>
                <h4 class="font-bold text-xs text-[#1B1D1F] truncate w-full">{{ p.nom }}</h4>
                <div class="text-[10px] text-[#4B5157] truncate w-full mt-0.5">{{ p.secteur || 'Partenaire Institutionnel' }}</div>
              </div>

              <div class="pt-3 mt-3 border-t border-[#F5F6F7] flex items-center justify-between gap-1">
                <span class="tag" [ngClass]="p.actif !== false ? 'valide' : 'attente'">
                  {{ p.actif !== false ? 'Visible' : 'Masqué' }}
                </span>
                <div class="flex items-center gap-1">
                  <button (click)="editerPartenaire(p)" class="btn btn-ghost text-xs py-0.5 px-2" title="Modifier">
                    ✏️
                  </button>
                  <button (click)="supprimerPartenaire(p.id!)" class="btn btn-ghost text-xs py-0.5 px-2 text-[#ED1C24] border-[#ED1C24]" title="Supprimer">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="partenairesList.length === 0" class="p-10 text-center bg-white border border-[#D7DBDE] rounded-[2px] text-xs text-[#4B5157]">
            Aucun partenaire enregistré. Cliquez sur « + Ajouter un partenaire » pour charger un logo officiel.
          </div>
        </div>

        <!-- 5. ONGLET TÉMOIGNAGES ENRICHIS & ALUMNI -->
        <div *ngIf="activeTab === 'temoignages'" class="space-y-6 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2px] border border-[#D7DBDE] shadow-2xs">
            <div>
              <div class="label" style="margin-bottom: 2px;">Preuve Sociale & Réussites Alumni</div>
              <h3 class="text-lg font-bold text-[#1B1D1F]">Témoignages des Anciens Apprenants & Entreprises</h3>
              <p class="text-xs text-[#4B5157] mt-0.5">Affichez des retours d'expérience authentiques avec photo, rôle, promotion et note d'évaluation.</p>
            </div>
            <button (click)="ouvrirModalTemoignageEnrichi()" class="btn btn-primary text-xs py-2.5 px-5 font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
              <span>+</span>
              <span>Ajouter un témoignage</span>
            </button>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div *ngFor="let t of temoignagesList" class="card border border-[#D7DBDE] flex flex-col justify-between hover:border-[#1C75BC] transition-all bg-white">
              <div>
                <div class="flex items-start gap-3 mb-3 pb-3 border-b border-[#F5F6F7]">
                  <div class="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[#D7DBDE] bg-slate-100 flex items-center justify-center font-bold text-[#124F80]">
                    <img 
                      *ngIf="t.photoUrl || t.photo"
                      [src]="getMediaUrl(t.photoUrl || t.photo)" 
                      [alt]="t.nom || t.nomPrenom"
                      class="w-full h-full object-cover"
                      (error)="onImageError($event)"
                    />
                    <span *ngIf="!t.photoUrl && !t.photo">{{ t.initiales || getInitials(t.nom || t.nomPrenom || '') }}</span>
                  </div>
                  <div class="min-w-0">
                    <h4 class="font-bold text-[#1B1D1F] text-sm truncate">{{ t.nom || t.nomPrenom }}</h4>
                    <div class="text-[11px] text-[#1C75BC] font-medium truncate">{{ t.role || t.fonction }}</div>
                    <div *ngIf="t.entreprise" class="text-[10px] text-[#4B5157] truncate">🏢 {{ t.entreprise }}</div>
                  </div>
                </div>

                <div class="flex items-center gap-1 text-[#F0791E] text-xs mb-2">
                  <span *ngFor="let s of [1,2,3,4,5]">
                    {{ s <= (t.note || 5) ? '★' : '☆' }}
                  </span>
                  <span class="text-[10px] text-[#4B5157] font-bold ml-1">{{ t.promotion || 'Alumni Certifié' }}</span>
                </div>

                <p class="text-xs text-[#4B5157] italic leading-relaxed mb-3">
                  « {{ t.citation || t.texte }} »
                </p>
              </div>

              <div class="pt-3 border-t border-[#F5F6F7] flex items-center justify-between gap-1">
                <span class="tag" [ngClass]="t.actif !== false ? 'valide' : 'attente'">
                  {{ t.actif !== false ? 'Visible' : 'Masqué' }}
                </span>
                <div class="flex items-center gap-1">
                  <button (click)="toggleTemoignageActif(t)" class="btn btn-ghost text-xs py-1 px-2.5" [title]="t.actif !== false ? 'Masquer' : 'Afficher'">
                    {{ t.actif !== false ? '👁️' : '✅' }}
                  </button>
                  <button (click)="editerTemoignageEnrichi(t)" class="btn btn-ghost text-xs py-1 px-2.5" title="Modifier">
                    ✏️
                  </button>
                  <button (click)="supprimerTemoignage(t.id!)" class="btn btn-ghost text-xs py-1 px-2.5 text-[#ED1C24] border-[#ED1C24]" title="Supprimer">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="temoignagesList.length === 0" class="p-10 text-center bg-white border border-[#D7DBDE] rounded-[2px] text-xs text-[#4B5157]">
            Aucun témoignage enregistré. Cliquez sur « + Ajouter un témoignage » pour créer le premier.
          </div>
        </div>

        <!-- 6. ONGLET ACTUALITÉS DU CENTRE VITALIS -->
        <div *ngIf="activeTab === 'actualites'" class="space-y-6 animate-fade-in-up">
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2px] border border-[#D7DBDE] shadow-2xs">
            <div>
              <div class="label" style="margin-bottom: 2px;">Presse & Communication Institutionnelle</div>
              <h3 class="text-lg font-bold text-[#1B1D1F]">Actualités, Événements & Vie du Centre Vitalis</h3>
              <p class="text-xs text-[#4B5157] mt-0.5">
                Publiez et gérez les articles, annonces officielles, photos, vidéos et cérémonies du réseau.
              </p>
            </div>
            <button (click)="ouvrirModalActualite()" class="btn btn-primary text-xs py-2.5 px-5 font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5">
              <span>+</span>
              <span>Publier une actualité</span>
            </button>
          </div>

          <!-- Liste des actualités -->
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div *ngFor="let act of actualitesList" class="card border border-[#D7DBDE] flex flex-col justify-between hover:border-[#1C75BC] transition-all bg-white overflow-hidden p-0">
              
              <!-- Miniature & Badge -->
              <div class="relative h-40 bg-slate-100 overflow-hidden">
                <img 
                  [src]="getMediaUrl(act.imageUrl) || 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop'" 
                  [alt]="act.titre"
                  class="w-full h-full object-cover"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                
                <div class="absolute top-2.5 left-2.5">
                  <span 
                    class="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-2xs text-white shadow-xs"
                    [style.background-color]="getCategorieBadgeColor(act.categorie, act.badgeCouleur)"
                  >
                    {{ getCategorieLabel(act.categorie) }}
                  </span>
                </div>

                <div class="absolute top-2.5 right-2.5 flex items-center gap-1">
                  <span *ngIf="act.aLaUne" class="px-2 py-0.5 bg-[#ED1C24] text-white text-[10px] font-bold uppercase rounded-2xs shadow-xs">
                    ⭐ À la une
                  </span>
                  <span class="tag" [ngClass]="act.actif ? 'valide' : 'attente'">
                    {{ act.actif ? 'Publié' : 'Brouillon' }}
                  </span>
                </div>

                <div class="absolute bottom-2 left-2.5 text-[10px] text-white/90 font-medium drop-shadow">
                  📅 {{ act.datePublication | date:'dd/MM/yyyy' }} · ✍️ {{ act.auteur || 'Vitalis' }}
                </div>
              </div>

              <!-- Titre et résumé -->
              <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 class="font-bold text-xs sm:text-sm text-[#1B1D1F] line-clamp-2 mb-1.5 leading-snug">
                    {{ act.titre }}
                  </h4>
                  <p class="text-[11px] text-[#4B5157] line-clamp-3 leading-relaxed">
                    {{ act.chapeau || act.contenu }}
                  </p>
                </div>

                <!-- Barre d'actions -->
                <div class="pt-3 mt-3 border-t border-[#D7DBDE] flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 text-[11px]">
                    <button 
                      type="button"
                      (click)="toggleAlaUne(act)" 
                      class="text-[11px] px-2 py-0.5 rounded-2xs border transition cursor-pointer font-semibold"
                      [ngClass]="act.aLaUne ? 'bg-[#ED1C24]/10 text-[#ED1C24] border-[#ED1C24]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
                      title="Mettre ou retirer de la une"
                    >
                      {{ act.aLaUne ? '⭐ À la une' : '☆ Standard' }}
                    </button>
                    <button 
                      type="button"
                      (click)="toggleActifActualite(act)" 
                      class="text-[11px] px-2 py-0.5 rounded-2xs border transition cursor-pointer font-semibold"
                      [ngClass]="act.actif ? 'bg-[#276B44]/10 text-[#276B44] border-[#276B44]' : 'bg-amber-50 text-amber-700 border-amber-300'"
                      title="Activer ou désactiver"
                    >
                      {{ act.actif ? 'En ligne' : 'Masqué' }}
                    </button>
                  </div>

                  <div class="flex items-center gap-1">
                    <button (click)="editerActualite(act)" class="btn btn-ghost text-xs py-1 px-2.5" title="Modifier">
                      ✏️
                    </button>
                    <button (click)="supprimerActualite(act.id!)" class="btn btn-ghost text-xs py-1 px-2.5 text-[#ED1C24] border-[#ED1C24]" title="Supprimer">
                      🗑️
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

          <div *ngIf="actualitesList.length === 0" class="text-center py-12 bg-white border border-[#D7DBDE] rounded-xs">
            <div class="text-3xl mb-2">📰</div>
            <div class="text-sm font-bold text-[#1B1D1F]">Aucune actualité publiée pour le moment</div>
            <p class="text-xs text-[#4B5157] mt-1">Cliquez sur « + Publier une actualité » pour ajouter le premier article.</p>
          </div>

        </div>

        <!-- 7. ONGLET VITRINE FORMATIONS & CATALOGUE OFFICIEL -->
        <div *ngIf="activeTab === 'formations'" class="space-y-6 animate-fade-in-up">
          <div class="bg-white border border-[#D7DBDE] rounded-[2px] p-6 shadow-2xs space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D7DBDE] pb-5">
              <div>
                <div class="text-[12px] font-bold text-[#1C75BC] uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎓</span> Section Vitrine Publique /#formations
                </div>
                <h2 class="text-xl sm:text-2xl font-bold text-[#1B1D1F] mt-1">
                  Gouvernance des Formations Certifiantes du Portail
                </h2>
                <div class="w-12 h-1 bg-[#F0791E] mt-2 mb-2 rounded-xs"></div>
                <p class="text-xs text-[#4B5157] mt-1 max-w-2xl leading-relaxed">
                  Toutes les formations affichées sur la page d'accueil, leurs statuts en vitrine, badges vedettes, durées et débouchés sont administrés en temps réel depuis le sous-module officiel de l'Administration Centrale.
                </p>
              </div>

              <a routerLink="/admin/formations" class="btn btn-primary text-xs py-2.5 px-5 font-bold shadow-xs flex items-center gap-2 shrink-0 cursor-pointer">
                <span>📚</span>
                <span>Ouvrir le Module Formations</span>
                <span>➔</span>
              </a>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div class="p-4 bg-[#E7F1FA] border border-[#1C75BC]/30 rounded-xs">
                <div class="font-bold text-[#124F80] flex items-center gap-1.5 mb-1.5 text-sm">
                  <span>🌐</span> Publication en 1-Clic
                </div>
                <p class="text-slate-600 leading-relaxed">
                  Activez ou masquez instantanément n'importe quelle formation de la vitrine publique du portail grâce à l'interrupteur réactif sans rechargement.
                </p>
              </div>

              <div class="p-4 bg-[#FDECDD] border border-[#F0791E]/30 rounded-xs">
                <div class="font-bold text-[#F0791E] flex items-center gap-1.5 mb-1.5 text-sm">
                  <span>⭐</span> Mise en Vedette "À la une"
                </div>
                <p class="text-slate-600 leading-relaxed">
                  Définissez les programmes phares qui apparaissent en tête de liste avec le badge doré officiel et la priorité d'affichage marketing.
                </p>
              </div>

              <div class="p-4 bg-[#E7F1EA] border border-[#276B44]/30 rounded-xs">
                <div class="font-bold text-[#276B44] flex items-center gap-1.5 mb-1.5 text-sm">
                  <span>👁️</span> Live Preview Immédiat
                </div>
                <p class="text-slate-600 leading-relaxed">
                  Visualisez le rendu visuel exact de la carte de formation avant même de valider son enregistrement en base de données.
                </p>
              </div>
            </div>

            <div class="p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="text-xs text-[#4B5157]">
                <strong class="text-[#1B1D1F]">Accès direct au tableau de bord :</strong>
                Consultez les 5 compteurs KPIs réseau, gérez les référentiels de compétences et rattachez les modules pédagogiques.
              </div>
              <a routerLink="/admin/formations" class="btn bg-[#124F80] hover:bg-[#0d3b61] text-white text-xs py-2 px-4 font-bold flex items-center gap-1.5 shrink-0">
                <span>Gérer les Programmes</span>
                <span>➔</span>
              </a>
            </div>
          </div>
        </div>

        <!-- 8. ONGLET SECTIONS MODULAIRES (Avantages, Pédagogie, Admission, Secteurs, FAQ) -->
        <div *ngIf="isSectionTab(activeTab)" class="space-y-6 animate-fade-in-up">
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2px] border border-[#D7DBDE] shadow-2xs">
            <div>
              <div class="label" style="margin-bottom: 2px;">Section Active</div>
              <h3 class="text-lg font-bold text-[#1B1D1F]">{{ getNomSectionActive() }}</h3>
              <p class="text-xs text-[#4B5157] mt-0.5">Gérez l'ordre d'apparition, les descriptions, les couleurs et la visibilité des blocs.</p>
            </div>
            <button (click)="ouvrirModalSection()" class="btn btn-primary text-xs py-2.5 px-5 font-semibold shadow-2xs cursor-pointer">
              + Ajouter un élément
            </button>
          </div>

          <!-- Grille des cartes modulaires -->
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div *ngFor="let sec of sectionsFiltrees" class="card border border-[#D7DBDE] flex flex-col justify-between hover:border-[#1C75BC] transition-all">
              <div>
                <div class="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[#F5F6F7]">
                  <span class="text-[11px] font-bold px-2 py-0.5 rounded-[2px] text-white" [style.background-color]="sec.couleur || '#1C75BC'">
                    Position #{{ sec.ordre }}
                  </span>
                  <span *ngIf="sec.categorie" class="text-[10px] font-extrabold uppercase text-[#F0791E] bg-[#FDECDD] px-2 py-0.5 rounded-[2px]">
                    {{ sec.categorie }}
                  </span>
                  <span *ngIf="sec.icone" class="text-xs font-bold text-[#124F80] bg-[#E7F1FA] px-2 py-0.5 rounded-[2px]">
                    {{ sec.icone }}
                  </span>
                  <span class="tag" [ngClass]="sec.actif ? 'valide' : 'attente'">
                    {{ sec.actif ? 'Visible' : 'Masqué' }}
                  </span>
                </div>

                <div *ngIf="sec.sousTitre" class="text-[11px] font-bold text-[#F0791E] uppercase tracking-wider mb-1">
                  {{ sec.sousTitre }}
                </div>
                <h4 class="font-bold text-[#1B1D1F] text-[15px] mb-2 leading-snug">{{ sec.titre }}</h4>
                <p *ngIf="sec.description" class="text-xs text-[#4B5157] leading-relaxed mb-4">
                  {{ sec.description }}
                </p>
              </div>

              <div class="pt-3 border-t border-[#F5F6F7] flex items-center justify-end gap-2">
                <button (click)="toggleSectionActif(sec)" class="btn btn-ghost text-xs py-1 px-2.5" [title]="sec.actif ? 'Masquer' : 'Publier'">
                  {{ sec.actif ? '👁️ Masquer' : '✅ Afficher' }}
                </button>
                <button (click)="editerSection(sec)" class="btn btn-ghost text-xs py-1 px-3">
                  ✏️ Modifier
                </button>
                <button (click)="supprimerSection(sec.id!)" class="btn btn-ghost text-xs py-1 px-3 text-[#ED1C24] border-[#ED1C24] hover:bg-[#FDE6E6]">
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="sectionsFiltrees.length === 0" class="p-10 text-center bg-white border border-[#D7DBDE] rounded-[2px] text-xs text-[#4B5157]">
            Aucun élément n'est enregistré dans cette section. Cliquez sur « + Ajouter un élément » pour en créer un.
          </div>

        </div>

        <!-- 9. ONGLET VÉRIFICATION, FORMATIONS ENTREPRISE & CONTACT / FOOTER -->
        <div *ngIf="activeTab === 'verif_contact'" class="space-y-6 animate-fade-in-up">
          
          <div class="notice">
            <strong>Gestion du Module de Vérification, Contact & Pied de Page</strong>
            Personnalisez les messages de vérification publique de diplômes, le bloc des formations sur mesure, les coordonnées du secrétariat et le texte légal du pied de page.
          </div>

          <form (ngSubmit)="sauvegarderSettings()" class="space-y-6">
            
            <!-- Section Vérification de Certificats -->
            <div class="card border-t-[5px] border-t-[#124F80]">
              <div class="label">Module Public de Vérification d'Authenticité</div>
              
              <div class="space-y-4">
                <div class="field">
                  <label for="verifTitre">Titre de la Section Vérification</label>
                  <input id="verifTitre" type="text" [(ngModel)]="settings.verifTitre" name="verifTitre" class="font-bold" placeholder="Vérifier l'Authenticité d'un Certificat" />
                </div>

                <div class="field">
                  <label for="verifSousTitre">Instructions de Vérification pour le Public</label>
                  <textarea id="verifSousTitre" rows="2" [(ngModel)]="settings.verifSousTitre" name="verifSousTitre" placeholder="Entrez le numéro de série officiel délivré par Vitalis Center pour vérifier son authenticité en temps réel..."></textarea>
                </div>

                <div class="field">
                  <label for="verifExempleNumero">Numéro d'Exemple / Démonstration</label>
                  <input id="verifExempleNumero" type="text" [(ngModel)]="settings.verifExempleNumero" name="verifExempleNumero" class="font-mono text-[#1C75BC]" placeholder="Ex : CERT-2026-00001" />
                  <div class="hint">Affiché en lien cliquable pour tester la vérification instantanée.</div>
                </div>
              </div>
            </div>

            <!-- Formations Sur Mesure (Pôle Entreprises) -->
            <div class="card border-t-[5px] border-t-[#1C75BC]">
              <div class="label">Encadré Formations Sur Mesure & Intra-Entreprise</div>
              
              <div class="grid md:grid-cols-2 gap-4">
                <div class="field">
                  <label>Titre de l'Encadré</label>
                  <input type="text" [(ngModel)]="settings.formationsSurMesureTitre" name="formationsSurMesureTitre" class="font-bold" placeholder="Formations intra-entreprise & sur mesure" />
                </div>

                <div class="field">
                  <label>Description de l'Encadré</label>
                  <input type="text" [(ngModel)]="settings.formationsSurMesureDescription" name="formationsSurMesureDescription" placeholder="Nous concevons des programmes spécialisés pour les ministères et entreprises publiques et privées." />
                </div>
              </div>
            </div>

            <!-- Coordonnées & Horaires -->
            <div class="card border-t-[5px] border-t-[#F0791E]">
              <div class="label">Coordonnées Officielles & Horaires du Secrétariat</div>
              
              <div class="grid md:grid-cols-2 gap-4">
                <div class="field">
                  <label>Adresse du Siège & Ateliers Techniques</label>
                  <input type="text" [(ngModel)]="settings.contactAdresse" name="contactAdresse" placeholder="Kinshasa, République Démocratique du Congo" />
                </div>

                <div class="field">
                  <label>Courriel Institutionnel de Contact</label>
                  <input type="email" [(ngModel)]="settings.contactEmail" name="contactEmail" placeholder="contact@vitalis-center.cd" />
                </div>

                <div class="field">
                  <label>Téléphone Officiel</label>
                  <input type="text" [(ngModel)]="settings.contactTelephone" name="contactTelephone" placeholder="+243 ..." />
                </div>

                <div class="field">
                  <label>Horaires d'Ouverture du Secrétariat</label>
                  <input type="text" [(ngModel)]="settings.contactHoraires" name="contactHoraires" placeholder="Lundi – Vendredi : 08h00 – 16h30 | Samedi : 08h30 – 12h30" />
                </div>
              </div>
            </div>

            <!-- Bouton WhatsApp Flottant -->
            <div class="card border-t-[5px] border-t-[#25D366]">
              <div class="label">
                <svg class="inline w-5 h-5 mr-1.5 -mt-0.5" fill="#25D366" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.07-2.148-.528-1.74-.716-2.859-2.483-2.946-2.599-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.42-.099.825z"/></svg>
                Bouton WhatsApp Flottant — Configuration
              </div>
              <p class="text-xs text-[#4B5157] mb-4">Ce bouton apparaît sur la page d'accueil publique et permet aux visiteurs de contacter un conseiller en direct.</p>
              
              <div class="grid md:grid-cols-2 gap-4">
                <div class="field">
                  <label>Numéro WhatsApp officiel</label>
                  <input type="text" [(ngModel)]="settings.contactWhatsapp" name="contactWhatsapp" maxlength="50" placeholder="+243 843 010 337" />
                  <small class="text-[10px] text-[#4B5157] mt-1 block">Formats acceptés : +243…, 0843…, 9 chiffres locaux.</small>
                </div>

                <div class="field">
                  <label>Activer le Bouton WhatsApp</label>
                  <div class="flex items-center gap-3 mt-1">
                    <label class="relative inline-flex items-center cursor-pointer" [class.opacity-50]="savingWhatsapp" [class.pointer-events-none]="savingWhatsapp">
                      <input type="checkbox" [(ngModel)]="settings.whatsappActif" name="whatsappActif" class="sr-only peer" [disabled]="savingWhatsapp" (change)="basculerWhatsapp($any($event.target).checked)" />
                      <div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                    </label>
                    <span class="text-sm font-medium" [class.text-[#25D366]]="settings.whatsappActif === true" [class.text-[#4B5157]]="settings.whatsappActif !== true">
                      {{ settings.whatsappActif === true ? 'Actif — Visible pour les visiteurs' : 'Désactivé — Masqué pour les visiteurs' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="field mt-4">
                <label>Message pré-rempli à l'ouverture de la conversation</label>
                <textarea rows="2" [(ngModel)]="settings.whatsappMessage" name="whatsappMessage" maxlength="500" placeholder="Bonjour Vitalis Center EUP, je souhaite obtenir des informations sur vos formations professionnelles certifiées."></textarea>
              </div>

              <div class="mt-4 p-3 rounded-lg border" [class.bg-[#f0fdf4]]="!!whatsappPreviewUrl" [class.border-[#bbf7d0]]="!!whatsappPreviewUrl" [class.bg-[#fff7ed]]="!whatsappPreviewUrl" [class.border-[#fed7aa]]="!whatsappPreviewUrl">
                <div class="text-xs font-semibold mb-1" [class.text-[#166534]]="!!whatsappPreviewUrl" [class.text-[#9a3412]]="!whatsappPreviewUrl">
                  {{ whatsappPreviewUrl ? 'Aperçu du lien WhatsApp généré' : 'Numéro incomplet ou invalide — le bouton public restera masqué' }}
                </div>
                @if (whatsappPreviewUrl) {
                  <code class="text-xs text-[#15803d] break-all">{{ whatsappPreviewUrl }}</code>
                  <div class="mt-3">
                    <a
                      [href]="whatsappPreviewUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-[2px] bg-[#25D366] text-white hover:bg-[#20ba59] no-underline"
                    >
                      Tester le lien WhatsApp
                    </a>
                  </div>
                }
              </div>
            </div>

            <!-- Pied de Page & Mentions Légales -->
            <div class="card border-t-[5px] border-t-[#4B5157]">
              <div class="label">Pied de Page (Footer) & Mentions Institutionnelles</div>
              
              <div class="space-y-4">
                <div class="field">
                  <label>Présentation de l'Établissement (Colonne 1 du Footer)</label>
                  <textarea rows="2" [(ngModel)]="settings.footerDescription" name="footerDescription" placeholder="Vitalis Center EUP (Établissement d'Utilité Publique)..."></textarea>
                </div>

                <div class="field">
                  <label>Texte de Tutelle & Partenariat (Colonne 3 du Footer)</label>
                  <textarea rows="2" [(ngModel)]="settings.footerTutelleTexte" name="footerTutelleTexte" placeholder="Supervision institutionnelle et contrôle de conformité des attestations et certifications nationales."></textarea>
                </div>

                <div class="grid md:grid-cols-2 gap-4">
                  <div class="field">
                    <label>Mention de Copyright</label>
                    <input type="text" [(ngModel)]="settings.footerCopyright" name="footerCopyright" placeholder="© 2026 Vitalis Center EUP. Tous droits réservés." />
                  </div>

                  <div class="field">
                    <label>Barre Inférieure du Footer</label>
                    <input type="text" [(ngModel)]="settings.footerBarreTexte" name="footerBarreTexte" placeholder="Vitalis Center (EUP — Établissement d'Utilité Publique)..." />
                  </div>
                </div>
              </div>
            </div>

            <!-- Bouton d'enregistrement -->
            <div class="flex justify-end pt-2">
              <button type="submit" [disabled]="savingSettings" class="btn bg-[#F0791E] hover:bg-[#d6610b] text-white border-none font-bold py-3 px-8 shadow-xs hover:scale-102 transition-transform cursor-pointer">
                {{ savingSettings ? 'Enregistrement en cours...' : '💾 Enregistrer ces Paramètres' }}
              </button>
            </div>

          </form>

        </div>

        <!-- 10. ONGLET ABONNÉS NEWSLETTER & ALERTES -->
        <div *ngIf="activeTab === 'newsletter'" class="space-y-6 animate-fade-in-up">
          <div class="card border-t-[5px] border-t-[#F0791E]">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D7DBDE]">
              <div>
                <div class="text-[11px] uppercase font-bold tracking-[0.06em] text-[#F0791E]">
                  Diffusion & Inscriptions aux Alertes
                </div>
                <h3 class="text-xl font-bold text-[#1B1D1F] mt-0.5">
                  Abonnés à la Newsletter Institutionnelle
                </h3>
                <p class="text-xs text-[#4B5157] mt-1">
                  Liste des adresses e-mails enregistrées via le pied de page pour recevoir les avis d'ouverture des sessions et concours.
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button type="button" (click)="chargerNewsletterAbonnes()" class="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                  <span>🔄</span>
                  <span>Actualiser la liste</span>
                </button>
              </div>
            </div>

            <div class="p-3.5 bg-[#FDECDD] border border-[#F0791E]/30 rounded-[2px] my-4 flex items-center justify-between">
              <div class="text-xs font-bold text-[#F0791E]">
                Total des abonnés inscrits : <span class="text-lg ml-1">{{ newsletterAbonnesList.length }}</span>
              </div>
            </div>

            <div *ngIf="newsletterAbonnesList.length === 0" class="p-8 text-center bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px] text-xs text-[#4B5157]">
              Aucun abonné enregistré pour le moment.
            </div>

            <div *ngIf="newsletterAbonnesList.length > 0" class="overflow-x-auto border border-[#D7DBDE] rounded-[2px]">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F5F6F7] text-[11px] font-bold uppercase tracking-[0.05em] text-[#4B5157] border-b border-[#D7DBDE]">
                  <tr>
                    <th class="p-3.5">Date d'inscription</th>
                    <th class="p-3.5">Adresse E-mail</th>
                    <th class="p-3.5">Statut</th>
                    <th class="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#D7DBDE] bg-white">
                  <tr *ngFor="let ab of newsletterAbonnesList" class="hover:bg-[#F5F6F7]/60 transition">
                    <td class="p-3.5 font-mono text-[#4B5157]">
                      {{ ab.createdAt | date:'dd/MM/yyyy à HH:mm' }}
                    </td>
                    <td class="p-3.5 font-semibold text-[#1B1D1F]">
                      {{ ab.email }}
                    </td>
                    <td class="p-3.5">
                      <span class="tag valide">Actif</span>
                    </td>
                    <td class="p-3.5 text-right">
                      <button (click)="supprimerNewsletterAbonne(ab.id)" class="btn btn-ghost text-[11px] py-1 px-2 text-[#ED1C24] border-[#ED1C24] hover:bg-[#FDE6E6] cursor-pointer" title="Supprimer">
                        🗑️ Retirer
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 11. ONGLET DEMANDES D'ORIENTATION & DOLÉANCES -->
        <div *ngIf="activeTab === 'messages'" class="space-y-6 animate-fade-in-up">
          <div class="card border-t-[5px] border-t-[#1C75BC]">
            
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D7DBDE]">
              <div>
                <div class="text-[11px] uppercase font-bold tracking-[0.06em] text-[#1C75BC]">
                  Guichet d'Écoute & Orientation Institutionnelle
                </div>
                <h3 class="text-xl font-bold text-[#1B1D1F] mt-0.5">
                  Demandes d'Orientation & Doléances Usagers
                </h3>
                <p class="text-xs text-[#4B5157] mt-1">
                  Centralisation des messages, souhaits d'adhésion et expressions de besoins reçus en direct depuis la Landing Page.
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button type="button" (click)="chargerMessages()" class="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                  <span>🔄</span>
                  <span>Actualiser le flux</span>
                </button>
              </div>
            </div>

            <!-- Mini Cartes Statistiques -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div class="p-3.5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                <div class="text-[11px] font-bold text-[#4B5157] uppercase tracking-[0.05em]">Total des Demandes</div>
                <div class="text-xl font-bold text-[#124F80] mt-1">{{ contactMessages.length }}</div>
              </div>

              <div class="p-3.5 bg-[#E7F1FA] border border-[#1C75BC]/30 rounded-[2px]">
                <div class="text-[11px] font-bold text-[#1C75BC] uppercase tracking-[0.05em]">Filières Spécifiées</div>
                <div class="text-xl font-bold text-[#1C75BC] mt-1">{{ countMessagesWithFiliere() }}</div>
              </div>

              <div class="p-3.5 bg-[#E7F1EA] border border-[#276B44]/30 rounded-[2px]">
                <div class="text-[11px] font-bold text-[#276B44] uppercase tracking-[0.05em]">Réception en Direct</div>
                <div class="text-xs font-semibold text-[#276B44] mt-1.5 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[#276B44] animate-pulse"></span>
                  <span>Canal national actif</span>
                </div>
              </div>
            </div>

            <!-- Barre de recherche en direct -->
            <div class="mb-4">
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchMessages"
                  placeholder="Filtrer par nom, téléphone, filière ou contenu du message..."
                  class="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-[#9AA1A8] rounded-[2px] focus:outline-hidden focus:border-[#1C75BC]"
                />
                <span class="absolute left-3 top-2.5 text-[#4B5157] text-xs">🔍</span>
              </div>
            </div>

            <!-- État vide -->
            <div *ngIf="filteredContactMessages.length === 0" class="p-8 text-center bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px] text-xs text-[#4B5157]">
              <div class="w-12 h-12 rounded-full bg-white text-[#1C75BC] flex items-center justify-center text-xl mx-auto mb-2 border border-[#D7DBDE]">
                📬
              </div>
              <p class="text-sm font-semibold text-[#1B1D1F]">
                {{ searchMessages ? 'Aucun message ne correspond à votre filtre.' : 'Aucune demande d\'orientation reçue pour le moment.' }}
              </p>
              <p class="mt-1">
                {{ searchMessages ? 'Modifiez votre terme de recherche.' : 'Les nouvelles doléances soumises sur la landing page apparaîtront instantanément ici.' }}
              </p>
            </div>

            <!-- Tableau moderne -->
            <div *ngIf="filteredContactMessages.length > 0" class="overflow-x-auto border border-[#D7DBDE] rounded-[2px]">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F5F6F7] text-[11px] font-bold uppercase tracking-[0.05em] text-[#4B5157] border-b border-[#D7DBDE]">
                  <tr>
                    <th class="p-3.5">Date & Heure</th>
                    <th class="p-3.5">Candidat / Usager</th>
                    <th class="p-3.5">Numéro de Téléphone</th>
                    <th class="p-3.5">Filière Souhaitée</th>
                    <th class="p-3.5">Doléance / Objectifs</th>
                    <th class="p-3.5 text-right">Actions d'Instruction</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#D7DBDE] bg-white">
                  <tr *ngFor="let msg of filteredContactMessages" class="hover:bg-[#F5F6F7]/60 transition">
                    <td class="p-3.5 text-[#4B5157] font-mono whitespace-nowrap">
                      <div>{{ msg.createdAt | date:'dd/MM/yyyy' }}</div>
                      <div class="text-[10px] text-[#9AA1A8] font-mono">{{ msg.createdAt | date:'HH:mm' }}</div>
                    </td>
                    <td class="p-3.5 whitespace-nowrap">
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-full bg-[#124F80] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs">
                          {{ getInitials(msg.nom) }}
                        </div>
                        <span class="font-bold text-[#1B1D1F]">{{ msg.nom }}</span>
                      </div>
                    </td>
                    <td class="p-3.5 whitespace-nowrap">
                      <div class="inline-flex items-center gap-1.5 bg-[#F5F6F7] px-2.5 py-1 rounded-[2px] border border-[#D7DBDE]">
                        <span class="font-mono font-semibold text-[#1B1D1F]">{{ msg.telephone }}</span>
                        <button type="button" (click)="copierTexte(msg.telephone, 'Numéro copié')"
                                class="text-[#1C75BC] hover:text-[#124F80] text-[11px] p-0.5 cursor-pointer" title="Copier le numéro">
                          📋
                        </button>
                      </div>
                    </td>
                    <td class="p-3.5">
                      <span *ngIf="msg.filiere" class="inline-flex items-center gap-1 rounded-[2px] px-2 py-0.5 text-[11px] font-semibold bg-[#E7F1FA] text-[#124F80] border border-[#1C75BC]/30">
                        <span>🎓</span>
                        <span>{{ msg.filiere }}</span>
                      </span>
                      <span *ngIf="!msg.filiere" class="text-[#71787E] italic text-[11px]">
                        Orientation générale
                      </span>
                    </td>
                    <td class="p-3.5 max-w-xs">
                      <p class="text-xs text-[#4B5157] leading-relaxed line-clamp-2" [title]="msg.message">
                        {{ msg.message || 'Aucun message supplémentaire fourni.' }}
                      </p>
                    </td>
                    <td class="p-3.5 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        <button type="button" (click)="openMessageModal(msg)"
                                class="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 shadow-2xs cursor-pointer">
                          <span>🔍 Examiner</span>
                        </button>
                        <a routerLink="/admin/admissions"
                           class="btn btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1 shadow-2xs font-semibold cursor-pointer">
                          <span>👤 Espace Admissions</span>
                        </a>
                        <button (click)="supprimerMessage(msg.id)"
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
        </div>

        <!-- ========================================================================================= -->
        <!-- MODALS D'ÉDITION & CRÉATION                                                               -->
        <!-- ========================================================================================= -->

        <!-- MODAL FORMATEUR -->
        <div *ngIf="modalFormateurVisible" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div class="bg-white rounded-[2px] shadow-2xl max-w-lg w-full p-6 border-2 border-[#1C75BC] animate-fade-in-up">
            <div class="flex justify-between items-center border-b border-[#D7DBDE] pb-3 mb-4">
              <div>
                <div class="text-[11px] uppercase font-bold text-[#F0791E] tracking-wider">Pédagogie & Métiers</div>
                <h3 class="font-bold text-base text-[#124F80]">
                  {{ formateurEnCours.id ? 'Modifier le Formateur' : 'Ajouter un Formateur' }}
                </h3>
              </div>
              <button (click)="modalFormateurVisible = false" class="text-base font-bold text-[#4B5157] hover:text-[#ED1C24] cursor-pointer">✕</button>
            </div>

            <form (ngSubmit)="sauvegarderFormateurModal()" class="space-y-3.5 text-xs">
              <div class="field">
                <label>Nom et Prénom *</label>
                <input type="text" [(ngModel)]="formateurEnCours.nom" name="nom" required class="font-bold text-sm" placeholder="Ex : Dr. Marc KABAMBA" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="field">
                  <label>Titre / Fonction *</label>
                  <input type="text" [(ngModel)]="formateurEnCours.titre" name="titre" required placeholder="Ex : Chef de Département IA" />
                </div>
                <div class="field">
                  <label>Expérience Professionnelle *</label>
                  <input type="text" [(ngModel)]="formateurEnCours.experience" name="experience" required placeholder="Ex : 12 ans d'expérience" />
                </div>
              </div>

              <div class="field">
                <label>Spécialité Principale *</label>
                <input type="text" [(ngModel)]="formateurEnCours.specialite" name="specialite" required placeholder="Ex : Intelligence Artificielle & Génie Logiciel" />
              </div>

              <div class="field">
                <label>Lien Profil LinkedIn</label>
                <input type="url" [(ngModel)]="formateurEnCours.linkedin" name="linkedin" placeholder="https://linkedin.com/in/..." />
              </div>

              <!-- Upload Photo Formateur -->
              <div class="p-3 bg-[#F9FAFB] border border-[#D7DBDE] rounded-xs space-y-2">
                <label class="font-bold text-[#124F80] block">📸 Photo Portrait du Formateur</label>
                <div class="flex items-center gap-3">
                  <img 
                    [src]="getMediaUrl(formateurEnCours.photoUrl || formateurEnCours.photo) || 'https://placehold.co/80x80?text=Photo'" 
                    alt="Aperçu"
                    class="w-12 h-12 rounded-full object-cover border border-[#D7DBDE]"
                  />
                  <input type="file" accept="image/*" (change)="onFormateurPhotoSelected($event)" class="text-xs" />
                </div>
                <input type="url" [(ngModel)]="formateurEnCours.photoUrl" name="photoUrl" placeholder="Ou URL directe : https://images.unsplash.com/..." class="w-full bg-white p-1.5 border border-[#D7DBDE] rounded-2xs text-[11px]" />
              </div>

              <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="field">
                  <label>Ordre d'affichage</label>
                  <input type="number" [(ngModel)]="formateurEnCours.ordre" name="ordre" />
                </div>
                <div class="flex items-center gap-2 pt-4">
                  <input type="checkbox" [(ngModel)]="formateurEnCours.actif" name="actif" id="formateurActif" class="cursor-pointer w-4 h-4" />
                  <label for="formateurActif" class="font-semibold cursor-pointer text-[#1B1D1F]">Visible en vitrine</label>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t border-[#D7DBDE]">
                <button type="button" (click)="modalFormateurVisible = false" class="btn btn-ghost text-xs py-2 px-4">Annuler</button>
                <button type="submit" class="btn btn-primary text-xs py-2 px-6 font-semibold shadow-xs">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL CAMPUS -->
        <div *ngIf="modalCampusVisible" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div class="bg-white rounded-[2px] shadow-2xl max-w-lg w-full p-6 border-2 border-[#1C75BC] animate-fade-in-up">
            <div class="flex justify-between items-center border-b border-[#D7DBDE] pb-3 mb-4">
              <div>
                <div class="text-[11px] uppercase font-bold text-[#F0791E] tracking-wider">Infrastructures & Ateliers</div>
                <h3 class="font-bold text-base text-[#124F80]">
                  {{ campusEnCours.id ? 'Modifier l\'Espace Campus' : 'Ajouter un Espace Campus' }}
                </h3>
              </div>
              <button (click)="modalCampusVisible = false" class="text-base font-bold text-[#4B5157] hover:text-[#ED1C24] cursor-pointer">✕</button>
            </div>

            <form (ngSubmit)="sauvegarderCampusModal()" class="space-y-3.5 text-xs">
              <div class="field">
                <label>Nom / Titre de l'Espace *</label>
                <input type="text" [(ngModel)]="campusEnCours.titre" name="titre" required class="font-bold text-sm" placeholder="Ex : Laboratoire Informatique & IA" />
              </div>

              <div class="field">
                <label>Badge descriptif</label>
                <input type="text" [(ngModel)]="campusEnCours.badge" name="badge" placeholder="Ex : 50 Postes Haute Performance" />
              </div>

              <div class="field">
                <label>Description *</label>
                <textarea rows="3" [(ngModel)]="campusEnCours.description" name="description" required placeholder="Détails des activités et travaux pratiques réalisés dans cet espace..."></textarea>
              </div>

              <div class="field">
                <label>Équipements & Technologies Clés *</label>
                <input type="text" [(ngModel)]="campusEnCours.equipements" name="equipements" required placeholder="Ex : Serveurs GPU, Fibre 1 Gbps, Casques VR, Écrans 4K" />
              </div>

              <!-- Upload Photo Campus -->
              <div class="p-3 bg-[#F9FAFB] border border-[#D7DBDE] rounded-xs space-y-2">
                <label class="font-bold text-[#124F80] block">📸 Photo HD de l'Espace</label>
                <input type="file" accept="image/*" (change)="onCampusPhotoSelected($event)" class="text-xs mb-1" />
                <input type="url" [(ngModel)]="campusEnCours.photoUrl" name="photoUrl" placeholder="Ou URL directe : https://images.unsplash.com/..." class="w-full bg-white p-1.5 border border-[#D7DBDE] rounded-2xs text-[11px]" />
              </div>

              <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="field">
                  <label>Ordre d'affichage</label>
                  <input type="number" [(ngModel)]="campusEnCours.ordre" name="ordre" />
                </div>
                <div class="flex items-center gap-2 pt-4">
                  <input type="checkbox" [(ngModel)]="campusEnCours.actif" name="actif" id="campusActif" class="cursor-pointer w-4 h-4" />
                  <label for="campusActif" class="font-semibold cursor-pointer text-[#1B1D1F]">Visible en vitrine</label>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t border-[#D7DBDE]">
                <button type="button" (click)="modalCampusVisible = false" class="btn btn-ghost text-xs py-2 px-4">Annuler</button>
                <button type="submit" class="btn btn-primary text-xs py-2 px-6 font-semibold shadow-xs">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL PARTENAIRE -->
        <div *ngIf="modalPartenaireVisible" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div class="bg-white rounded-[2px] shadow-2xl max-w-lg w-full p-6 border-2 border-[#1C75BC] animate-fade-in-up">
            <div class="flex justify-between items-center border-b border-[#D7DBDE] pb-3 mb-4">
              <div>
                <div class="text-[11px] uppercase font-bold text-[#F0791E] tracking-wider">Alliance Entreprise</div>
                <h3 class="font-bold text-base text-[#124F80]">
                  {{ partenaireEnCours.id ? 'Modifier le Partenaire' : 'Ajouter un Partenaire' }}
                </h3>
              </div>
              <button (click)="modalPartenaireVisible = false" class="text-base font-bold text-[#4B5157] hover:text-[#ED1C24] cursor-pointer">✕</button>
            </div>

            <form (ngSubmit)="sauvegarderPartenaireModal()" class="space-y-3.5 text-xs">
              <div class="field">
                <label>Nom de l'Entreprise / Institution *</label>
                <input type="text" [(ngModel)]="partenaireEnCours.nom" name="nom" required class="font-bold text-sm" placeholder="Ex : Vodacom RDC" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="field">
                  <label>Secteur d'Activité</label>
                  <input type="text" [(ngModel)]="partenaireEnCours.secteur" name="secteur" placeholder="Ex : Télécommunications" />
                </div>
                <div class="field">
                  <label>Site Web Officiel</label>
                  <input type="url" [(ngModel)]="partenaireEnCours.siteWeb" name="siteWeb" placeholder="https://..." />
                </div>
              </div>

              <!-- Upload Logo Partenaire -->
              <div class="p-3 bg-[#F9FAFB] border border-[#D7DBDE] rounded-xs space-y-2">
                <label class="font-bold text-[#124F80] block">🏷️ Logo Officiel (SVG, PNG fond transparent)</label>
                <input type="file" accept="image/*" (change)="onPartenaireLogoSelected($event)" class="text-xs mb-1" />
                <input type="url" [(ngModel)]="partenaireEnCours.logoUrl" name="logoUrl" placeholder="Ou URL directe : https://..." class="w-full bg-white p-1.5 border border-[#D7DBDE] rounded-2xs text-[11px]" />
              </div>

              <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="field">
                  <label>Ordre d'affichage</label>
                  <input type="number" [(ngModel)]="partenaireEnCours.ordre" name="ordre" />
                </div>
                <div class="flex items-center gap-2 pt-4">
                  <input type="checkbox" [(ngModel)]="partenaireEnCours.actif" name="actif" id="partenaireActif" class="cursor-pointer w-4 h-4" />
                  <label for="partenaireActif" class="font-semibold cursor-pointer text-[#1B1D1F]">Visible en vitrine</label>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t border-[#D7DBDE]">
                <button type="button" (click)="modalPartenaireVisible = false" class="btn btn-ghost text-xs py-2 px-4">Annuler</button>
                <button type="submit" class="btn btn-primary text-xs py-2 px-6 font-semibold shadow-xs">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL TÉMOIGNAGE ENRICHI -->
        <div *ngIf="modalTemoignageVisible" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div class="bg-white rounded-[2px] shadow-2xl max-w-lg w-full p-6 border-2 border-[#1C75BC] animate-fade-in-up">
            <div class="flex justify-between items-center border-b border-[#D7DBDE] pb-3 mb-4">
              <div>
                <div class="text-[11px] uppercase font-bold text-[#F0791E] tracking-wider">Alumni & Réussites</div>
                <h3 class="font-bold text-base text-[#124F80]">
                  {{ temoignageEnCours.id ? 'Modifier le Témoignage' : 'Ajouter un Témoignage' }}
                </h3>
              </div>
              <button (click)="modalTemoignageVisible = false" class="text-base font-bold text-[#4B5157] hover:text-[#ED1C24] cursor-pointer">✕</button>
            </div>

            <form (ngSubmit)="sauvegarderTemoignageEnrichiModal()" class="space-y-3.5 text-xs">
              <div class="field">
                <label>Nom et Prénom *</label>
                <input type="text" [(ngModel)]="temoignageEnCours.nom" name="nom" required class="font-bold text-sm" placeholder="Ex : Sarah LUKUSA" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="field">
                  <label>Poste / Rôle Actuel</label>
                  <input type="text" [(ngModel)]="temoignageEnCours.role" name="role" placeholder="Ex : Développeuse Fullstack" />
                </div>
                <div class="field">
                  <label>Entreprise Recruteuse</label>
                  <input type="text" [(ngModel)]="temoignageEnCours.entreprise" name="entreprise" placeholder="Ex : Rawbank Tech Lab" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="field">
                  <label>Promotion / Filière</label>
                  <input type="text" [(ngModel)]="temoignageEnCours.promotion" name="promotion" placeholder="Ex : Promo 2024 · Dev Web" />
                </div>
                <div class="field">
                  <label>Note d'Évaluation (1 à 5)</label>
                  <select [(ngModel)]="temoignageEnCours.note" name="note" class="font-bold">
                    <option [value]="5">⭐⭐⭐⭐⭐ (5/5 Exceptionnel)</option>
                    <option [value]="4">⭐⭐⭐⭐ (4/5 Très bien)</option>
                    <option [value]="3">⭐⭐⭐ (3/5 Bien)</option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label>Citation / Témoignage Authentique *</label>
                <textarea rows="4" [(ngModel)]="temoignageEnCours.citation" name="citation" required placeholder="« Grâce à la pratique intensive sur les plateaux techniques de Vitalis Center, j'ai été recrutée dès la fin de ma formation... »"></textarea>
              </div>

              <!-- Photo Témoignage -->
              <div class="p-3 bg-[#F9FAFB] border border-[#D7DBDE] rounded-xs space-y-2">
                <label class="font-bold text-[#124F80] block">📸 Photo Portrait du Diplômé</label>
                <input type="file" accept="image/*" (change)="onTemoignagePhotoSelected($event)" class="text-xs mb-1" />
                <input type="url" [(ngModel)]="temoignageEnCours.photoUrl" name="photoUrl" placeholder="Ou URL directe : https://images.unsplash.com/..." class="w-full bg-white p-1.5 border border-[#D7DBDE] rounded-2xs text-[11px]" />
              </div>

              <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="field">
                  <label>Ordre d'affichage</label>
                  <input type="number" [(ngModel)]="temoignageEnCours.ordre" name="ordre" />
                </div>
                <div class="flex items-center gap-2 pt-4">
                  <input type="checkbox" [(ngModel)]="temoignageEnCours.actif" name="actif" id="temoignageActif" class="cursor-pointer w-4 h-4" />
                  <label for="temoignageActif" class="font-semibold cursor-pointer text-[#1B1D1F]">Visible en vitrine</label>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t border-[#D7DBDE]">
                <button type="button" (click)="modalTemoignageVisible = false" class="btn btn-ghost text-xs py-2 px-4">Annuler</button>
                <button type="submit" class="btn btn-primary text-xs py-2 px-6 font-semibold shadow-xs">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL D'ÉDITION/CRÉATION DE SECTION MODULAIRE / FAQ -->
        <div *ngIf="modalSectionVisible" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div class="bg-white rounded-[2px] shadow-2xl max-w-lg w-full p-6 border-2 border-[#1C75BC] animate-fade-in-up">
            <div class="flex justify-between items-center border-b border-[#D7DBDE] pb-3 mb-4">
              <div>
                <div class="text-[11px] uppercase font-bold text-[#F0791E] tracking-wider">{{ getNomSectionActive() }}</div>
                <h3 class="font-bold text-base text-[#124F80]">
                  {{ sectionEnCours.id ? 'Modifier l\'élément' : 'Ajouter un nouvel élément' }}
                </h3>
              </div>
              <button (click)="modalSectionVisible = false" class="text-base font-bold text-[#4B5157] hover:text-[#ED1C24] cursor-pointer">✕</button>
            </div>

            <form (ngSubmit)="sauvegarderSectionModal()" class="space-y-4 text-xs">
              <div class="field">
                <label>Titre principal *</label>
                <input type="text" [(ngModel)]="sectionEnCours.titre" name="titre" required class="font-bold" />
              </div>

              <div *ngIf="activeTab === 'faq'" class="field">
                <label>Catégorie FAQ *</label>
                <select [(ngModel)]="sectionEnCours.categorie" name="categorie" class="font-semibold">
                  <option value="ADMISSIONS">📬 Inscriptions & Admissions</option>
                  <option value="PEDAGOGIE">📚 Pédagogie & Titres Professionnels</option>
                  <option value="CERTIFICATS">🛡️ Vérification & Certificats</option>
                  <option value="ENTREPRISES">🏢 Entreprises & Stages</option>
                  <option value="AUTRE">💡 Généralités</option>
                </select>
              </div>

              <div *ngIf="activeTab !== 'faq'" class="field">
                <label>Sous-titre / Tag descriptif</label>
                <input type="text" [(ngModel)]="sectionEnCours.sousTitre" name="sousTitre" placeholder="Ex : Agrément National ou Étape 01" />
              </div>

              <div class="field">
                <label>{{ activeTab === 'faq' ? 'Réponse détaillée *' : 'Description / Texte de détail' }}</label>
                <textarea rows="4" [(ngModel)]="sectionEnCours.description" name="description" required></textarea>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div class="field">
                  <label>Ordre</label>
                  <input type="number" [(ngModel)]="sectionEnCours.ordre" name="ordre" />
                </div>
                <div class="field">
                  <label>Icône / Badge</label>
                  <input type="text" [(ngModel)]="sectionEnCours.icone" name="icone" placeholder="Ex : 🏢 ou 70 %" />
                </div>
                <div class="field">
                  <label>Couleur</label>
                  <input type="color" [(ngModel)]="sectionEnCours.couleur" name="couleur" class="h-10 p-0.5 cursor-pointer" />
                </div>
              </div>

              <div class="flex items-center gap-2 pt-2 border-t border-[#F5F6F7]">
                <input type="checkbox" [(ngModel)]="sectionEnCours.actif" name="actif" id="sectionActif" class="cursor-pointer w-4 h-4" />
                <label for="sectionActif" class="font-semibold cursor-pointer text-[#1B1D1F]">Rendre cet élément visible immédiatement</label>
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t border-[#D7DBDE]">
                <button type="button" (click)="modalSectionVisible = false" class="btn btn-ghost text-xs py-2 px-4">
                  Annuler
                </button>
                <button type="submit" class="btn btn-primary text-xs py-2 px-6 font-semibold shadow-xs">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL ACTUALITÉ DU CENTRE -->
        <div *ngIf="modalActualiteVisible" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div class="bg-white rounded-[2px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border-2 border-[#1C75BC] animate-fade-in-up">
            <div class="flex justify-between items-center border-b border-[#D7DBDE] pb-3 mb-4">
              <div>
                <div class="text-[11px] uppercase font-bold text-[#F0791E] tracking-wider">Communication & Presse</div>
                <h3 class="font-bold text-base text-[#124F80]">
                  {{ actualiteEnCours.id ? 'Modifier l\'Actualité' : 'Publier une Nouvelle Actualité' }}
                </h3>
              </div>
              <button (click)="modalActualiteVisible = false" class="text-base font-bold text-[#4B5157] hover:text-[#ED1C24] cursor-pointer">✕</button>
            </div>

            <form (ngSubmit)="sauvegarderActualiteModal()" class="space-y-4 text-xs">
              <div class="field">
                <label>Titre de l'Actualité / Annonce *</label>
                <input type="text" [(ngModel)]="actualiteEnCours.titre" name="titre" required class="font-bold text-sm" placeholder="Ex : Cérémonie officielle de remise des diplômes..." />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="field">
                  <label>Rubrique / Catégorie *</label>
                  <select [(ngModel)]="actualiteEnCours.categorie" name="categorie" required class="font-semibold">
                    <option value="INNOVATION">💡 Innovation & Tech</option>
                    <option value="ADMISSIONS">📬 Admissions & Inscriptions</option>
                    <option value="PARTENARIAT">🤝 Partenariats & Insertion</option>
                    <option value="PEDAGOGIE">📚 Pédagogie & APC</option>
                    <option value="VIE_DU_CENTRE">🏛️ Vie du Centre</option>
                    <option value="COMMUNIQUE_OFFICIEL">📢 Communiqué Officiel</option>
                  </select>
                </div>
                <div class="field">
                  <label>Auteur / Direction Émettrice</label>
                  <input type="text" [(ngModel)]="actualiteEnCours.auteur" name="auteur" placeholder="Ex : Direction Générale Vitalis" />
                </div>
              </div>

              <div class="field">
                <label>Chapeau d'accroche / Résumé court *</label>
                <textarea rows="2" [(ngModel)]="actualiteEnCours.chapeau" name="chapeau" required placeholder="Court résumé percutant affiché sur les cartes..."></textarea>
              </div>

              <div class="field">
                <label>Corps complet de l'article</label>
                <textarea rows="6" [(ngModel)]="actualiteEnCours.contenu" name="contenu" placeholder="Texte intégral de l'article, détails, programme, déclarations officielles..."></textarea>
              </div>

              <!-- GESTION MULTIMÉDIA -->
              <div class="space-y-4 pt-2 border-t border-[#EDEFF2]">
                <!-- IMAGE DE COUVERTURE -->
                <div class="p-3.5 bg-[#F9FAFB] border border-[#D7DBDE] rounded-xs space-y-2.5">
                  <div class="flex items-center justify-between">
                    <label class="font-bold text-[#124F80] flex items-center gap-1.5 text-xs">
                      <span>📷</span> Image de Couverture / Photo Officielle *
                    </label>
                    <span class="text-[11px] text-slate-500">JPG, PNG, WebP, GIF</span>
                  </div>

                  <div *ngIf="actualiteEnCours.imageUrl" class="relative rounded-xs overflow-hidden border border-[#D7DBDE] bg-slate-900 group max-h-48 flex items-center justify-center">
                    <img [src]="getMediaUrl(actualiteEnCours.imageUrl)" alt="Aperçu" class="w-full h-44 object-cover" />
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        type="button" 
                        (click)="declencherInputImage()" 
                        class="px-3 py-1.5 bg-[#1C75BC] text-white font-bold rounded-2xs text-[11px] hover:bg-[#124F80] transition-colors cursor-pointer shadow-xs"
                      >
                        🔄 Remplacer la photo
                      </button>
                      <button 
                        type="button" 
                        (click)="supprimerImageActuelle()" 
                        class="px-3 py-1.5 bg-[#ED1C24] text-white font-bold rounded-2xs text-[11px] hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>

                  <div 
                    *ngIf="!actualiteEnCours.imageUrl"
                    (click)="declencherInputImage()"
                    class="border-2 border-dashed border-[#1C75BC]/40 hover:border-[#1C75BC] bg-white hover:bg-[#E7F1FA]/30 rounded-xs p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <span class="text-2xl">🖼️</span>
                    <span class="font-bold text-[#124F80] text-xs">
                      Cliquez pour choisir une photo depuis votre appareil
                    </span>
                  </div>

                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp,image/gif" 
                    (change)="onImageSelected($event)" 
                    class="hidden" 
                    id="actualiteImgInput"
                  />

                  <div *ngIf="uploadingImage" class="flex items-center gap-2 text-xs font-bold text-[#1C75BC]">
                    <span class="animate-spin text-base">⏳</span>
                    <span>Téléversement de l'image en cours...</span>
                  </div>

                  <details class="text-[11px] text-slate-500 pt-1">
                    <summary class="cursor-pointer hover:text-[#1C75BC] font-semibold">Ou coller une URL d'image web directe</summary>
                    <input type="url" [(ngModel)]="actualiteEnCours.imageUrl" name="imageUrl" placeholder="https://images.unsplash.com/..." class="mt-1.5 w-full bg-white p-2 border border-[#D7DBDE] rounded-2xs" />
                  </details>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="field">
                  <label>Couleur du Badge</label>
                  <input type="color" [(ngModel)]="actualiteEnCours.badgeCouleur" name="badgeCouleur" class="h-10 p-0.5 cursor-pointer w-full" />
                </div>
                <div class="field">
                  <label>Ordre d'affichage</label>
                  <input type="number" [(ngModel)]="actualiteEnCours.ordre" name="ordre" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F5F6F7]">
                <div class="flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="actualiteEnCours.aLaUne" name="aLaUne" id="actualiteALaUne" class="cursor-pointer w-4 h-4 text-[#ED1C24]" />
                  <label for="actualiteALaUne" class="font-semibold cursor-pointer text-[#1B1D1F]">⭐ Mettre cet article à la une</label>
                </div>
                <div class="flex items-center gap-2">
                  <input type="checkbox" [(ngModel)]="actualiteEnCours.actif" name="actif" id="actualiteActif" class="cursor-pointer w-4 h-4" />
                  <label for="actualiteActif" class="font-semibold cursor-pointer text-[#1B1D1F]">Publier immédiatement</label>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-4 border-t border-[#D7DBDE]">
                <button type="button" (click)="modalActualiteVisible = false" class="btn btn-ghost text-xs py-2 px-4">
                  Annuler
                </button>
                <button type="submit" class="btn btn-primary text-xs py-2 px-6 font-semibold shadow-xs">
                  Enregistrer l'Actualité
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL DÉTAILS DEMANDE D'ORIENTATION -->
        <div *ngIf="selectedMessage" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1D1F]/60 p-4 backdrop-blur-xs animate-fade-in">
          <div class="w-full max-w-2xl rounded-[2px] bg-white p-6 shadow-2xl border border-[#D7DBDE] border-t-[5px] border-t-[#1C75BC]">
            
            <div class="flex items-start justify-between border-b border-[#D7DBDE] pb-3.5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#124F80] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {{ getInitials(selectedMessage.nom) }}
                </div>
                <div>
                  <h3 class="text-base font-bold text-[#1B1D1F]">
                    Fiche Usager : {{ selectedMessage.nom }}
                  </h3>
                  <p class="text-xs text-[#4B5157] mt-0.5">
                    Déposée le {{ selectedMessage.createdAt | date:'dd MMMM yyyy à HH:mm' }}
                  </p>
                </div>
              </div>
              <button (click)="closeMessageModal()" class="text-[#4B5157] hover:text-[#1B1D1F] text-xl font-bold p-1 cursor-pointer">✕</button>
            </div>

            <div class="mt-4 space-y-4 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                  <span class="text-[11px] font-bold text-[#4B5157] uppercase tracking-[0.05em] block mb-1">
                    Numéro de Téléphone
                  </span>
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-sm font-bold text-[#1B1D1F]">{{ selectedMessage.telephone }}</span>
                    <button type="button" (click)="copierTexte(selectedMessage.telephone, 'Numéro copié')" class="btn btn-secondary text-[11px] py-1 px-2 cursor-pointer">
                      📋 Copier
                    </button>
                  </div>
                </div>

                <div class="p-3 bg-[#F5F6F7] border border-[#D7DBDE] rounded-[2px]">
                  <span class="text-[11px] font-bold text-[#4B5157] uppercase tracking-[0.05em] block mb-1">
                    Filière ou Métier Ciblé
                  </span>
                  <div class="font-bold text-[#124F80] text-xs mt-1">
                    {{ selectedMessage.filiere || 'Orientation générale / Non précisée' }}
                  </div>
                </div>
              </div>

              <!-- Bloc Doléance intégrale -->
              <div class="p-4 bg-[#E7F1FA] border border-[#1C75BC]/30 rounded-[2px]">
                <span class="text-[11px] font-bold text-[#124F80] uppercase tracking-[0.05em] block mb-1.5 flex items-center gap-1.5">
                  <span>💬</span>
                  <span>Expression des Besoins, Questions & Doléances</span>
                </span>
                <p class="text-xs text-[#1B1D1F] leading-relaxed whitespace-pre-wrap font-medium">
                  {{ selectedMessage.message || 'Aucun message textuel fourni lors de la soumission.' }}
                </p>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#D7DBDE] pt-3.5">
              <button type="button" (click)="supprimerMessage(selectedMessage.id); closeMessageModal()" class="btn btn-ghost text-xs py-2 px-3 text-[#ED1C24] border-[#ED1C24] hover:bg-[#FDE6E6] cursor-pointer">
                🗑️ Archiver la demande
              </button>

              <div class="flex items-center gap-2">
                <button type="button" (click)="closeMessageModal()" class="btn btn-secondary text-xs py-2 px-4 cursor-pointer">
                  Fermer
                </button>
                <a routerLink="/admin/admissions" (click)="closeMessageModal()" class="btn btn-primary text-xs py-2 px-5 font-bold cursor-pointer shadow-xs flex items-center gap-1.5">
                  <span>👤</span>
                  <span>Ouvrir l'Espace Admissions</span>
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </app-main-layout>
  `,
})
export class AdminAccueilComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  savingSettings: boolean = false;
  savingWhatsapp: boolean = false;
  activeTab: string = 'settings';

  tabs = [
    { id: 'settings', label: 'Paramètres Hero & Réseaux' },
    { id: 'video', label: '🎬 Vidéo Institutionnelle' },
    { id: 'formateurs', label: 'Formateurs & Experts' },
    { id: 'campus', label: 'Campus & Ateliers' },
    { id: 'partenaires', label: 'Partenaires & Entreprises' },
    { id: 'temoignages', label: 'Témoignages & Réussites' },
    { id: 'actualites', label: 'Actualités & Vie du Centre' },
    { id: 'formations', label: 'Catalogue Formations (Vitrine)' },
    { id: 'avantage', label: 'Pourquoi Vitalis (Avantages)' },
    { id: 'pedagogie', label: 'Pédagogie APC' },
    { id: 'admission', label: 'Processus d\'Admission' },
    { id: 'secteur', label: 'Écosystème Professionnel' },
    { id: 'faq', label: 'Questions Fréquentes (FAQ)' },
    { id: 'verif_contact', label: 'Vérification, Contact & Footer' },
    { id: 'newsletter', label: 'Abonnés Newsletter' },
    { id: 'messages', label: 'Demandes d\'Orientation' },
  ];

  settings: Partial<LandingPageSettings> = {};
  allSections: LandingPageSection[] = [];
  actualitesList: LandingPageActualite[] = [];
  temoignagesList: LandingPageTemoignage[] = [];
  formateursList: LandingPageFormateur[] = [];
  campusList: LandingPageCampus[] = [];
  partenairesList: LandingPagePartenaire[] = [];
  newsletterAbonnesList: LandingNewsletterAbonne[] = [];
  contactMessages: ContactMessageItem[] = [];
  selectedMessage: ContactMessageItem | null = null;
  searchMessages: string = '';

  // Modals state
  modalSectionVisible: boolean = false;
  sectionEnCours: Partial<LandingPageSection> = {};

  modalActualiteVisible: boolean = false;
  actualiteEnCours: Partial<LandingPageActualite> = {};

  modalTemoignageVisible: boolean = false;
  temoignageEnCours: Partial<LandingPageTemoignage> = {};

  modalFormateurVisible: boolean = false;
  formateurEnCours: Partial<LandingPageFormateur> = {};

  modalCampusVisible: boolean = false;
  campusEnCours: Partial<LandingPageCampus> = {};

  modalPartenaireVisible: boolean = false;
  partenaireEnCours: Partial<LandingPagePartenaire> = {};

  // Upload States
  uploadingHeroImage: boolean = false;
  uploadingVideoPoster: boolean = false;
  uploadingVideoPresentation: boolean = false;
  uploadingImage: boolean = false;

  private notifSub: Subscription | null = null;

  constructor(
    private landingService: LandingService,
    private notifications: NotificationsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.chargerDonnees();
    this.chargerMessages();

    this.notifSub = this.notifications.messages().subscribe({
      next: (msg) => {
        if (msg && typeof msg === 'object' && msg.type === 'DEMANDE_ORIENTATION') {
          this.toast.info(`📬 ${msg.message || 'Nouvelle demande d\'orientation reçue.'}`);
          this.chargerMessages();
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
  }

  isSectionTab(tabId: string): boolean {
    return ['avantage', 'pedagogie', 'admission', 'secteur', 'faq'].includes(tabId);
  }

  chargerDonnees(): void {
    this.loading = true;

    this.landingService.getSettings().subscribe({
      next: (s) => {
        this.settings = s;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du chargement des paramètres.'),
    });

    this.landingService.getSections().subscribe({
      next: (sec) => {
        this.allSections = sec;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du chargement des sections.'),
    });

    this.rechargerFormateurs();
    this.rechargerCampus();
    this.rechargerPartenaires();
    this.rechargerTemoignages();
    this.rechargerActualites();
    this.chargerNewsletterAbonnes();
  }

  get sectionsFiltrees(): LandingPageSection[] {
    return this.allSections.filter((s) => s.typeSection === this.activeTab);
  }

  getNomSectionActive(): string {
    const t = this.tabs.find((tab) => tab.id === this.activeTab);
    return t ? t.label : '';
  }

  get whatsappPreviewUrl(): string | null {
    return buildWhatsappUrl(this.settings.contactWhatsapp, this.settings.whatsappMessage);
  }

  basculerWhatsapp(actif: boolean): void {
    if (this.savingWhatsapp) return;
    this.savingWhatsapp = true;
    this.landingService.updateSettings({ whatsappActif: actif === true }).subscribe({
      next: (res) => {
        this.settings = { ...this.settings, ...res };
        this.savingWhatsapp = false;
        notifyLandingSettingsChanged();
        this.toast.success(
          isWhatsappEnabled(res.whatsappActif)
            ? 'Bouton WhatsApp activé : il est maintenant visible pour les visiteurs.'
            : 'Bouton WhatsApp désactivé : il n’est plus visible sur la page d’accueil.',
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.settings.whatsappActif = !actif;
        this.savingWhatsapp = false;
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message || 'Impossible d’appliquer le réglage WhatsApp.';
        this.toast.error(msg);
        this.cdr.markForCheck();
      },
    });
  }

  sauvegarderSettings(): void {
    this.savingSettings = true;
    const payload: Partial<LandingPageSettings> = {
      heroTitre: this.settings.heroTitre || '',
      heroSousTitre: this.settings.heroSousTitre || '',
      heroNumeroAgrement: this.settings.heroNumeroAgrement || '',
      heroImage: this.settings.heroImage || '',
      heroBadge1Texte: this.settings.heroBadge1Texte || '',
      heroBadge2Texte: this.settings.heroBadge2Texte || '',
      heroBadge3Texte: this.settings.heroBadge3Texte || '',
      topbarTexte: this.settings.topbarTexte || '',
      statsLaureats: Number(this.settings.statsLaureats) || 0,
      statsTauxReussite: Number(this.settings.statsTauxReussite) || 0,
      statsFilieres: Number(this.settings.statsFilieres) || 0,
      statsTitresVerif: Number(this.settings.statsTitresVerif) || 0,
      ctaTitre: this.settings.ctaTitre || '',
      ctaSousTitre: this.settings.ctaSousTitre || '',
      formationsSurMesureTitre: this.settings.formationsSurMesureTitre || '',
      formationsSurMesureDescription: this.settings.formationsSurMesureDescription || '',
      verifTitre: this.settings.verifTitre || '',
      verifSousTitre: this.settings.verifSousTitre || '',
      verifExempleNumero: this.settings.verifExempleNumero || '',
      contactAdresse: this.settings.contactAdresse || '',
      contactEmail: this.settings.contactEmail || '',
      contactHoraires: this.settings.contactHoraires || '',
      contactTelephone: this.settings.contactTelephone || '',
      contactWhatsapp: this.settings.contactWhatsapp || '',
      whatsappMessage: this.settings.whatsappMessage || '',
      whatsappActif: this.settings.whatsappActif === true,
      videoActif: this.settings.videoActif !== false,
      videoSousTitre: this.settings.videoSousTitre || '',
      videoTitre: this.settings.videoTitre || '',
      videoDescription: this.settings.videoDescription || '',
      videoBoutonPrincipal: this.settings.videoBoutonPrincipal || '',
      videoBoutonSecondaire: this.settings.videoBoutonSecondaire || '',
      videoBoutonSecondaireUrl: this.settings.videoBoutonSecondaireUrl || '',
      videoPresentationUrl: this.settings.videoPresentationUrl || '',
      videoPosterUrl: this.settings.videoPosterUrl || '',
      videoBadgeHaut: this.settings.videoBadgeHaut || '',
      videoBadgeBas: this.settings.videoBadgeBas || '',
      videoTitreOverlay: this.settings.videoTitreOverlay || '',
      videoSousTitreOverlay: this.settings.videoSousTitreOverlay || '',
      videoLegende: this.settings.videoLegende || '',
      videoDuree: this.settings.videoDuree || '',
      socialLinkedin: this.settings.socialLinkedin || '',
      socialFacebook: this.settings.socialFacebook || '',
      socialYoutube: this.settings.socialYoutube || '',
      mapEmbedUrl: this.settings.mapEmbedUrl || '',
      liveActivityTexte: this.settings.liveActivityTexte || '',
      footerDescription: this.settings.footerDescription || '',
      footerTutelleTexte: this.settings.footerTutelleTexte || '',
      footerCopyright: this.settings.footerCopyright || '',
      footerBarreTexte: this.settings.footerBarreTexte || '',
    };

    this.landingService.updateSettings(payload).subscribe({
      next: (res) => {
        this.settings = res;
        this.savingSettings = false;
        notifyLandingSettingsChanged();
        this.toast.success('Paramètres enregistrés avec succès !');
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur API updateSettings:', err);
        this.savingSettings = false;
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message || 'Erreur lors de l\'enregistrement des paramètres.';
        this.toast.error(msg);
        this.cdr.markForCheck();
      },
    });
  }

  // --- GESTION DES FORMATEURS ---
  rechargerFormateurs(): void {
    this.landingService.getFormateurs().subscribe({
      next: (list) => {
        this.formateursList = list;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du chargement des formateurs.'),
    });
  }

  ouvrirModalFormateur(): void {
    this.formateurEnCours = {
      nom: '',
      titre: '',
      specialite: '',
      experience: "5+ ans d'expérience",
      photoUrl: '',
      linkedin: '',
      ordre: this.formateursList.length + 1,
      actif: true,
    };
    this.modalFormateurVisible = true;
  }

  editerFormateur(f: LandingPageFormateur): void {
    this.formateurEnCours = { ...f };
    this.modalFormateurVisible = true;
  }

  toggleFormateurActif(f: LandingPageFormateur): void {
    if (!f.id) return;
    const nouveauStatut = f.actif === false;
    this.landingService.updateFormateur(f.id, { actif: nouveauStatut }).subscribe({
      next: () => {
        f.actif = nouveauStatut;
        this.toast.success(nouveauStatut ? 'Formateur visible en vitrine.' : 'Formateur masqué.');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du changement de statut.'),
    });
  }

  onFormateurPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.landingService.uploadActualiteMedia(input.files[0]).subscribe({
        next: (res) => {
          this.formateurEnCours.photoUrl = res.url;
          this.toast.success('Photo du formateur téléversée avec succès.');
          this.cdr.markForCheck();
        },
        error: () => this.toast.error('Erreur lors du téléversement de la photo.'),
      });
    }
  }

  sauvegarderFormateurModal(): void {
    if (!this.formateurEnCours.nom || !this.formateurEnCours.titre || !this.formateurEnCours.specialite) {
      this.toast.error('Veuillez remplir les champs obligatoires.');
      return;
    }

    const payload: Partial<LandingPageFormateur> = {
      nom: this.formateurEnCours.nom,
      titre: this.formateurEnCours.titre,
      specialite: this.formateurEnCours.specialite,
      experience: this.formateurEnCours.experience || "5+ ans d'expérience",
      photoUrl: this.formateurEnCours.photoUrl || '',
      linkedin: this.formateurEnCours.linkedin || '',
      ordre: Number(this.formateurEnCours.ordre) || 0,
      actif: this.formateurEnCours.actif !== undefined ? Boolean(this.formateurEnCours.actif) : true,
    };

    if (this.formateurEnCours.id) {
      this.landingService.updateFormateur(this.formateurEnCours.id, payload).subscribe({
        next: () => {
          this.toast.success('Formateur mis à jour avec succès.');
          this.modalFormateurVisible = false;
          this.rechargerFormateurs();
        },
        error: () => this.toast.error('Erreur lors de la mise à jour du formateur.'),
      });
    } else {
      this.landingService.createFormateur(payload as any).subscribe({
        next: () => {
          this.toast.success('Formateur ajouté avec succès.');
          this.modalFormateurVisible = false;
          this.rechargerFormateurs();
        },
        error: () => this.toast.error('Erreur lors de la création du formateur.'),
      });
    }
  }

  supprimerFormateur(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce formateur ?')) return;
    this.landingService.deleteFormateur(id).subscribe({
      next: () => {
        this.toast.success('Formateur supprimé.');
        this.rechargerFormateurs();
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  // --- GESTION DU CAMPUS & ATELIERS ---
  rechargerCampus(): void {
    this.landingService.getCampus().subscribe({
      next: (list) => {
        this.campusList = list;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du chargement des espaces campus.'),
    });
  }

  ouvrirModalCampus(): void {
    this.campusEnCours = {
      titre: '',
      description: '',
      badge: '',
      equipements: '',
      photoUrl: '',
      ordre: this.campusList.length + 1,
      actif: true,
    };
    this.modalCampusVisible = true;
  }

  editerCampus(c: LandingPageCampus): void {
    this.campusEnCours = { ...c };
    this.modalCampusVisible = true;
  }

  toggleCampusActif(c: LandingPageCampus): void {
    if (!c.id) return;
    const nouveauStatut = c.actif === false;
    this.landingService.updateCampus(c.id, { actif: nouveauStatut }).subscribe({
      next: () => {
        c.actif = nouveauStatut;
        this.toast.success(nouveauStatut ? 'Espace visible.' : 'Espace masqué.');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du changement de visibilité.'),
    });
  }

  onCampusPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.landingService.uploadActualiteMedia(input.files[0]).subscribe({
        next: (res) => {
          this.campusEnCours.photoUrl = res.url;
          this.toast.success('Photo du campus téléversée.');
          this.cdr.markForCheck();
        },
        error: () => this.toast.error('Erreur lors du téléversement de la photo.'),
      });
    }
  }

  sauvegarderCampusModal(): void {
    if (!this.campusEnCours.titre || !this.campusEnCours.description || !this.campusEnCours.equipements) {
      this.toast.error('Veuillez remplir les champs obligatoires.');
      return;
    }

    const payload: Partial<LandingPageCampus> = {
      titre: this.campusEnCours.titre,
      description: this.campusEnCours.description,
      badge: this.campusEnCours.badge || '',
      equipements: this.campusEnCours.equipements,
      photoUrl: this.campusEnCours.photoUrl || '',
      ordre: Number(this.campusEnCours.ordre) || 0,
      actif: this.campusEnCours.actif !== undefined ? Boolean(this.campusEnCours.actif) : true,
    };

    if (this.campusEnCours.id) {
      this.landingService.updateCampus(this.campusEnCours.id, payload).subscribe({
        next: () => {
          this.toast.success('Espace campus mis à jour avec succès.');
          this.modalCampusVisible = false;
          this.rechargerCampus();
        },
        error: () => this.toast.error('Erreur lors de la mise à jour.'),
      });
    } else {
      this.landingService.createCampus(payload as any).subscribe({
        next: () => {
          this.toast.success('Espace campus créé avec succès.');
          this.modalCampusVisible = false;
          this.rechargerCampus();
        },
        error: () => this.toast.error('Erreur lors de la création.'),
      });
    }
  }

  supprimerCampus(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet espace campus ?')) return;
    this.landingService.deleteCampus(id).subscribe({
      next: () => {
        this.toast.success('Espace supprimé.');
        this.rechargerCampus();
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  // --- GESTION DES PARTENAIRES ---
  rechargerPartenaires(): void {
    this.landingService.getPartenaires().subscribe({
      next: (list) => {
        this.partenairesList = list;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du chargement des partenaires.'),
    });
  }

  ouvrirModalPartenaire(): void {
    this.partenaireEnCours = {
      nom: '',
      secteur: '',
      siteWeb: '',
      logoUrl: '',
      ordre: this.partenairesList.length + 1,
      actif: true,
    };
    this.modalPartenaireVisible = true;
  }

  editerPartenaire(p: LandingPagePartenaire): void {
    this.partenaireEnCours = { ...p };
    this.modalPartenaireVisible = true;
  }

  onPartenaireLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.landingService.uploadActualiteMedia(input.files[0]).subscribe({
        next: (res) => {
          this.partenaireEnCours.logoUrl = res.url;
          this.toast.success('Logo partenaire téléversé.');
          this.cdr.markForCheck();
        },
        error: () => this.toast.error('Erreur lors du téléversement du logo.'),
      });
    }
  }

  sauvegarderPartenaireModal(): void {
    if (!this.partenaireEnCours.nom) {
      this.toast.error('Veuillez renseigner le nom du partenaire.');
      return;
    }

    const payload: Partial<LandingPagePartenaire> = {
      nom: this.partenaireEnCours.nom,
      secteur: this.partenaireEnCours.secteur || '',
      siteWeb: this.partenaireEnCours.siteWeb || '',
      logoUrl: this.partenaireEnCours.logoUrl || '',
      ordre: Number(this.partenaireEnCours.ordre) || 0,
      actif: this.partenaireEnCours.actif !== undefined ? Boolean(this.partenaireEnCours.actif) : true,
    };

    if (this.partenaireEnCours.id) {
      this.landingService.updatePartenaire(this.partenaireEnCours.id, payload).subscribe({
        next: () => {
          this.toast.success('Partenaire mis à jour avec succès.');
          this.modalPartenaireVisible = false;
          this.rechargerPartenaires();
        },
        error: () => this.toast.error('Erreur lors de la mise à jour.'),
      });
    } else {
      this.landingService.createPartenaire(payload as any).subscribe({
        next: () => {
          this.toast.success('Partenaire ajouté avec succès.');
          this.modalPartenaireVisible = false;
          this.rechargerPartenaires();
        },
        error: () => this.toast.error('Erreur lors de la création.'),
      });
    }
  }

  supprimerPartenaire(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce partenaire ?')) return;
    this.landingService.deletePartenaire(id).subscribe({
      next: () => {
        this.toast.success('Partenaire supprimé.');
        this.rechargerPartenaires();
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  // --- GESTION DES TÉMOIGNAGES ENRICHIS ---
  rechargerTemoignages(): void {
    this.landingService.getTemoignages().subscribe({
      next: (t) => {
        this.temoignagesList = t;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du chargement des témoignages.'),
    });
  }

  ouvrirModalTemoignageEnrichi(): void {
    this.temoignageEnCours = {
      nom: '',
      role: '',
      entreprise: '',
      promotion: 'Promotion 2024',
      note: 5,
      citation: '',
      photoUrl: '',
      ordre: this.temoignagesList.length + 1,
      actif: true,
    };
    this.modalTemoignageVisible = true;
  }

  editerTemoignageEnrichi(tem: LandingPageTemoignage): void {
    this.temoignageEnCours = { ...tem };
    this.modalTemoignageVisible = true;
  }

  toggleTemoignageActif(t: LandingPageTemoignage): void {
    if (!t.id) return;
    const nouveauStatut = t.actif === false;
    this.landingService.updateTemoignage(t.id, { actif: nouveauStatut }).subscribe({
      next: () => {
        t.actif = nouveauStatut;
        this.toast.success(nouveauStatut ? 'Témoignage visible.' : 'Témoignage masqué.');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du changement de statut.'),
    });
  }

  onTemoignagePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.landingService.uploadActualiteMedia(input.files[0]).subscribe({
        next: (res) => {
          this.temoignageEnCours.photoUrl = res.url;
          this.toast.success('Photo du diplômé téléversée.');
          this.cdr.markForCheck();
        },
        error: () => this.toast.error('Erreur lors du téléversement de la photo.'),
      });
    }
  }

  sauvegarderTemoignageEnrichiModal(): void {
    if (!this.temoignageEnCours.nom || !this.temoignageEnCours.citation) {
      this.toast.error('Veuillez renseigner le nom et la citation.');
      return;
    }

    const payload: Partial<LandingPageTemoignage> = {
      nom: this.temoignageEnCours.nom,
      role: this.temoignageEnCours.role || '',
      entreprise: this.temoignageEnCours.entreprise || '',
      promotion: this.temoignageEnCours.promotion || '',
      note: Number(this.temoignageEnCours.note) || 5,
      citation: this.temoignageEnCours.citation,
      photoUrl: this.temoignageEnCours.photoUrl || '',
      ordre: Number(this.temoignageEnCours.ordre) || 0,
      actif: this.temoignageEnCours.actif !== undefined ? Boolean(this.temoignageEnCours.actif) : true,
    };

    if (this.temoignageEnCours.id) {
      this.landingService.updateTemoignage(this.temoignageEnCours.id, payload).subscribe({
        next: () => {
          this.toast.success('Témoignage mis à jour avec succès.');
          this.modalTemoignageVisible = false;
          this.rechargerTemoignages();
        },
        error: () => this.toast.error('Erreur lors de la mise à jour.'),
      });
    } else {
      this.landingService.createTemoignage(payload as any).subscribe({
        next: () => {
          this.toast.success('Témoignage ajouté avec succès.');
          this.modalTemoignageVisible = false;
          this.rechargerTemoignages();
        },
        error: () => this.toast.error('Erreur lors de l\'ajout.'),
      });
    }
  }

  supprimerTemoignage(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce témoignage ?')) return;
    this.landingService.deleteTemoignage(id).subscribe({
      next: () => {
        this.toast.success('Témoignage supprimé.');
        this.rechargerTemoignages();
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  // --- GESTION DES ABONNÉS NEWSLETTER ---
  chargerNewsletterAbonnes(): void {
    this.landingService.getNewsletterAbonnes().subscribe({
      next: (list) => {
        this.newsletterAbonnesList = list;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du chargement des abonnés newsletter.'),
    });
  }

  supprimerNewsletterAbonne(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir retirer cet abonné de la liste ?')) return;
    this.landingService.deleteNewsletterAbonne(id).subscribe({
      next: () => {
        this.toast.success('Abonné retiré de la liste.');
        this.chargerNewsletterAbonnes();
      },
      error: () => this.toast.error('Erreur lors de la suppression de l\'abonné.'),
    });
  }

  // --- GESTION DES SECTIONS MODULAIRES & FAQ ---
  ouvrirModalSection(): void {
    this.sectionEnCours = {
      typeSection: this.activeTab,
      titre: '',
      sousTitre: '',
      description: '',
      categorie: this.activeTab === 'faq' ? 'ADMISSIONS' : undefined,
      ordre: this.sectionsFiltrees.length + 1,
      couleur: '#1C75BC',
      icone: '',
      actif: true,
    };
    this.modalSectionVisible = true;
  }

  editerSection(sec: LandingPageSection): void {
    this.sectionEnCours = { ...sec };
    this.modalSectionVisible = true;
  }

  toggleSectionActif(sec: LandingPageSection): void {
    if (!sec.id) return;
    const nouveauStatut = !sec.actif;
    this.landingService.updateSection(sec.id, { actif: nouveauStatut }).subscribe({
      next: () => {
        sec.actif = nouveauStatut;
        this.toast.success(nouveauStatut ? 'Élément activé et visible.' : 'Élément masqué.');
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Erreur lors du changement de visibilité.'),
    });
  }

  sauvegarderSectionModal(): void {
    if (!this.sectionEnCours.titre) return;

    const payload: Partial<LandingPageSection> = {
      typeSection: this.sectionEnCours.typeSection || this.activeTab,
      titre: this.sectionEnCours.titre,
      sousTitre: this.sectionEnCours.sousTitre || '',
      description: this.sectionEnCours.description || '',
      categorie: this.sectionEnCours.categorie || '',
      ordre: Number(this.sectionEnCours.ordre) || 0,
      couleur: this.sectionEnCours.couleur || '#1C75BC',
      icone: this.sectionEnCours.icone || '',
      actif: this.sectionEnCours.actif !== undefined ? Boolean(this.sectionEnCours.actif) : true,
    };

    if (this.sectionEnCours.id) {
      this.landingService.updateSection(this.sectionEnCours.id, payload).subscribe({
        next: () => {
          this.toast.success('Élément mis à jour avec succès.');
          this.modalSectionVisible = false;
          this.rechargerSections();
        },
        error: () => this.toast.error('Erreur lors de la mise à jour.'),
      });
    } else {
      this.landingService.createSection(payload as any).subscribe({
        next: () => {
          this.toast.success('Nouvel élément ajouté avec succès.');
          this.modalSectionVisible = false;
          this.rechargerSections();
        },
        error: () => this.toast.error('Erreur lors de la création.'),
      });
    }
  }

  supprimerSection(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    this.landingService.deleteSection(id).subscribe({
      next: () => {
        this.toast.success('Élément supprimé.');
        this.rechargerSections();
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  private rechargerSections(): void {
    this.landingService.getSections().subscribe({
      next: (sec) => {
        this.allSections = sec;
        this.cdr.markForCheck();
      },
    });
  }

  // --- GESTION DES ACTUALITÉS DU CENTRE VITALIS ---
  rechargerActualites(): void {
    this.landingService.getActualites().subscribe({
      next: (acts) => {
        this.actualitesList = acts;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des actualités.');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  getCategorieLabel(cat?: string): string {
    switch ((cat || '').toUpperCase()) {
      case 'INNOVATION': return 'Innovation & Tech';
      case 'ADMISSIONS': return 'Admissions';
      case 'PARTENARIAT': return 'Partenariat';
      case 'PEDAGOGIE': return 'Pédagogie APC';
      case 'VIE_DU_CENTRE': return 'Vie du Centre';
      case 'COMMUNIQUE_OFFICIEL': return 'Communiqué';
      default: return cat || 'Actualité';
    }
  }

  getCategorieBadgeColor(cat?: string, fallback?: string): string {
    if (fallback && fallback.startsWith('#')) return fallback;
    switch ((cat || '').toUpperCase()) {
      case 'INNOVATION': return '#1C75BC';
      case 'ADMISSIONS': return '#F0791E';
      case 'PARTENARIAT': return '#276B44';
      case 'PEDAGOGIE': return '#124F80';
      case 'VIE_DU_CENTRE': return '#2AA9A0';
      case 'COMMUNIQUE_OFFICIEL': return '#ED1C24';
      default: return '#1C75BC';
    }
  }

  // Hero Photo Helpers
  declencherInputHeroImage(): void {
    const el = document.getElementById('heroImageFileInput') as HTMLInputElement;
    el?.click();
  }

  onHeroImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingHeroImage = true;
      this.landingService.uploadActualiteMedia(input.files[0]).subscribe({
        next: (res) => {
          this.uploadingHeroImage = false;
          this.settings.heroImage = res.url;
          this.toast.success(`Photo du Hero « ${input.files![0].name} » téléversée avec succès.`);
          this.cdr.markForCheck();
        },
        error: () => {
          this.uploadingHeroImage = false;
          this.toast.error('Erreur lors du téléversement de la photo.');
          this.cdr.markForCheck();
        },
      });
    }
  }

  supprimerHeroImage(): void {
    this.settings.heroImage = '';
    this.toast.info('Photo personnalisée retirée. L\'image par défaut sera affichée.');
  }

  // Video Poster & URL Helpers
  onVideoPosterSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingVideoPoster = true;
      this.landingService.uploadActualiteMedia(input.files[0]).subscribe({
        next: (res) => {
          this.uploadingVideoPoster = false;
          this.settings.videoPosterUrl = res.url;
          this.toast.success(`Miniature vidéo « ${input.files![0].name} » téléversée avec succès.`);
          this.cdr.markForCheck();
        },
        error: () => {
          this.uploadingVideoPoster = false;
          this.toast.error('Erreur lors du téléversement de la miniature.');
          this.cdr.markForCheck();
        },
      });
    }
  }

  // Video Presentation Upload (fichier local)
  onVideoPresentationSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // Vérification côté client : max 200 Mo
      const maxSize = 200 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toast.error(`Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum autorisé : 200 Mo.`);
        input.value = '';
        return;
      }
      this.uploadingVideoPresentation = true;
      this.cdr.markForCheck();
      this.landingService.uploadActualiteMedia(file).subscribe({
        next: (res) => {
          this.uploadingVideoPresentation = false;
          this.settings.videoPresentationUrl = res.url;
          this.toast.success(`Vidéo « ${file.name} » téléversée avec succès. Elle sera lue en lecteur natif.`);
          input.value = '';
          this.cdr.markForCheck();
        },
        error: () => {
          this.uploadingVideoPresentation = false;
          this.toast.error('Erreur lors du téléversement de la vidéo. Vérifiez la taille et le format du fichier.');
          input.value = '';
          this.cdr.markForCheck();
        },
      });
    }
  }

  formatVideoUrlInput(): void {
    if (this.settings.videoPresentationUrl) {
      const url = this.settings.videoPresentationUrl.trim();
      const ytWatchMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytWatchMatch && ytWatchMatch[1]) {
        this.settings.videoPresentationUrl = `https://www.youtube-nocookie.com/embed/${ytWatchMatch[1]}?rel=0`;
      }
    }
  }

  getHeroImagePreview(): string {
    const url = this.settings.heroImage;
    if (!url) {
      return 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80';
    }
    return this.getMediaUrl(url);
  }

  // Actualités Media Helpers
  declencherInputImage(): void {
    const el = document.getElementById('actualiteImgInput') as HTMLInputElement;
    el?.click();
  }

  supprimerImageActuelle(): void {
    this.actualiteEnCours.imageUrl = '';
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.uploadingImage = true;
      this.landingService.uploadActualiteMedia(input.files[0]).subscribe({
        next: (res) => {
          this.uploadingImage = false;
          this.actualiteEnCours.imageUrl = res.url;
          this.toast.success(`Photo « ${input.files![0].name} » importée avec succès.`);
          this.cdr.markForCheck();
        },
        error: () => {
          this.uploadingImage = false;
          this.toast.error('Erreur lors du téléversement de la photo.');
          this.cdr.markForCheck();
        },
      });
    }
  }

  getMediaUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
      const backendBase = environment.apiUrl.replace(/\/api\/?$/, '');
      return `${backendBase}${url}`;
    }
    return url;
  }

  onImageError(event: Event, fallback = 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop'): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== fallback) {
      target.src = fallback;
    }
  }

  ouvrirModalActualite(): void {
    this.actualiteEnCours = {
      titre: '',
      chapeau: '',
      contenu: '',
      categorie: 'INNOVATION',
      imageUrl: '',
      videoUrl: '',
      badgeCouleur: '#1C75BC',
      datePublication: new Date(),
      auteur: 'Direction de la Communication',
      aLaUne: false,
      ordre: this.actualitesList.length + 1,
      actif: true,
    };
    this.modalActualiteVisible = true;
  }

  editerActualite(act: LandingPageActualite): void {
    this.actualiteEnCours = { ...act };
    this.modalActualiteVisible = true;
  }

  sauvegarderActualiteModal(): void {
    if (!this.actualiteEnCours.titre || !this.actualiteEnCours.chapeau) {
      this.toast.error('Veuillez renseigner le titre et le chapeau de l\'actualité.');
      return;
    }

    const payload: Partial<LandingPageActualite> = {
      titre: this.actualiteEnCours.titre,
      chapeau: this.actualiteEnCours.chapeau || '',
      contenu: this.actualiteEnCours.contenu || '',
      categorie: this.actualiteEnCours.categorie || 'VIE_DU_CENTRE',
      imageUrl: this.actualiteEnCours.imageUrl || '',
      videoUrl: this.actualiteEnCours.videoUrl || '',
      badgeCouleur: this.actualiteEnCours.badgeCouleur || '#1C75BC',
      auteur: this.actualiteEnCours.auteur || 'Direction Vitalis',
      aLaUne: this.actualiteEnCours.aLaUne !== undefined ? Boolean(this.actualiteEnCours.aLaUne) : false,
      ordre: Number(this.actualiteEnCours.ordre) || 0,
      actif: this.actualiteEnCours.actif !== undefined ? Boolean(this.actualiteEnCours.actif) : true,
    };

    if (this.actualiteEnCours.id) {
      this.landingService.updateActualite(this.actualiteEnCours.id, payload).subscribe({
        next: () => {
          this.toast.success('Actualité mise à jour avec succès.');
          this.modalActualiteVisible = false;
          this.rechargerActualites();
        },
        error: () => this.toast.error('Erreur lors de la mise à jour.'),
      });
    } else {
      this.landingService.createActualite(payload as any).subscribe({
        next: () => {
          this.toast.success('Actualité publiée avec succès.');
          this.modalActualiteVisible = false;
          this.rechargerActualites();
        },
        error: () => this.toast.error('Erreur lors de la création.'),
      });
    }
  }

  supprimerActualite(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette actualité ?')) return;
    this.landingService.deleteActualite(id).subscribe({
      next: () => {
        this.toast.success('Actualité supprimée.');
        this.rechargerActualites();
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  toggleAlaUne(act: LandingPageActualite): void {
    this.landingService.updateActualite(act.id!, { aLaUne: !act.aLaUne }).subscribe({
      next: () => {
        this.toast.success(`Article ${!act.aLaUne ? 'mis à la une' : 'retiré de la une'}.`);
        this.rechargerActualites();
      },
      error: () => this.toast.error('Erreur lors de la mise à jour.'),
    });
  }

  toggleActifActualite(act: LandingPageActualite): void {
    this.landingService.updateActualite(act.id!, { actif: !act.actif }).subscribe({
      next: () => {
        this.toast.success(`Statut modifié : ${!act.actif ? 'Publié' : 'Masqué'}.`);
        this.rechargerActualites();
      },
      error: () => this.toast.error('Erreur lors de la mise à jour.'),
    });
  }

  // --- DEMANDES D'ORIENTATION ---
  openMessageModal(msg: ContactMessageItem): void {
    this.selectedMessage = msg;
  }

  closeMessageModal(): void {
    this.selectedMessage = null;
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
      () => this.toast.success(messageSucces),
      () => this.toast.info(`Texte : ${texte}`)
    );
  }

  countMessagesWithFiliere(): number {
    return this.contactMessages.filter((m) => !!m.filiere && m.filiere.trim().length > 0).length;
  }

  get filteredContactMessages(): ContactMessageItem[] {
    if (!this.searchMessages?.trim()) {
      return this.contactMessages;
    }
    const q = this.searchMessages.toLowerCase().trim();
    return this.contactMessages.filter((m) => {
      return (
        (m.nom && m.nom.toLowerCase().includes(q)) ||
        (m.telephone && m.telephone.toLowerCase().includes(q)) ||
        (m.filiere && m.filiere.toLowerCase().includes(q)) ||
        (m.message && m.message.toLowerCase().includes(q))
      );
    });
  }

  chargerMessages(): void {
    this.landingService.getContactMessages().subscribe({
      next: (msgs) => {
        this.contactMessages = msgs || [];
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Impossible de charger les demandes d\'orientation.'),
    });
  }

  supprimerMessage(id: string): void {
    if (!confirm('Voulez-vous marquer cette demande comme traitée / la supprimer ?')) return;
    this.landingService.deleteContactMessage(id).subscribe({
      next: () => {
        this.toast.success('Demande d\'orientation retirée.');
        this.chargerMessages();
      },
      error: () => this.toast.error('Erreur lors du traitement de la demande.'),
    });
  }
}
