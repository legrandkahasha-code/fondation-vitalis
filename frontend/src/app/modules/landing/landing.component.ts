import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LandingService } from '../../core/services/landing.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';
import {
  LandingPageSettings,
  LandingPageSection,
  LandingPageTemoignage,
  LandingPageActualite,
  PublicLandingData,
} from '../../core/models';

export interface FormationDisplayItem {
  id: string;
  titre: string;
  categorie: 'tech' | 'gestion' | 'technique';
  categorieNom: string;
  description: string;
  duree: string;
  modulesCount: number;
  badgeClass: string;
  debouches: string;
  prochaineSession: string;
  prerequis: string;
}

export interface FaqDisplayItem {
  question: string;
  reponse: string;
  ouvert: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './landing.component.html',
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private pollingTimer: any = null;
  @ViewChild('statsSection') statsSection?: ElementRef;

  isLoadingLanding: boolean = true;
  showScrollTop: boolean = false;
  scrollProgress: number = 0;

  searchCertNumero: string = '';
  mobileMenuOpen: boolean = false;
  categorieActive: string = 'toutes';
  rechercheMotCle: string = '';
  isScanning: boolean = false;
  activeStep: number = 1;
  submittingContact: boolean = false;

  contactForm = {
    nom: '',
    telephone: '',
    filiere: '',
    message: '',
    email: '',
    honeypot: '',
  };

  // Paramètres globaux (avec valeurs par défaut de secours)
  settings: Partial<LandingPageSettings> = {
    topbarTexte: 'République Démocratique du Congo · Ministère de la Formation Professionnelle',
    heroTitre: 'Vitalis Center, la formation professionnelle reconnue par l\'État',
    heroSousTitre: 'Vitalis Center EUP forme les professionnels, cadres et jeunes talents aux métiers d\'avenir sous la tutelle du Ministère de la Formation Professionnelle. Validation par compétences pratiques, encadrement expert et délivrance de certificats officiels infalsifiables.',
    heroNumeroAgrement: 'N°CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026',
    statsLaureats: 1200,
    statsTauxReussite: 94,
    statsFilieres: 15,
    statsTitresVerif: 100,
    ctaTitre: 'Prêt à développer des compétences certifiées ?',
    ctaSousTitre: 'Les inscriptions pour la session 2026 sont actuellement ouvertes.',
    formationsSurMesureTitre: 'Formations intra-entreprise & sur mesure',
    formationsSurMesureDescription: 'Nous concevons des programmes spécialisés pour les ministères et entreprises publiques et privées.',
    verifTitre: 'Vérifier l\'Authenticité d\'un Certificat',
    verifSousTitre: 'Entrez le numéro de série officiel délivré par Vitalis Center pour vérifier son authenticité en temps réel auprès du registre officiel.',
    verifExempleNumero: 'CERT-2026-00001',
    contactAdresse: 'Kinshasa, République Démocratique du Congo',
    contactEmail: 'contact@vitalis-center.cd',
    contactHoraires: 'Lundi – Vendredi : 08h00 – 16h30 | Samedi : 08h30 – 12h30',
    contactTelephone: '+243 ...',
    footerDescription: 'Vitalis Center EUP (Établissement d\'Utilité Publique) · Centre de formation professionnelle et technique agréé par le Ministère de la Formation Professionnelle de la RDC.',
    footerTutelleTexte: 'Supervision institutionnelle et contrôle de conformité des attestations et certifications nationales.',
    footerCopyright: '© 2026 Vitalis Center EUP. Tous droits réservés.',
    footerBarreTexte: 'Vitalis Center (EUP — Établissement d\'Utilité Publique) · Système de gestion et certification de la formation professionnelle · Édition 2026',
  };

