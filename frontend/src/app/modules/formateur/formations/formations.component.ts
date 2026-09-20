import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PedagogieService } from '../../../core/services/pedagogie.service';
import { EtablissementsService } from '../../../core/services/etablissements.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Formation, Etablissement, CategorieFormation } from '../../../core/models';

@Component({
  selector: 'app-formations',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MainLayoutComponent],
  templateUrl: './formations.component.html',
  styleUrls: ['./formations.component.css'],
})
export class FormationsComponent implements OnInit, OnDestroy {
  formations: Formation[] = [];
  etablissements: Etablissement[] = [];
  referentielFilieres: any[] = [];
  categories: CategorieFormation[] = [];
  loading = true;
  saving = false;

  // Filtres & Recherche
  searchTerm = '';
  selectedCategorie = 'toutes';
  selectedLandingFilter = 'toutes'; // 'toutes' | 'publie' | 'masque'
  selectedEtablissementId = 'ALL';
  viewMode: 'cards' | 'table' = 'cards';

  // Modale Gestion des Catégories (Administrateur Central)
  showCategoryModal = false;
  categorySaving = false;
  isEditingCategory = false;
  categoryToDelete: CategorieFormation | null = null;
  showDeleteCategoryModal = false;
  categoryFormData: {
    id?: string;
    libelle: string;
    code: string;
    couleur: string;
    icone: string;
    description: string;
    ordre: number;
    actif: boolean;
  } = {
    libelle: '',
    code: '',
    couleur: '#1C75BC',
    icone: 'code',
    description: '',
    ordre: 1,
    actif: true,
  };
  categoryColorPresets: string[] = [
    '#1C75BC', // Bleu Vitalis
    '#F0791E', // Orange Vitalis
    '#276B44', // Vert Ministère
    '#124F80', // Bleu Sombre
    '#7C3AED', // Violet Digital
    '#0284C7', // Bleu Océan
    '#D97706', // Ambre Solaire
    '#E11D48', // Rouge Rubis
    '#0D9488', // Émeraude Teal
    '#4B5157', // Gris Anthracite
  ];

  // Modale Création / Édition Formation
  showModal = false;
  isEditing = false;
  modalActiveTab: 'identite' | 'pedagogie' | 'vitrine' = 'identite';

  // Modale Suppression Formation
  showDeleteModal = false;
  formationToDelete: Formation | null = null;
  deleting = false;

  // Modale Déploiement Multi-Établissements (Admin Central)
  showDeployModal = false;
  formationToDeploy: Formation | null = null;
  selectedCibleEtabIds: string[] = [];
  deploying = false;

  // Formulaire d'édition / création
  formData: {
    id?: string;
    titre: string;
    code: string;
    description: string;
    duree: string;
    categorie: string;
    debouches: string;
    prerequis: string;
    objectifs: string;
    publieSurLanding: boolean;
    aLaUne: boolean;
    badgeTexte: string;
    ordre: number;
    actif: boolean;
    fraisInscription?: number | null;
    etablissementId: string;
    formationReferentielId?: string;
  } = {
    titre: '',
    code: '',
    description: '',
    duree: '40 Heures',
    categorie: 'tech',
    debouches: '',
    prerequis: '',
    objectifs: '',
    publieSurLanding: true,
    aLaUne: false,
    badgeTexte: 'Session ouverte',
    ordre: 0,
    actif: true,
    fraisInscription: null,
    etablissementId: '',
    formationReferentielId: '',
  };

  private sseSub?: Subscription;
  private pollSub?: Subscription;

  constructor(
    public auth: AuthService,
    private pedagogie: PedagogieService,
    private etablissementsService: EtablissementsService,
    private notifications: NotificationsService,
    private toast: ToastService,
  ) {
    this.formData = this.getEmptyForm();
  }

