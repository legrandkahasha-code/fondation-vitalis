import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroSlideItem } from '../../landing.component';

@Component({
  selector: 'app-landing-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-hero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHeroComponent implements OnInit, OnDestroy {
  @Input({ required: true }) heroSlides: HeroSlideItem[] = [];
  @Input() heroNumeroAgrement: string = '';
  @Input() defaultHeroImage: string = '';
  @Input() reassurances: string[] = [];

  get reassuranceList(): string[] {
    if (this.reassurances && this.reassurances.length > 0) {
      const filtered = this.reassurances.filter((r) => !!r && r.trim().length > 0);
      if (filtered.length > 0) return filtered;
    }
    return [
      'Certificat officiel infalsifiable (QR Code)',
      'Ateliers pratiques & Équipements réels',
      'Immersion professionnelle active',
    ];
  }

  @Output() openCredentials = new EventEmitter<void>();
  @Output() openVideo = new EventEmitter<void>();
  @Output() ctaClick = new EventEmitter<string>();
  @Output() downloadBrochure = new EventEmitter<void>();

  currentHeroIndex: number = 0;
  heroSliderProgress: number = 0;
  isHeroSliderPaused: boolean = false;
  showVideoModal: boolean = false;

  private heroSliderTimer: any = null;
  private readonly HERO_SLIDE_DURATION_MS = 6500;
  private readonly HERO_TICK_INTERVAL_MS = 65;
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.startSliderLoop();
  }

  ngOnDestroy(): void {
    this.stopSliderLoop();
  }

  get currentHeroSlide(): HeroSlideItem {
    if (!this.heroSlides || this.heroSlides.length === 0) {
      return {
        id: 'default',
        badge: 'Sous tutelle ministérielle · RDC',
        badgeCouleur: '#2AA9A0',
        atelierTag: 'Campus Central',
        tabTitle: 'Campus Central',
        titre: 'Formation Professionnelle reconnue par l\'État',
        sousTitre: 'Formation par compétences pratiques et certificats officiels infalsifiables.',
        imageUrl: this.defaultHeroImage || 'assets/campus/lab-informatique.jpg',
        statChiffre: '94% Insertion',
        statLabel: 'Stages et emplois garantis',
        ctaTexte: 'Postuler pour la Session 2026',
        ctaLien: '#formations',
        ctaSecondaireTexte: 'Télécharger la Brochure (PDF)',
        ctaSecondaireLien: 'action:brochure',
      };
    }
    return this.heroSlides[this.currentHeroIndex % this.heroSlides.length];
  }

  private get prefersReducedMotion(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  startSliderLoop(): void {
    this.stopSliderLoop();
    if (this.prefersReducedMotion) {
      this.isHeroSliderPaused = true;
      this.cdr.markForCheck();
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.heroSliderTimer = setInterval(() => {
        if (!this.isHeroSliderPaused && this.heroSlides.length > 1) {
          this.heroSliderProgress += (this.HERO_TICK_INTERVAL_MS / this.HERO_SLIDE_DURATION_MS) * 100;
          if (this.heroSliderProgress >= 100) {
            this.heroSliderProgress = 0;
            this.ngZone.run(() => {
              this.nextHeroSlide();
            });
          } else {
            this.cdr.markForCheck();
          }
        }
      }, this.HERO_TICK_INTERVAL_MS);
    });
  }

  stopSliderLoop(): void {
    if (this.heroSliderTimer) {
      clearInterval(this.heroSliderTimer);
      this.heroSliderTimer = null;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const tagName = target?.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return;
    }

    if (event.key === 'ArrowRight') {
      this.nextHeroSlide();
    } else if (event.key === 'ArrowLeft') {
      this.prevHeroSlide();
    } else if (event.key === 'Escape' && this.showVideoModal) {
      this.closeVideoModal();
    }
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.changedTouches.length === 1) {
      const deltaX = event.changedTouches[0].clientX - this.touchStartX;
      const deltaY = event.changedTouches[0].clientY - this.touchStartY;
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        if (deltaX < 0) {
          this.nextHeroSlide();
        } else {
          this.prevHeroSlide();
        }
      }
    }
  }

  nextHeroSlide(): void {
    const total = this.heroSlides.length;
    if (total <= 1) return;
    this.currentHeroIndex = (this.currentHeroIndex + 1) % total;
    this.heroSliderProgress = 0;
    this.cdr.markForCheck();
  }

  prevHeroSlide(): void {
    const total = this.heroSlides.length;
    if (total <= 1) return;
    this.currentHeroIndex = (this.currentHeroIndex - 1 + total) % total;
    this.heroSliderProgress = 0;
    this.cdr.markForCheck();
  }

  goToHeroSlide(index: number): void {
    this.currentHeroIndex = index;
    this.heroSliderProgress = 0;
    this.cdr.markForCheck();
  }

  pauseSlider(): void {
    this.isHeroSliderPaused = true;
    this.cdr.markForCheck();
  }

  resumeSlider(): void {
    this.isHeroSliderPaused = false;
    this.cdr.markForCheck();
  }

  togglePause(): void {
    this.isHeroSliderPaused = !this.isHeroSliderPaused;
    this.cdr.markForCheck();
  }

  onHeroImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('lab-informatique.jpg')) {
      img.src = 'assets/campus/lab-informatique.jpg';
    }
  }

  handleCta(lien: string): void {
    if (lien === 'action:brochure') {
      this.downloadBrochure.emit();
      return;
    }
    if (lien === 'modal:credentials') {
      this.openCredentials.emit();
      return;
    }
    this.ctaClick.emit(lien);
  }

  openVideoModal(): void {
    this.pauseSlider();
    if (this.openVideo.observed) {
      this.openVideo.emit();
    } else {
      this.showVideoModal = true;
      this.cdr.markForCheck();
    }
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
    this.resumeSlider();
    this.cdr.markForCheck();
  }

  scrollToSection(id: string): void {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // --- SKELETON LOADER & SUIVI DE CHARGEMENT DES IMAGES (REC 5) ---
  loadedImages: { [slideId: string]: boolean } = {};

  onImageLoad(slideId: string): void {
    this.loadedImages[slideId] = true;
    this.cdr.markForCheck();
  }

  isImageLoaded(slideId: string): boolean {
    return !!this.loadedImages[slideId];
  }

  // --- OPTIMISATION WEBP & SRCSET RESPONSIVE (REC 2) ---
  private readonly CAMPUS_IMAGES = [
    'lab-informatique',
    'atelier-energie',
    'centre-examen',
    'salle-conferences',
  ];

  private getCampusBaseName(url: string | null | undefined): string | null {
    if (!url) return null;
    for (const name of this.CAMPUS_IMAGES) {
      if (url.includes(name)) {
        return name;
      }
    }
    return null;
  }

  getImageWebpMobile(url: string | null | undefined): string {
    const base = this.getCampusBaseName(url);
    if (base) {
      return `assets/campus/${base}-mobile.webp`;
    }
    return url || 'assets/campus/lab-informatique-mobile.webp';
  }

  getImageWebpDesktop(url: string | null | undefined): string {
    const base = this.getCampusBaseName(url);
    if (base) {
      return `assets/campus/${base}-desktop.webp`;
    }
    return url || 'assets/campus/lab-informatique-desktop.webp';
  }

  getImageJpgMobile(url: string | null | undefined): string {
    const base = this.getCampusBaseName(url);
    if (base) {
      return `assets/campus/${base}-mobile.jpg`;
    }
    return url || 'assets/campus/lab-informatique-mobile.jpg';
  }
}