  // Sections
  avantagesList: LandingPageSection[] = [
    { id: '1', typeSection: 'avantage', titre: 'Diplôme Reconnu par l\'État', sousTitre: 'Agrément National', description: 'Formations validées sous la tutelle du Ministère de la Formation Professionnelle pour une insertion professionnelle garantie.', icone: 'diplome', ordre: 1, couleur: '#1C75BC', actif: true },
    { id: '2', typeSection: 'avantage', titre: 'Formateurs Experts de Terrain', sousTitre: 'Corps Pédagogique', description: 'Des professionnels chevronnés transmettant un savoir-faire immédiatement opérationnel en entreprise.', icone: 'formateur', ordre: 2, couleur: '#F0791E', actif: true },
    { id: '3', typeSection: 'avantage', titre: 'Espace Numérique Dédié', sousTitre: 'Digitalisation', description: 'Accès aux supports de cours, devoirs, évaluations et suivi continu des compétences.', icone: 'digital', ordre: 3, couleur: '#124F80', actif: true },
    { id: '4', typeSection: 'avantage', titre: 'Certificats Infalsifiables', sousTitre: 'Anti-Fraude', description: 'Nomenclature séquentielle inaltérable et vérification publique instantanée via QR code.', icone: 'securite', ordre: 4, couleur: '#00A859', actif: true },
  ];

  pedagogieList: LandingPageSection[] = [
    { id: '1', typeSection: 'pedagogie', titre: 'Pratique & Ateliers Concrets', sousTitre: 'Standard TVET', description: 'Exercices en situation réelle, laboratoires techniques et travaux dirigés supervisés par des formateurs certifiés.', icone: '70 %', ordre: 1, couleur: '#1C75BC', actif: true },
    { id: '2', typeSection: 'pedagogie', titre: 'Évaluation Continue & Rigueur', sousTitre: 'Régulation État', description: 'Validation progressive de chaque compétence clé pour assurer une maîtrise parfaite avant la certification d\'État.', icone: '100 %', ordre: 2, couleur: '#F0791E', actif: true },
    { id: '3', typeSection: 'pedagogie', titre: 'Plateforme Digitale Hybride', sousTitre: 'Accès Cloud', description: 'Accès permanent aux ressources de cours, évaluations d\'entraînement et échanges continus avec les formateurs.', icone: '24h / 7j', ordre: 3, couleur: '#124F80', actif: true },
  ];

  admissionList: LandingPageSection[] = [
    { id: '1', typeSection: 'admission', titre: 'Enrôlement en Établissement', sousTitre: 'Étape 01', description: 'Rapprochez-vous de votre centre agréé ou de la Direction Centrale pour l\'ouverture de votre compte officiel.', icone: '01', ordre: 1, couleur: '#1C75BC', actif: true },
    { id: '2', typeSection: 'admission', titre: 'Dépôt des Pièces & Vœux', sousTitre: 'Étape 02', description: 'Connectez-vous sur votre espace sécurisé pour sélectionner votre session et téléverser vos pièces justificatives.', icone: '02', ordre: 2, couleur: '#124F80', actif: true },
    { id: '3', typeSection: 'admission', titre: 'Instruction & Évaluation', sousTitre: 'Étape 03', description: 'Examen des prérequis par la commission centrale avec attribution de note et droit aux explications garanti.', icone: '03', ordre: 3, couleur: '#F0791E', actif: true },
    { id: '4', typeSection: 'admission', titre: 'Admission & Formation', sousTitre: 'Étape 04', description: 'Validation définitive de votre place, activation des accès pédagogiques LMS et démarrage des cours certifiants.', icone: '04', ordre: 4, couleur: '#00A859', actif: true },
  ];

  secteursList: LandingPageSection[] = [
    { id: '1', typeSection: 'secteur', titre: 'Administration Publique & Ministères', sousTitre: 'Fonction Publique & Établissements', description: 'Accompagnement de la modernisation administrative et des projets ministériels.', icone: 'admin', ordre: 1, couleur: '#1C75BC', actif: true },
    { id: '2', typeSection: 'secteur', titre: 'Télécommunications & Sociétés Tech', sousTitre: 'Infrastructures & Systèmes', description: 'Déploiement réseau, cybersécurité opérationnelle, support et maintenance cloud.', icone: 'telecom', ordre: 2, couleur: '#124F80', actif: true },
    { id: '3', typeSection: 'secteur', titre: 'Banques & Institutions Financières', sousTitre: 'Fintech & Conformité', description: 'Gestion de trésorerie, audit, contrôle interne et digitalisation des services bancaires.', icone: 'banque', ordre: 3, couleur: '#F0791E', actif: true },
    { id: '4', typeSection: 'secteur', titre: 'Énergie, Mines & BTP', sousTitre: 'Génie Industriel & Maintenance', description: 'Supervision technique, gestion de chantiers, installations électriques et solaires.', icone: 'energie', ordre: 4, couleur: '#D97706', actif: true },
    { id: '5', typeSection: 'secteur', titre: 'Transport, Logistique & Douanes', sousTitre: 'Supply Chain & Transit', description: 'Coordination logistique, gestion des stocks et procédures douanières agréées.', icone: 'logistique', ordre: 5, couleur: '#059669', actif: true },
    { id: '6', typeSection: 'secteur', titre: 'ONGs & Organisations Internationales', sousTitre: 'Développement & Projets', description: 'Suivi-évaluation de programmes, passation des marchés et gestion administrative.', icone: 'ong', ordre: 6, couleur: '#7C3AED', actif: true },
  ];

