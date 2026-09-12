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
                01 · Administration Centrale · CMS Landing Page
              </div>
              <h1 class="text-2xl sm:text-3xl font-bold text-[#1B1D1F] mt-1 tracking-tight">
                Gestion Intégrale de la Page d'Accueil
              </h1>
              <div class="barre"></div>
              <p class="text-[14px] text-[#4B5157] mt-3 max-w-2xl leading-relaxed">
                Configurez l'ensemble des contenus, sections institutionnelles, garanties, chiffres clés, parcours d'admission, témoignages et mentions légales en direct.
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

        <!-- 1. ONGLET PARAMÈTRES GÉNÉRAUX & HERO & STATS -->
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
                Conforme aux standards internationaux (Coursera, OpenClassrooms, TAFE NSW) : texte institutionnel à gauche et composition visuelle humaine avec micro-badges à droite.
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
                        <label for="heroImageUrlInput" class="text-[11px] text-[#4B5157]">Ou coller une URL d'image web directe (ex: Unsplash, CDN...)</label>
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

        <!-- 2. ONGLET VÉRIFICATION, FORMATIONS ENTREPRISE & CONTACT / FOOTER -->
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
              <p class="text-xs text-[#4B5157] mb-4">Ce bouton apparaît sur la page d'accueil publique et permet aux visiteurs de contacter un conseiller. Le numéro d'appel du secrétariat n'est pas utilisé ici.</p>
              
              <div class="grid md:grid-cols-2 gap-4">
                <div class="field">
                  <label>Numéro WhatsApp officiel</label>
                  <input type="text" [(ngModel)]="settings.contactWhatsapp" name="contactWhatsapp" maxlength="50" placeholder="+243 843 010 337" />
                  <small class="text-[10px] text-[#4B5157] mt-1 block">Formats acceptés : +243…, 0843…, 9 chiffres locaux. Le lien wa.me est calculé automatiquement.</small>
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
                  <small class="text-[10px] text-[#4B5157] mt-1.5 block">{{ savingWhatsapp ? 'Application automatique en cours…' : 'L’interrupteur s’applique automatiquement aux visiteurs, sans autre enregistrement.' }}</small>
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

        <!-- 3. ONGLET SECTIONS MODULAIRES (Avantages, Pédagogie, Admission, Secteurs, FAQ) -->
        <div *ngIf="activeTab !== 'settings' && activeTab !== 'verif_contact' && activeTab !== 'actualites' && activeTab !== 'messages'" class="space-y-6 animate-fade-in-up">
          
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

        <!-- 4. ONGLET ACTUALITÉS DU CENTRE VITALIS -->
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

        <!-- MODAL D'ÉDITION/CRÉATION DE SECTION -->
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

              <div class="field">
                <label>Sous-titre / Tag descriptif</label>
                <input type="text" [(ngModel)]="sectionEnCours.sousTitre" name="sousTitre" placeholder="Ex : Agrément National ou Étape 01" />
              </div>

              <div class="field">
                <label>Description / Texte de détail</label>
                <textarea rows="3" [(ngModel)]="sectionEnCours.description" name="description"></textarea>
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

        <!-- MODAL D'ÉDITION/CRÉATION D'ACTUALITÉ DU CENTRE -->
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

              <!-- GESTION MULTIMÉDIA : IMAGE DE COUVERTURE & VIDÉO LOCALE/EXTERNE -->
              <div class="space-y-4 pt-2 border-t border-[#EDEFF2]">
                
                <!-- 1. IMAGE DE COUVERTURE -->
                <div class="p-3.5 bg-[#F9FAFB] border border-[#D7DBDE] rounded-xs space-y-2.5">
                  <div class="flex items-center justify-between">
                    <label class="font-bold text-[#124F80] flex items-center gap-1.5 text-xs">
                      <span>📷</span> Image de Couverture / Photo Officielle *
                    </label>
                    <span class="text-[11px] text-slate-500">JPG, PNG, WebP, GIF (Max 50 Mo)</span>
                  </div>

                  <!-- Zone d'aperçu si image existante -->
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

                  <!-- Zone de Téléversement Drag & Drop si pas d'image -->
                  <div 
                    *ngIf="!actualiteEnCours.imageUrl"
                    (click)="declencherInputImage()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onImageDropped($event)"
                    class="border-2 border-dashed border-[#1C75BC]/40 hover:border-[#1C75BC] bg-white hover:bg-[#E7F1FA]/30 rounded-xs p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <span class="text-2xl">🖼️</span>
                    <span class="font-bold text-[#124F80] text-xs">
                      Cliquez pour choisir une photo depuis votre appareil
                    </span>
                    <span class="text-[11px] text-slate-500">ou glissez-déposez votre image ici</span>
                  </div>

                  <!-- Input file masqué -->
                  <input 
                    #fileInputImage 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp,image/gif" 
                    (change)="onImageSelected($event)" 
                    class="hidden" 
                  />

                  <!-- Barre de progression d'upload image -->
                  <div *ngIf="uploadingImage" class="flex items-center gap-2 text-xs font-bold text-[#1C75BC]">
                    <span class="animate-spin text-base">⏳</span>
                    <span>Téléversement de l'image en cours...</span>
                  </div>

                  <!-- Option URL externe alternative -->
                  <details class="text-[11px] text-slate-500 pt-1">
                    <summary class="cursor-pointer hover:text-[#1C75BC] font-semibold">Ou coller une URL d'image web directe</summary>
                    <input type="url" [(ngModel)]="actualiteEnCours.imageUrl" name="imageUrl" placeholder="https://images.unsplash.com/..." class="mt-1.5 w-full bg-white p-2 border border-[#D7DBDE] rounded-2xs" />
                  </details>
                </div>

                <!-- 2. VIDÉO DE REPORTAGE / ÉVÉNEMENT -->
                <div class="p-3.5 bg-[#F9FAFB] border border-[#D7DBDE] rounded-xs space-y-2.5">
                  <div class="flex items-center justify-between flex-wrap gap-2">
                    <label class="font-bold text-[#124F80] flex items-center gap-1.5 text-xs">
                      <span>🎬</span> Vidéo Associée / Reportage (Optionnel)
                    </label>
                    
                    <!-- Sélecteur de mode vidéo : Fichier Local vs Lien Externe -->
                    <div class="inline-flex rounded-2xs border border-[#D7DBDE] bg-white p-0.5 text-[10px]">
                      <button 
                        type="button" 
                        (click)="videoSourceType = 'upload'"
                        [ngClass]="videoSourceType === 'upload' ? 'bg-[#1C75BC] text-white font-bold' : 'text-[#4B5157] font-medium hover:bg-slate-100'"
                        class="px-2 py-0.5 rounded-2xs transition-colors cursor-pointer"
                      >
                        📁 Fichier Local (MP4/WebM)
                      </button>
                      <button 
                        type="button" 
                        (click)="videoSourceType = 'url'"
                        [ngClass]="videoSourceType === 'url' ? 'bg-[#1C75BC] text-white font-bold' : 'text-[#4B5157] font-medium hover:bg-slate-100'"
                        class="px-2 py-0.5 rounded-2xs transition-colors cursor-pointer"
                      >
                        🔗 Lien Web / YouTube
                      </button>
                    </div>
                  </div>

                  <!-- Aperçu du Lecteur Vidéo si une vidéo est déjà renseignée -->
                  <div *ngIf="actualiteEnCours.videoUrl" class="space-y-2">
                    <div class="rounded-xs overflow-hidden border border-[#D7DBDE] bg-black shadow-xs">
                      <div class="bg-[#124F80] text-white px-2.5 py-1 text-[10px] font-bold flex items-center justify-between">
                        <span>▶️ Lecteur de Prévisualisation Officiel</span>
                        <button type="button" (click)="supprimerVideoActuelle()" class="text-red-300 hover:text-white font-bold cursor-pointer">✕ Supprimer</button>
                      </div>
                      
                      <!-- Si vidéo locale ou MP4 direct -->
                      <video 
                        *ngIf="isVideoLocal(actualiteEnCours.videoUrl)" 
                        [src]="getMediaUrl(actualiteEnCours.videoUrl)" 
                        controls 
                        playsinline 
                        class="w-full max-h-48 bg-black"
                      ></video>

                      <!-- Si lien externe (YouTube, etc.) -->
                      <div *ngIf="!isVideoLocal(actualiteEnCours.videoUrl)" class="p-3 text-white text-xs flex items-center justify-between bg-slate-900">
                        <span class="truncate">{{ actualiteEnCours.videoUrl }}</span>
                        <a [href]="actualiteEnCours.videoUrl" target="_blank" class="px-2 py-1 bg-[#1C75BC] text-white rounded-2xs text-[10px] font-bold shrink-0">Tester ↗</a>
                      </div>
                    </div>
                  </div>

                  <!-- Mode 1 : Téléversement Vidéo Locale depuis l'appareil -->
                  <div *ngIf="videoSourceType === 'upload' && !actualiteEnCours.videoUrl">
                    <div 
                      (click)="declencherInputVideo()"
                      (dragover)="onDragOver($event)"
                      (dragleave)="onDragLeave($event)"
                      (drop)="onVideoDropped($event)"
                      class="border-2 border-dashed border-[#F0791E]/40 hover:border-[#F0791E] bg-white hover:bg-[#FDECDD]/30 rounded-xs p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
                    >
                      <span class="text-2xl">📹</span>
                      <span class="font-bold text-[#F0791E] text-xs">
                        Cliquez pour importer une vidéo depuis votre appareil
                      </span>
                      <span class="text-[11px] text-slate-500">MP4, WebM, MOV (jusqu'à 100 Mo)</span>
                    </div>

                    <!-- Input file vidéo masqué -->
                    <input 
                      #fileInputVideo 
                      type="file" 
                      accept="video/mp4,video/webm,video/quicktime" 
                      (change)="onVideoSelected($event)" 
                      class="hidden" 
                    />

                    <!-- Barre de progression d'upload vidéo -->
                    <div *ngIf="uploadingVideo" class="flex items-center gap-2 text-xs font-bold text-[#F0791E] mt-2">
                      <span class="animate-spin text-base">⏳</span>
                      <span>Téléversement du fichier vidéo en cours sur le serveur (cela peut prendre quelques secondes)...</span>
                    </div>
                  </div>

                  <!-- Mode 2 : Lien Vidéo Externe -->
                  <div *ngIf="videoSourceType === 'url' && !actualiteEnCours.videoUrl" class="space-y-1">
                    <input 
                      type="url" 
                      [(ngModel)]="actualiteEnCours.videoUrl" 
                      name="videoUrl" 
                      placeholder="Ex : https://www.youtube.com/watch?v=... ou https://vimeo.com/..." 
                      class="w-full bg-white p-2 border border-[#D7DBDE] rounded-2xs text-xs font-medium" 
                    />
                    <p class="text-[10px] text-slate-500">Insérez l'adresse complète de la vidéo YouTube, Vimeo ou un lien MP4 direct.</p>
                  </div>
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

        <!-- 9. ONGLET DEMANDES D'ORIENTATION & DOLÉANCES -->
        <div *ngIf="activeTab === 'messages'" class="space-y-6 animate-fade-in-up">
          <div class="card border-t-[5px] border-t-[#1C75BC]">
            
            <!-- En-tête de section -->
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
                {{ searchMessages ? 'Modifiez votre terme de recherche.' : 'Les nouvelles doléances et questions soumises sur la landing page apparaîtront instantanément ici.' }}
              </p>
            </div>

            <!-- Tableau moderne & épuré -->
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
        <!-- MODAL DÉTAILS : FICHE D'INSTRUCTION DE LA DEMANDE D'ORIENTATION (ADMIN ACCUEIL)           -->
        <!-- ========================================================================================= -->
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
    { id: 'settings', label: 'Paramètres Hero & Stats' },
    { id: 'messages', label: 'Demandes d\'Orientation & Doléances' },
    { id: 'actualites', label: 'Actualités & Vie du Centre' },
    { id: 'avantage', label: 'Pourquoi Vitalis (Avantages)' },
    { id: 'pedagogie', label: 'Pédagogie APC' },
    { id: 'admission', label: 'Processus d\'Admission' },
    { id: 'secteur', label: 'Écosystème Professionnel' },
    { id: 'verif_contact', label: 'Vérification, Contact & Footer' },
    { id: 'faq', label: 'Questions Fréquentes (FAQ)' },
  ];

  settings: Partial<LandingPageSettings> = {};
  allSections: LandingPageSection[] = [];
  actualitesList: LandingPageActualite[] = [];
  temoignagesList: LandingPageTemoignage[] = [];
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

  chargerDonnees(): void {
    this.loading = true;

    this.landingService.getSettings().subscribe({
      next: (s) => {
        this.settings = s;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des paramètres.');
        this.cdr.markForCheck();
      },
    });

    this.landingService.getSections().subscribe({
      next: (sec) => {
        this.allSections = sec;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erreur lors du chargement des sections.');
        this.cdr.markForCheck();
      },
    });

    this.rechargerActualites();
  }

  get sectionsFiltrees(): LandingPageSection[] {
    return this.allSections.filter((s) => s.typeSection === this.activeTab);
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

  getNomSectionActive(): string {
    const t = this.tabs.find((tab) => tab.id === this.activeTab);
    return t ? t.label : '';
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
        if (this.activeTab === 'verif_contact') {
          const whatsappOn = res.whatsappActif === true;
          this.toast.success(
            whatsappOn
              ? 'Paramètres enregistrés. Le bouton WhatsApp est maintenant visible pour les visiteurs.'
              : 'Paramètres enregistrés. Le bouton WhatsApp est maintenant masqué pour les visiteurs.',
          );
        } else {
          this.toast.success('Paramètres enregistrés avec succès !');
        }
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

  // --- GESTION DES SECTIONS ---
  ouvrirModalSection(): void {
    this.sectionEnCours = {
      typeSection: this.activeTab,
      titre: '',
      sousTitre: '',
      description: '',
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
      error: () => {
        this.toast.error('Erreur lors du changement de visibilité.');
      },
    });
  }

  sauvegarderSectionModal(): void {
    if (!this.sectionEnCours.titre) return;

    const payload: Partial<LandingPageSection> = {
      typeSection: this.sectionEnCours.typeSection || this.activeTab,
      titre: this.sectionEnCours.titre,
      sousTitre: this.sectionEnCours.sousTitre || '',
      description: this.sectionEnCours.description || '',
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
        error: (err) => {
          console.error('Erreur API updateSection:', err);
          const msg = Array.isArray(err?.error?.message)
            ? err.error.message.join(', ')
            : err?.error?.message || 'Erreur lors de la mise à jour.';
          this.toast.error(msg);
        },
      });
    } else {
      this.landingService.createSection(payload as any).subscribe({
        next: () => {
          this.toast.success('Nouvel élément ajouté avec succès.');
          this.modalSectionVisible = false;
          this.rechargerSections();
        },
        error: (err) => {
          console.error('Erreur API createSection:', err);
          const msg = Array.isArray(err?.error?.message)
            ? err.error.message.join(', ')
            : err?.error?.message || 'Erreur lors de la création.';
          this.toast.error(msg);
        },
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
      error: (err) => {
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message || 'Erreur lors de la suppression.';
        this.toast.error(msg);
      },
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
      case 'INNOVATION': return '#1C75BC'; // Bleu officiel
      case 'ADMISSIONS': return '#F0791E'; // Or solaire
      case 'PARTENARIAT': return '#276B44'; // Vert succès
      case 'PEDAGOGIE': return '#124F80'; // Bleu foncé
      case 'VIE_DU_CENTRE': return '#2AA9A0'; // Teal
      case 'COMMUNIQUE_OFFICIEL': return '#ED1C24'; // Rouge alerte
      default: return '#1C75BC';
    }
  }

  // Hero Photo State & Upload
  uploadingHeroImage: boolean = false;

  declencherInputHeroImage(): void {
    const el = document.getElementById('heroImageFileInput') as HTMLInputElement;
    el?.click();
  }

  onHeroImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.televerserHeroImage(input.files[0]);
    }
  }

  private televerserHeroImage(file: File): void {
    this.uploadingHeroImage = true;
    this.landingService.uploadActualiteMedia(file).subscribe({
      next: (res) => {
        this.uploadingHeroImage = false;
        this.settings.heroImage = res.url;
        this.toast.success(`Photo du Hero « ${file.name} » téléversée avec succès.`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploadingHeroImage = false;
        this.toast.error(err?.error?.message || 'Erreur lors du téléversement de la photo.');
        this.cdr.markForCheck();
      },
    });
  }

  supprimerHeroImage(): void {
    this.settings.heroImage = '';
    this.toast.info('Photo personnalisée retirée. L\'image par défaut sera affichée.');
  }

  getHeroImagePreview(): string {
    const url = this.settings.heroImage;
    if (!url) {
      return 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80';
    }
    return this.getMediaUrl(url);
  }

  // Media Upload State (Actualités)
  uploadingImage: boolean = false;
  uploadingVideo: boolean = false;
  videoSourceType: 'upload' | 'url' = 'upload';

  declencherInputImage(): void {
    const el = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
    el?.click();
  }

  declencherInputVideo(): void {
    const el = document.querySelector('input[type="file"][accept*="video"]') as HTMLInputElement;
    el?.click();
  }

  supprimerImageActuelle(): void {
    this.actualiteEnCours.imageUrl = '';
  }

  supprimerVideoActuelle(): void {
    this.actualiteEnCours.videoUrl = '';
  }

  isVideoLocal(url?: string): boolean {
    if (!url) return false;
    const clean = url.toLowerCase();
    return (
      clean.includes('/uploads/') ||
      clean.includes('/vitalis-media/') ||
      clean.includes('.mp4') ||
      clean.includes('.webm') ||
      clean.includes('.mov') ||
      clean.includes('.ogg')
    );
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

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.televerserImage(input.files[0]);
    }
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.televerserVideo(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onImageDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        this.televerserImage(file);
      } else {
        this.toast.error('Veuillez glisser un fichier image valide (JPG, PNG, WebP, GIF).');
      }
    }
  }

  onVideoDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        this.televerserVideo(file);
      } else {
        this.toast.error('Veuillez glisser un fichier vidéo valide (MP4, WebM, MOV).');
      }
    }
  }

  private televerserImage(file: File): void {
    this.uploadingImage = true;
    this.landingService.uploadActualiteMedia(file).subscribe({
      next: (res) => {
        this.uploadingImage = false;
        this.actualiteEnCours.imageUrl = res.url;
        this.toast.success(`Photo « ${file.name} » importée avec succès.`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploadingImage = false;
        console.error('Erreur upload photo:', err);
        this.toast.error('Erreur lors du téléversement de la photo.');
        this.cdr.markForCheck();
      },
    });
  }

  private televerserVideo(file: File): void {
    this.uploadingVideo = true;
    this.landingService.uploadActualiteMedia(file).subscribe({
      next: (res) => {
        this.uploadingVideo = false;
        this.actualiteEnCours.videoUrl = res.url;
        this.toast.success(`Vidéo « ${file.name} » téléversée avec succès sur le serveur.`);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.uploadingVideo = false;
        console.error('Erreur upload vidéo:', err);
        this.toast.error('Erreur lors du téléversement de la vidéo.');
        this.cdr.markForCheck();
      },
    });
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
    this.videoSourceType = 'upload';
    this.modalActualiteVisible = true;
  }

  editerActualite(act: LandingPageActualite): void {
    this.actualiteEnCours = { ...act };
    this.videoSourceType = this.isVideoLocal(act.videoUrl) ? 'upload' : (act.videoUrl ? 'url' : 'upload');
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
        error: (err) => {
          console.error('Erreur updateActualite:', err);
          this.toast.error('Erreur lors de la mise à jour de l\'actualité.');
        },
      });
    } else {
      this.landingService.createActualite(payload as any).subscribe({
        next: () => {
          this.toast.success('Actualité publiée avec succès.');
          this.modalActualiteVisible = false;
          this.rechargerActualites();
        },
        error: (err) => {
          console.error('Erreur createActualite:', err);
          this.toast.error('Erreur lors de la création de l\'actualité.');
        },
      });
    }
  }

  supprimerActualite(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette actualité ?')) return;

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

  // --- GESTION DES TÉMOIGNAGES (COMPATIBILITÉ) ---
  ouvrirModalTemoignage(): void {
    this.temoignageEnCours = {
      nom: '',
      initiales: '',
      role: '',
      promotion: '',
      citation: '',
      couleur: '#1C75BC',
      ordre: this.temoignagesList.length + 1,
      actif: true,
    };
    this.modalTemoignageVisible = true;
  }

  editerTemoignage(tem: LandingPageTemoignage): void {
    this.temoignageEnCours = { ...tem };
    this.modalTemoignageVisible = true;
  }

  genererInitiales(): void {
    if (this.temoignageEnCours.nom) {
      const parts = this.temoignageEnCours.nom.trim().split(' ');
      if (parts.length >= 2) {
        this.temoignageEnCours.initiales = (parts[0][0] + parts[1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length >= 2) {
        this.temoignageEnCours.initiales = parts[0].substring(0, 2).toUpperCase();
      }
    }
  }

  sauvegarderTemoignageModal(): void {
    if (!this.temoignageEnCours.nom || !this.temoignageEnCours.citation) return;

    const payload: Partial<LandingPageTemoignage> = {
      nom: this.temoignageEnCours.nom,
      initiales: this.temoignageEnCours.initiales || '',
      role: this.temoignageEnCours.role || '',
      promotion: this.temoignageEnCours.promotion || '',
      citation: this.temoignageEnCours.citation || '',
      couleur: this.temoignageEnCours.couleur || '#1C75BC',
      ordre: Number(this.temoignageEnCours.ordre) || 0,
      actif: this.temoignageEnCours.actif !== undefined ? Boolean(this.temoignageEnCours.actif) : true,
    };

    if (this.temoignageEnCours.id) {
      this.landingService.updateTemoignage(this.temoignageEnCours.id, payload).subscribe({
        next: () => {
          this.toast.success('Témoignage mis à jour avec succès.');
          this.modalTemoignageVisible = false;
          this.chargerDonnees();
        },
        error: (err) => {
          console.error('Erreur API updateTemoignage:', err);
          this.toast.error('Erreur lors de la mise à jour.');
        },
      });
    } else {
      this.landingService.createTemoignage(payload as any).subscribe({
        next: () => {
          this.toast.success('Témoignage ajouté avec succès.');
          this.modalTemoignageVisible = false;
          this.chargerDonnees();
        },
        error: (err) => {
          console.error('Erreur API createTemoignage:', err);
          this.toast.error('Erreur lors de l\'ajout.');
        },
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
      error: (err) => {
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message || 'Erreur lors de la suppression.';
        this.toast.error(msg);
      },
    });
  }

  private rechargerTemoignages(): void {
    this.landingService.getTemoignages().subscribe({
      next: (t) => {
        this.temoignagesList = t;
        this.cdr.markForCheck();
      },
    });
  }

  // --- GESTION DES DEMANDES D'ORIENTATION & DOLÉANCES ---
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
      () => {
        this.toast.success(messageSucces);
      },
      () => {
        this.toast.info(`Texte : ${texte}`);
      }
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
      error: () => {
        this.toast.error('Impossible de charger les demandes d\'orientation.');
      },
    });
  }

  supprimerMessage(id: string): void {
    if (!confirm('Voulez-vous marquer cette demande comme traitée / la supprimer ?')) return;

    this.landingService.deleteContactMessage(id).subscribe({
      next: () => {
        this.toast.success('Demande d\'orientation retirée.');
        this.chargerMessages();
      },
      error: () => {
        this.toast.error('Erreur lors du traitement de la demande.');
      },
    });
  }
}