  ngOnInit() {
    this.loadData();
    this.loadCategories();
    this.loadEtablissements();
    this.loadReferentielFilieres();

    // ─── Flux Temps Réel SSE : Réception instantanée des créations / modifications ───
    let isInitial = true;
    this.sseSub = this.notifications.messages().subscribe((msg) => {
      if (isInitial) {
        isInitial = false;
        return; // Ignorer le message historique rejoué par ReplaySubject au montage
      }
      if (msg.type === 'FORMATION_UPDATE' || msg.type === 'FILIERE_UPDATE' || msg.type === 'LANDING_UPDATE') {
        this.pedagogie.invalidateFormationsCache();
        this.loadData(true);
        this.loadReferentielFilieres();
      }
      if (msg.type === 'CATEGORIE_UPDATE') {
        this.loadCategories();
      }
    });
    isInitial = false;

    // Filet de sécurité périodique (60s) en cas de déconnexion réseau transitoire
    this.pollSub = timer(60_000, 60_000).pipe(
      switchMap(() => this.pedagogie.getFormations(undefined, true))
    ).subscribe({
      next: (f) => this.formations = f,
    });
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  loadCategories() {
    this.pedagogie.getCategories(true).subscribe({
      next: (cats) => {
        this.categories = cats;
        if (!this.formData.categorie && this.categories.length > 0) {
          this.formData.categorie = this.categories[0].code;
        }
      },
      error: () => console.warn('Impossible de charger les catégories de formations.'),
    });
  }

  getEmptyForm() {
    const userEtab = this.auth?.currentUser?.etablissementId || '';
    return {
      titre: '',
      code: '',
      description: '',
      duree: '40 Heures',
      categorie: 'tech' as const,
      debouches: '',
      prerequis: '',
      objectifs: '',
      publieSurLanding: true,
      aLaUne: false,
      badgeTexte: 'Session ouverte',
      ordre: 0,
      actif: true,
      fraisInscription: null,
      etablissementId: userEtab,
      formationReferentielId: '',
    };
  }

  loadData(forceRefresh = false) {
    if (!this.formations.length) {
      this.loading = true;
    }
    this.pedagogie.getFormations(undefined, forceRefresh).subscribe({
      next: (f) => {
        this.formations = f;
        this.loading = false;
      },
      error: (err) => {
        this.toast.error('Erreur lors du chargement des formations.');
        this.loading = false;
      },
    });
  }

  loadEtablissements() {
    this.etablissementsService.getAll().subscribe({
      next: (etabs) => {
        this.etablissements = etabs || [];
        if (this.etablissements.length > 0 && !this.formData.etablissementId) {
          this.formData.etablissementId = this.etablissements[0].id;
        }
      },
      error: () => {},
    });
  }

  loadReferentielFilieres() {
    this.pedagogie.getReferentielFilieres().subscribe({
      next: (filieres) => this.referentielFilieres = filieres || [],
      error: () => {},
    });
  }

  getFormationDetailLink(id: string): string[] {
    return this.auth.hasRole('ADMIN_CENTRE') ? ['/admin/formations', id] : ['/formations', id];
  }

  // ─── KPIs Calculés ──────────────────────────────────────────────────────────
  get totalFormationsCount(): number {
    return this.formations.length;
  }

  get formationsPublieesCount(): number {
    return this.formations.filter((f) => f.publieSurLanding !== false).length;
  }

  get formationsALaUneCount(): number {
    return this.formations.filter((f) => f.aLaUne).length;
  }

  get totalModulesCount(): number {
    return this.formations.reduce((acc, f) => acc + (f._count?.modules ?? f.modules?.length ?? 0), 0);
  }

  get filieresCouvertesCount(): number {
    const set = new Set<string>();
    this.formations.forEach((f) => {
      const fil = f.formationReferentiel?.filiere?.libelle;
      if (fil) set.add(fil);
    });
    return set.size;
  }

  // ─── Formations Filtrées ────────────────────────────────────────────────────
  get filteredFormations(): Formation[] {
    return this.formations.filter((f) => {
      // Filtre Recherche
      if (this.searchTerm.trim()) {
        const s = this.searchTerm.trim().toLowerCase();
        const matchTitre = (f.titre || '').toLowerCase().includes(s);
        const matchCode = (f.code || '').toLowerCase().includes(s);
        const matchDesc = (f.description || '').toLowerCase().includes(s);
        const matchDeb = (f.debouches || '').toLowerCase().includes(s);
        if (!matchTitre && !matchCode && !matchDesc && !matchDeb) return false;
      }

      // Filtre Catégorie
      if (this.selectedCategorie !== 'toutes') {
        if ((f.categorie || 'tech') !== this.selectedCategorie) return false;
      }

      // Filtre Statut Vitrine
      if (this.selectedLandingFilter === 'publie') {
        if (f.publieSurLanding === false) return false;
      } else if (this.selectedLandingFilter === 'masque') {
        if (f.publieSurLanding !== false) return false;
      }

      // Filtre Établissement
      if (this.selectedEtablissementId !== 'ALL') {
        if (f.etablissementId !== this.selectedEtablissementId) return false;
      }

      return true;
    });
  }

  // ─── Helpers d'affichage ──────────────────────────────────────────────────
  getCategorieColor(cat?: string): string {
    if (!cat) return '#1C75BC';
    const found = this.categories.find((c) => c.code.toLowerCase() === cat.toLowerCase());
    if (found?.couleur) return found.couleur;
    switch (cat.toLowerCase()) {
      case 'gestion': return '#F0791E'; // Orange officiel
      case 'technique': return '#276B44'; // Vert succès
      default: return '#1C75BC'; // Bleu officiel
    }
  }

  getCategorieBadgeClass(cat?: string): string {
    switch (cat) {
      case 'gestion': return 'bg-[#FDECDD] text-[#F0791E] border border-[#F0791E]/30';
      case 'technique': return 'bg-[#E7F1EA] text-[#276B44] border border-[#276B44]/30';
      default: return 'bg-[#E7F1FA] text-[#1C75BC] border border-[#1C75BC]/30';
    }
  }

  getCategorieLabel(cat?: string): string {
    if (!cat) return 'Informatique & Tech';
    const found = this.categories.find((c) => c.code.toLowerCase() === cat.toLowerCase());
    if (found) return found.libelle;
    switch (cat.toLowerCase()) {
      case 'gestion': return 'Gestion & Management';
      case 'technique': return 'Technique & Énergie';
      case 'tech': return 'Informatique & Tech';
      default: return cat;
    }
  }

  // ─── Actions Rapides (Toggles) ──────────────────────────────────────────────
  toggleLanding(f: Formation, event: Event) {
    event.stopPropagation();
    this.pedagogie.toggleLanding(f.id).subscribe({
      next: (updated) => {
        f.publieSurLanding = updated.publieSurLanding;
        this.toast.success(`Visibilité vitrine actualisée : ${f.publieSurLanding ? 'Publiée' : 'Masquée'}`);
      },
      error: () => this.toast.error('Impossible de modifier le statut vitrine.'),
    });
  }

  toggleUne(f: Formation, event: Event) {
    event.stopPropagation();
    this.pedagogie.toggleUne(f.id).subscribe({
      next: (updated) => {
        f.aLaUne = updated.aLaUne;
        this.toast.success(`Mise à la une actualisée : ${f.aLaUne ? 'En vedette' : 'Standard'}`);
      },
      error: () => this.toast.error('Impossible de modifier la mise à la une.'),
    });
  }

  // ─── Ouverture Modal Création / Édition ──────────────────────────────────────
  openCreateModal() {
    this.isEditing = false;
    this.formData = this.getEmptyForm();
    if (this.etablissements.length > 0 && !this.formData.etablissementId) {
      this.formData.etablissementId = this.etablissements[0].id;
    }
    this.modalActiveTab = 'identite';
    this.showModal = true;
  }

  openEditModal(f: Formation, event?: Event) {
    event?.stopPropagation();
    this.isEditing = true;
    this.formData = {
      id: f.id,
      titre: f.titre || '',
      code: f.code || '',
      description: f.description || '',
      duree: f.duree || '40 Heures',
      categorie: (f.categorie as any) || 'tech',
      debouches: f.debouches || '',
      prerequis: f.prerequis || '',
      objectifs: f.objectifs || '',
      publieSurLanding: f.publieSurLanding !== false,
      aLaUne: Boolean(f.aLaUne),
      badgeTexte: f.badgeTexte || 'Session ouverte',
      ordre: f.ordre || 0,
      actif: f.actif !== false,
      fraisInscription: f.fraisInscription ?? null,
      etablissementId: f.etablissementId || this.auth?.currentUser?.etablissementId || '',
      formationReferentielId: f.formationReferentielId || '',
    };
    this.modalActiveTab = 'identite';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.saving = false;
  }

  saveFormation() {
    if (!this.formData.titre.trim()) {
      this.toast.info('Le titre de la formation est obligatoire.');
      this.modalActiveTab = 'identite';
      return;
    }

    if (!this.formData.etablissementId && this.auth.hasRole('ADMIN_CENTRE')) {
      if (this.etablissements.length > 0) {
        this.formData.etablissementId = this.etablissements[0].id;
      } else {
        this.toast.info('Veuillez sélectionner un établissement de rattachement.');
        this.modalActiveTab = 'identite';
        return;
      }
    }

    this.saving = true;

    const { id, ...raw } = this.formData;
    const payload: any = {
      titre: raw.titre.trim(),
      code: raw.code?.trim() || undefined,
      description: raw.description?.trim() || undefined,
      duree: raw.duree?.trim() || '40 Heures',
      categorie: raw.categorie || 'tech',
      debouches: raw.debouches?.trim() || undefined,
      prerequis: raw.prerequis?.trim() || undefined,
      objectifs: raw.objectifs?.trim() || undefined,
      publieSurLanding: raw.publieSurLanding ?? true,
      aLaUne: raw.aLaUne ?? false,
      badgeTexte: raw.badgeTexte?.trim() || undefined,
      ordre: Number(raw.ordre) || 0,
      actif: raw.actif ?? true,
      etablissementId: raw.etablissementId || undefined,
      formationReferentielId: raw.formationReferentielId?.trim() || undefined,
    };
    if (raw.fraisInscription !== null && raw.fraisInscription !== undefined && (raw.fraisInscription as any) !== '') {
      payload.fraisInscription = Number(raw.fraisInscription);
    }

    if (this.isEditing && this.formData.id) {
      this.pedagogie.updateFormation(this.formData.id, payload).subscribe({
        next: () => {
          this.toast.success('Formation mise à jour avec succès.');
          this.closeModal();
          this.loadData(true);
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Erreur lors de la mise à jour.');
          this.saving = false;
        },
      });
    } else {
      this.pedagogie.createFormation(payload).subscribe({
        next: () => {
          this.toast.success('Nouvelle formation créée avec succès.');
          this.closeModal();
          this.loadData(true);
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Erreur lors de la création.');
          this.saving = false;
        },
      });
    }
  }

  // ─── Modal Suppression ──────────────────────────────────────────────────────
  openDeleteModal(f: Formation, event?: Event) {
    event?.stopPropagation();
    this.formationToDelete = f;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.formationToDelete = null;
    this.deleting = false;
  }

  confirmDelete() {
    if (!this.formationToDelete) return;
    this.deleting = true;
    this.pedagogie.deleteFormation(this.formationToDelete.id).subscribe({
      next: () => {
        this.toast.success(`Formation « ${this.formationToDelete?.titre} » supprimée.`);
        this.closeDeleteModal();
        this.loadData(true);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Erreur lors de la suppression.');
        this.deleting = false;
      },
    });
  }

  // Suggestion de presets pour durée & badges
  applyDureePreset(preset: string) {
    this.formData.duree = preset;
  }

  applyBadgePreset(badge: string) {
    this.formData.badgeTexte = badge;
  }

  // ─── GESTION DES CATÉGORIES (ADMINISTRATEUR CENTRAL) ─────────────────────────
  openCategoryModal(catToEdit?: CategorieFormation) {
    if (catToEdit) {
      this.isEditingCategory = true;
      this.categoryFormData = {
        id: catToEdit.id,
        libelle: catToEdit.libelle || '',
        code: catToEdit.code || '',
        couleur: catToEdit.couleur || '#1C75BC',
        icone: catToEdit.icone || 'code',
        description: catToEdit.description || '',
        ordre: catToEdit.ordre ?? 1,
        actif: catToEdit.actif !== false,
      };
    } else {
      this.resetCategoryForm();
    }
    this.showCategoryModal = true;
  }

  closeCategoryModal() {
    this.showCategoryModal = false;
    this.categorySaving = false;
    this.resetCategoryForm();
  }

  resetCategoryForm() {
    this.isEditingCategory = false;
    const nextOrdre = this.categories.length > 0
      ? Math.max(...this.categories.map((c) => c.ordre || 0)) + 1
      : 1;
    this.categoryFormData = {
      id: '',
      libelle: '',
      code: '',
      couleur: '#1C75BC',
      icone: 'code',
      description: '',
      ordre: nextOrdre,
      actif: true,
    };
  }

  onCategoryLibelleChange() {
    if (!this.isEditingCategory || !this.categoryFormData.code) {
      this.categoryFormData.code = this.slugify(this.categoryFormData.libelle);
    }
  }

  private slugify(text: string): string {
    return (text || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  saveCategory() {
    if (!this.categoryFormData.libelle.trim()) {
      this.toast.info('Le libellé de la catégorie est obligatoire.');
      return;
    }

    const libelle = this.categoryFormData.libelle.trim();
    const code = (this.categoryFormData.code?.trim()) || this.slugify(libelle) || 'cat';

    this.categorySaving = true;

    const payload: any = {
      libelle,
      code,
      description: this.categoryFormData.description?.trim() || undefined,
      couleur: this.categoryFormData.couleur || '#1C75BC',
      icone: this.categoryFormData.icone || 'code',
      ordre: Number(this.categoryFormData.ordre) || 0,
      actif: this.categoryFormData.actif !== undefined ? this.categoryFormData.actif : true,
    };

    if (this.isEditingCategory && this.categoryFormData.id) {
      this.pedagogie.updateCategorie(this.categoryFormData.id, payload).subscribe({
        next: (updated) => {
          this.categorySaving = false;
          this.toast.success(`Catégorie "${updated.libelle}" mise à jour avec succès.`);
          this.loadCategories();
          this.resetCategoryForm();
        },
        error: (err) => {
          this.categorySaving = false;
          const msg = err.error?.message || 'Erreur lors de la modification de la catégorie.';
          this.toast.error(msg);
        },
      });
    } else {
      this.pedagogie.createCategorie(payload).subscribe({
        next: (created) => {
          this.categorySaving = false;
          this.toast.success(`Nouvelle catégorie "${created.libelle}" ajoutée avec succès.`);
          // Si le formulaire de formation est ouvert, présélectionner automatiquement la nouvelle catégorie
          if (this.showModal) {
            this.formData.categorie = created.code;
          }
          this.loadCategories();
          this.resetCategoryForm();
        },
        error: (err) => {
          this.categorySaving = false;
          const msg = err.error?.message || 'Erreur lors de la création de la catégorie.';
          this.toast.error(msg);
        },
      });
    }
  }

  confirmDeleteCategory(cat: CategorieFormation, event?: Event) {
    event?.stopPropagation();
    this.categoryToDelete = cat;
    this.showDeleteCategoryModal = true;
  }

  closeDeleteCategoryModal() {
    this.categoryToDelete = null;
    this.showDeleteCategoryModal = false;
  }

  executeDeleteCategory() {
    if (!this.categoryToDelete) return;
    const cat = this.categoryToDelete;
    this.pedagogie.deleteCategorie(cat.id).subscribe({
      next: (res) => {
        this.toast.success(res.message || `Catégorie "${cat.libelle}" supprimée.`);
        this.closeDeleteCategoryModal();
        this.loadCategories();
        this.loadData(true);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Impossible de supprimer la catégorie.');
      },
    });
  }

  countFormationsForCategory(catCode: string): number {
    return this.formations.filter((f) => (f.categorie || 'tech').toLowerCase() === catCode.toLowerCase()).length;
  }

  // ─── DÉPLOIEMENT MULTI-ÉTABLISSEMENTS (ADMIN CENTRAL) ──────────────────────────
  openDeployModal(f: Formation, event?: Event) {
    if (event) event.stopPropagation();
    this.formationToDeploy = f;
    this.selectedCibleEtabIds = [];
    this.showDeployModal = true;
  }

  closeDeployModal() {
    this.showDeployModal = false;
    this.formationToDeploy = null;
    this.selectedCibleEtabIds = [];
    this.deploying = false;
  }

  toggleCibleEtab(etabId: string) {
    if (this.selectedCibleEtabIds.includes(etabId)) {
      this.selectedCibleEtabIds = this.selectedCibleEtabIds.filter((id) => id !== etabId);
    } else {
      this.selectedCibleEtabIds.push(etabId);
    }
  }

  selectAllEtabs() {
    if (!this.formationToDeploy) return;
    this.selectedCibleEtabIds = this.etablissements
      .filter((e) => e.id !== this.formationToDeploy?.etablissementId)
      .map((e) => e.id);
  }

  submitDeploy() {
    if (!this.formationToDeploy || this.selectedCibleEtabIds.length === 0) return;
    this.deploying = true;
    this.pedagogie.deployerFormation(this.formationToDeploy.id, this.selectedCibleEtabIds).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Formation déployée avec succès.');
        this.closeDeployModal();
        this.loadData(true);
      },
      error: (err) => {
        this.deploying = false;
        this.toast.error(err?.error?.message || 'Erreur lors du déploiement de la formation.');
      },
    });
  }
}