  faqList: FaqDisplayItem[] = [
    { question: 'Les formations de Vitalis Center sont-elles reconnues par l\'État congolais ?', reponse: 'Oui, sans équivoque. Vitalis Center est un Établissement d\'Utilité Publique agréé par le Ministère de la Formation Professionnelle sous le numéro officiel CFP 00095/MIN-FP/DG-FP/KMG/JPU/2026. Tous nos certificats confèrent une reconnaissance institutionnelle immédiate.', ouvert: true },
    { question: 'Quel est le mode d\'évaluation pour obtenir la certification ?', reponse: 'Nous appliquons rigoureusement l\'Approche par Compétences (APC) préconisée par les normes nationales et internationales. Chaque apprenant est évalué sur des projets réels, des études de cas et des ateliers pratiques garantissant sa maîtrise technique avant l\'émission du certificat.', ouvert: false },
    { question: 'Comment vérifier l\'authenticité d\'un certificat délivré ?', reponse: 'Chaque certificat comporte un numéro de série unique inaltérable et un QR code officiel. Tout employeur ou institution peut vérifier la validité d\'un titre en quelques secondes sur notre plateforme publique de vérification en ligne.', ouvert: false },
    { question: 'Des sessions en cours du soir ou en ligne sont-elles disponibles ?', reponse: 'Absolument. Nous proposons des créneaux flexibles : sessions intensives en journée, cours du soir pour professionnels en poste, et parcours hybrides combinant e-learning et ateliers présentiels.', ouvert: false },
    { question: 'Vitalis Center propose-t-il des formations sur mesure pour entreprises ?', reponse: 'Oui. Notre pôle Formations Sur Mesure accompagne les ministères, régies financières, ONGs et entreprises privées dans la conception de plans de renforcement de capacités adaptés à leurs enjeux spécifiques.', ouvert: false },
  ];

  // Actualités du Centre
  actualitesList: LandingPageActualite[] = [
    {
      id: '1',
      titre: 'Déploiement National du Système Numérique Vitalis & Registre des Certifications Sécurisées',
      chapeau: 'Vitalis Center EUP officialise la mise en service de sa plateforme LMS et de certification sécurisée avec vérification par QR code et numéro de série infalsifiable.',
      contenu: 'Sous la tutelle du Ministère de la Formation Professionnelle, Vitalis Center franchit une étape historique dans la modernisation des dispositifs d\'apprentissage. La plateforme permet désormais un suivi individualisé des compétences, une évaluation rigoureuse par approche APC, et une authentification publique instantanée des attestations délivrées.',
      categorie: 'INNOVATION',
      badgeCouleur: '#1C75BC',
      imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop',
      auteur: 'Direction Générale & Innovation',
      aLaUne: true,
      ordre: 1,
      actif: true,
      datePublication: new Date(),
    },
    {
      id: '2',
      titre: 'Lancement Officiel de la Campagne d\'Orientation et d\'Admission — Session 2026',
      chapeau: 'Les inscriptions sont officiellement ouvertes pour les 15 filières d\'excellence professionnelle réparties dans l\'ensemble du réseau national.',
      contenu: 'Les candidats, cadres et professionnels en reconversion peuvent dès maintenant formuler leurs vœux d\'orientation. Les directions pédagogiques de chaque antenne assurent des entretiens d\'admission personnalisés afin d\'orienter chaque profil vers la filière la plus adaptée à ses ambitions.',
      categorie: 'ADMISSIONS',
      badgeCouleur: '#F0791E',
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop',
      auteur: 'Secrétariat Général aux Admissions',
      aLaUne: false,
      ordre: 2,
      actif: true,
      datePublication: new Date(),
    },
    {
      id: '3',
      titre: 'Accords Stratégiques avec les Entreprises Publiques et Privées pour l\'Insertion Immédiate',
      chapeau: 'Signature d\'accords-cadres pour garantir des stages pratiques en entreprise et l\'embauche directe des lauréats certifiés.',
      contenu: 'Dans le cadre de sa mission d\'utilité publique, Vitalis Center a consolidé des partenariats avec les fédérations d\'entreprises et les régies publiques. Ces conventions garantissent des immersions sur le terrain dès le deuxième semestre de formation et des opportunités d\'embauche directe pour les meilleurs apprenants.',
      categorie: 'PARTENARIAT',
      badgeCouleur: '#276B44',
      imageUrl: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?q=80&w=1200&auto=format&fit=crop',
      auteur: 'Direction des Relations Extérieures',
      aLaUne: false,
      ordre: 3,
      actif: true,
      datePublication: new Date(),
    },
    {
      id: '4',
      titre: 'Atelier National sur l\'Approche Pédagogique par Compétences (APC) et Harmonisation Métiers',
      chapeau: 'Formation intensive des formateurs et inspecteurs pédagogiques pour l\'application des référentiels internationaux.',
      contenu: 'Durant 5 jours, l\'ensemble du corps enseignant et des directeurs de filière ont participé au séminaire d\'harmonisation des maquettes de cours et des critères d\'évaluation. Cette standardisation garantit un niveau d\'excellence homogène dans toutes les antennes satellites du pays.',
      categorie: 'PEDAGOGIE',
      badgeCouleur: '#124F80',
      imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop',
      auteur: 'Inspection Pédagogique Nationale',
      aLaUne: false,
      ordre: 4,
      actif: true,
      datePublication: new Date(),
    },
  ];

  selectedCategorieActualite: string = 'TOUS';
  selectedArticle: LandingPageActualite | null = null;

  // --- ÉTAT DU SLIDER D'ACTUALITÉS ANIMÉ (HARVARD / UNESCO STYLE) ---
  currentSlideIndex: number = 0;
  sliderProgress: number = 0; // 0 to 100%
  isSliderPaused: boolean = false;
  private sliderTimer: any = null;
  private readonly SLIDE_DURATION_MS = 6000;
  private readonly TICK_INTERVAL_MS = 60;

  get actualitesActives(): LandingPageActualite[] {
    return this.actualitesList.filter((a) => a.actif !== false);
  }

  get activeSlide(): LandingPageActualite | undefined {
    const list = this.actualitesActives;
    if (list.length === 0) return undefined;
    return list[this.currentSlideIndex % list.length];
  }

  startSliderLoop(): void {
    this.stopSliderLoop();
    this.sliderTimer = setInterval(() => {
      if (!this.isSliderPaused && this.actualitesActives.length > 1) {
        this.sliderProgress += (this.TICK_INTERVAL_MS / this.SLIDE_DURATION_MS) * 100;
        if (this.sliderProgress >= 100) {
          this.nextSlide();
        }
        this.cdr.markForCheck();
      }
    }, this.TICK_INTERVAL_MS);
  }

  stopSliderLoop(): void {
    if (this.sliderTimer) {
      clearInterval(this.sliderTimer);
      this.sliderTimer = null;
    }
  }

  nextSlide(): void {
    const total = this.actualitesActives.length;
    if (total <= 1) return;
    this.currentSlideIndex = (this.currentSlideIndex + 1) % total;
    this.sliderProgress = 0;
    this.cdr.markForCheck();
  }

  prevSlide(): void {
    const total = this.actualitesActives.length;
    if (total <= 1) return;
    this.currentSlideIndex = (this.currentSlideIndex - 1 + total) % total;
    this.sliderProgress = 0;
    this.cdr.markForCheck();
  }

  goToSlide(index: number): void {
    this.currentSlideIndex = index;
    this.sliderProgress = 0;
    this.cdr.markForCheck();
  }

  pauseSlider(): void {
    this.isSliderPaused = true;
  }

  resumeSlider(): void {
    this.isSliderPaused = false;
  }

  categoriesDisponibles = [
    { id: 'INNOVATION', label: 'Innovation & Tech', icone: '💡' },
    { id: 'ADMISSIONS', label: 'Admissions & Inscriptions', icone: '📬' },
    { id: 'PARTENARIAT', label: 'Partenariats & Insertion', icone: '🤝' },
    { id: 'PEDAGOGIE', label: 'Pédagogie & APC', icone: '📚' },
    { id: 'VIE_DU_CENTRE', label: 'Vie du Centre', icone: '🏛️' },
  ];

  get actualitesFiltrees(): LandingPageActualite[] {
    const list = this.actualitesList.filter((a) => a.actif !== false);
    if (this.selectedCategorieActualite === 'TOUS') {
      return list;
    }
    return list.filter((a) => (a.categorie || '').toUpperCase() === this.selectedCategorieActualite);
  }

  get articleALaUne(): LandingPageActualite | undefined {
    return this.actualitesList.find((a) => a.actif !== false && a.aLaUne) || this.actualitesList.find((a) => a.actif !== false);
  }

  get actualitesFiltreesSansHero(): LandingPageActualite[] {
    const hero = this.articleALaUne;
    if (hero && this.selectedCategorieActualite === 'TOUS') {
      return this.actualitesFiltrees.filter((a) => a.id !== hero.id);
    }
    return this.actualitesFiltrees;
  }

  getCategorieLabel(cat?: string): string {
    if (!cat) return 'Actualité';
    const found = this.categoriesDisponibles.find((c) => c.id === cat.toUpperCase());
    return found ? found.label : cat;
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

  openArticleModal(item: LandingPageActualite): void {
    this.selectedArticle = item;
  }

  closeArticleModal(): void {
    this.selectedArticle = null;
  }

  
  calculerTempsLecture(contenu?: string): string {
    if (!contenu || !contenu.trim()) return '1 min';
    const mots = contenu.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(mots / 200));
    return `${minutes} min`;
  }

  copierLienArticle(): void {
    if (!this.selectedArticle) return;
    navigator.clipboard.writeText(this.selectedArticle.titre);
    this.toast.info('Titre de l\'actualité copié dans le presse-papier.');
  }

  temoignagesList: LandingPageTemoignage[] = [];

  // Transform 3D pour le widget Hero
  heroWidgetTransform: string = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';

  // Compteurs animés (Count-Up)
  laureatsDisplay: number = 1200;
  tauxReussiteDisplay: number = 94;
  filieresDisplay: number = 15;
  titresVerifDisplay: number = 100;
  private statsObserver?: IntersectionObserver;
  private countUpDone: boolean = false;

  // Formations
  formationsList: FormationDisplayItem[] = [];
  formationsFiltrees: FormationDisplayItem[] = [];

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

  onImageError(event: Event, fallback = 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop'): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== fallback) {
      target.src = fallback;
    }
  }

  getEmbedUrl(url?: string): SafeResourceUrl | null {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v');
        if (videoId) {
          return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`);
        }
      } else if (url.includes('youtu.be/')) {
        const parts = url.split('youtu.be/');
        const videoId = parts[1]?.split('?')[0];
        if (videoId) {
          return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`);
        }
      } else if (url.includes('vimeo.com/')) {
        const parts = url.split('vimeo.com/');
        const videoId = parts[1]?.split('?')[0];
        if (videoId) {
          return this.sanitizer.bypassSecurityTrustResourceUrl(`https://player.vimeo.com/video/${videoId}`);
        }
      }
    } catch (e) {}
    return null;
  }

  private notifSub: Subscription | null = null;

  constructor(
    public auth: AuthService,
    private landingService: LandingService,
    private notifications: NotificationsService,
    private toast: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.chargerDonneesLanding();
    this.startSliderLoop();

    this.notifSub = this.notifications.messages().subscribe({
      next: (msg) => {
        if (msg && typeof msg === 'object' && (msg.type === 'ACTUALITE_UPDATE' || msg.type === 'LANDING_UPDATE')) {
          this.chargerDonneesLanding();
        }
      },
    });

    // Polling de rafraîchissement périodique (5 min) pour visiteurs publics anonymes
    if (typeof window !== 'undefined') {
      this.pollingTimer = setInterval(() => {
        this.chargerDonneesLanding();
      }, 5 * 60 * 1000);
    }
  }

  chargerDonneesLanding(): void {
    this.landingService.getPublicLandingData().subscribe({
      next: (data: PublicLandingData) => {
        if (data.settings) {
          this.settings = data.settings;
          this.laureatsDisplay = this.settings.statsLaureats ?? 1200;
          this.tauxReussiteDisplay = this.settings.statsTauxReussite ?? 94;
          this.filieresDisplay = this.settings.statsFilieres ?? 15;
          this.titresVerifDisplay = this.settings.statsTitresVerif ?? 100;
        }

        if (data.sections) {
          this.avantagesList = data.sections.avantages || [];
          this.pedagogieList = data.sections.pedagogie || [];
          this.admissionList = data.sections.admission || [];
          this.secteursList = data.sections.secteurs || [];
          this.faqList = (data.sections.faq || []).map((f, idx) => ({
            question: f.titre,
            reponse: f.description || '',
            ouvert: idx === 0,
          }));
        }

        if (data.actualites && data.actualites.length > 0) {
          this.actualitesList = data.actualites;
          this.startSliderLoop();
        }

        if (data.temoignages && data.temoignages.length > 0) {
          this.temoignagesList = data.temoignages;
        }

        if (data.formations && data.formations.length > 0) {
          this.formationsList = data.formations.map((f: any) => {
            const titreLower = (f.titre || '').toLowerCase();
            let cat: 'tech' | 'gestion' | 'technique' = f.categorieOfficielle || 'tech';
            let catNom = f.filiereNom || (cat === 'gestion' ? 'Gestion & Management' : cat === 'technique' ? 'Technique & Énergie' : 'Informatique & Tech');
            let badge = cat === 'gestion' ? 'tag attente' : cat === 'technique' ? 'tag valide' : 'tag info';
            let debouches = cat === 'gestion' ? 'Manager, Gestionnaire, Chef de projet' : cat === 'technique' ? 'Technicien Supérieur, Installateur' : 'Développeur, Administrateur Systèmes, Spécialiste Tech';

            if (!f.categorieOfficielle) {
              if (titreLower.includes('gestion') || titreLower.includes('marché') || titreLower.includes('compta') || titreLower.includes('management')) {
                cat = 'gestion';
                catNom = 'Gestion & Management';
                badge = 'tag attente';
                debouches = 'Manager, Gestionnaire, Chef de projet';
              } else if (titreLower.includes('électric') || titreLower.includes('btp') || titreLower.includes('énergie') || titreLower.includes('mécanique')) {
                cat = 'technique';
                catNom = 'Technique & Énergie';
                badge = 'tag valide';
                debouches = 'Technicien Supérieur, Installateur';
              }
            }

            return {
              id: f.id,
              titre: f.titre,
              categorie: cat,
              categorieNom: catNom,
              description: f.description || 'Formation certifiante d\'excellence validée par le Ministère.',
              duree: '40 Heures',
              modulesCount: f.modulesCount || 4,
              badgeClass: badge,
              debouches: debouches,
              prochaineSession: 'Inscriptions ouvertes',
              prerequis: f.niveauNom || 'Niveau secondaire ou expérience',
            };
          });
        }

        this.isLoadingLanding = false;
        this.filtrerFormations();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Fallback aux données statiques pour la landing page', err);
        this.isLoadingLanding = false;
        this.filtrerFormations();
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void {
    this.initStatsObserver();
  }

  ngOnDestroy(): void {
    this.notifSub?.unsubscribe();
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.stopSliderLoop();
    if (this.statsObserver) {
      this.statsObserver.disconnect();
    }
  }

  private initStatsObserver(): void {
    if (typeof IntersectionObserver === 'undefined' || !this.statsSection) return;

    this.statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.countUpDone) {
            this.countUpDone = true;
            this.runCountUp();
          }
        });
      },
      { threshold: 0.2 }
    );

    this.statsObserver.observe(this.statsSection.nativeElement);
  }

  private runCountUp(): void {
    const duration = 1600;
    const startTime = performance.now();
    const targetLaureats = this.settings.statsLaureats ?? 1200;
    const targetTaux = this.settings.statsTauxReussite ?? 94;
    const targetFilieres = this.settings.statsFilieres ?? 15;
    const targetTitres = this.settings.statsTitresVerif ?? 100;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.laureatsDisplay = Math.floor(easeProgress * targetLaureats);
      this.tauxReussiteDisplay = Math.floor(easeProgress * targetTaux);
      this.filieresDisplay = Math.floor(easeProgress * targetFilieres);
      this.titresVerifDisplay = Math.floor(easeProgress * targetTitres);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.laureatsDisplay = targetLaureats;
        this.tauxReussiteDisplay = targetTaux;
        this.filieresDisplay = targetFilieres;
        this.titresVerifDisplay = targetTitres;
      }
    };

    requestAnimationFrame(animate);
  }

  onMouseMoveHeroWidget(e: MouseEvent): void {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 6;
    const rotateY = (x / (rect.width / 2)) * 6;

    this.heroWidgetTransform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`;
  }

  onMouseLeaveHeroWidget(): void {
    this.heroWidgetTransform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
  }

  setActiveStep(step: number): void {
    this.activeStep = step;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  filtrerCategorie(cat: string): void {
    this.categorieActive = cat;
    this.filtrerFormations();
  }

  filtrerFormations(): void {
    let result = [...this.formationsList];

    if (this.categorieActive !== 'toutes') {
      result = result.filter((f) => f.categorie === this.categorieActive);
    }

    if (this.rechercheMotCle && this.rechercheMotCle.trim()) {
      const q = this.rechercheMotCle.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.titre.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.debouches.toLowerCase().includes(q) ||
          f.categorieNom.toLowerCase().includes(q)
      );
    }

    this.formationsFiltrees = result;
  }

  resetRecherche(): void {
    this.rechercheMotCle = '';
    this.categorieActive = 'toutes';
    this.filtrerFormations();
  }

  toggleFaq(index: number): void {
    this.faqList[index].ouvert = !this.faqList[index].ouvert;
  }

  verifierCertificat(): void {
    if (!this.searchCertNumero?.trim()) return;
    const num = this.searchCertNumero.trim().toUpperCase();
    const formatValide = /^CERT-\d{4}-\d{3,6}$/.test(num);
    if (!formatValide) {
      this.toast.error(`Format invalide. Exemple : ${this.settings.verifExempleNumero || 'CERT-2026-00001'}`);
      return;
    }
    this.router.navigate(['/certificats/verifier', num]);
  }

  demoCert(num: string): void {
    this.searchCertNumero = (num || '').trim().toUpperCase();
    this.verifierCertificat();
  }

  get whatsappUrl(): string {
    const rawTel = (this.settings.contactTelephone || '+243810000000').replace(/[^0-9]/g, '');
    const defaultTel = rawTel.length >= 9 ? rawTel : '243810000000';
    const message = encodeURIComponent('Bonjour Vitalis Center EUP, je souhaite obtenir des informations sur vos formations professionnelles certifiées.');
    return `https://wa.me/${defaultTel}?text=${message}`;
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window === 'undefined') return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    this.scrollProgress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
    this.showScrollTop = scrollTop > 350;
    this.cdr.markForCheck();
  }

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  partagerArticle(reseau: 'whatsapp' | 'linkedin' | 'facebook'): void {
    if (!this.selectedArticle) return;
    const url = typeof window !== 'undefined' ? window.location.href : 'https://vitalis-center.cd';
    const titre = encodeURIComponent(this.selectedArticle.titre);
    const encodedUrl = encodeURIComponent(url);

    if (reseau === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${titre}%20-%20${encodedUrl}`, '_blank');
    } else if (reseau === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank');
    } else if (reseau === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
    }
  }

  envoyerContact(): void {
    if (!this.contactForm.nom || !this.contactForm.telephone) {
      this.toast.error('Veuillez renseigner votre nom et votre numéro de téléphone.');
      return;
    }

    this.submittingContact = true;
    this.landingService.submitContact(this.contactForm).subscribe({
      next: () => {
        this.submittingContact = false;
        this.toast.success('Votre demande d\'information a été transmise avec succès au secrétariat de Vitalis Center.');
        this.contactForm = { nom: '', telephone: '', filiere: '', message: '', email: '', honeypot: '' };
      },
      error: () => {
        this.submittingContact = false;
        this.toast.error('Erreur lors de l\'envoi de votre demande.');
      },
    });
  }
}
