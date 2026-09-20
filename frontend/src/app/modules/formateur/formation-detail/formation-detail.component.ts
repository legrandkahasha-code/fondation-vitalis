import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedagogieService } from '../../../core/services/pedagogie.service';
import { CertificationService } from '../../../core/services/certification.service';
import { QuizService, Quiz } from '../../../core/services/quiz.service';
import { DevoirsService, Devoir } from '../../../core/services/devoirs.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Formation, Module, Cours, Evaluation, Utilisateur, CategorieFormation, FiliereReferentiel } from '../../../core/models';

@Component({
  selector: 'app-formation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, MainLayoutComponent],
  templateUrl: './formation-detail.component.html',
})
export class FormationDetailComponent implements OnInit {
  formation: Formation | null = null;
  categories: CategorieFormation[] = [];
  referentielFilieres: FiliereReferentiel[] = [];
  apprenants: Utilisateur[] = [];
  
  // États de chargement et d'erreur
  isLoading = true;
  errorMessage = '';

  // Onglet actif
  activeTab: 'modules' | 'evaluations' | 'apprenants' | 'referentiel' = 'modules';

  // État accordéons modules
  expandedModules = new Set<string>();

  // Inscriptions & Apprenants
  inscriptions: any[] = [];
  loadingInscriptions = false;
  showInscrireModal = false;
  isInscribing = false;
  inscrireFormData = {
    apprenantId: '',
    statut: 'ACTIVE',
  };

  // Émission certificat
  selectedApprenantId = '';
  isEmittingCertificat = false;
  certMessage = '';
  certSuccess = false;

  // ─── MODALE 1 : MODULE ────────────────────────────────────────────────────────
  showModuleModal = false;
  isEditingModule = false;
  isSavingModule = false;
  selectedModuleId = '';
  moduleFormData = { titre: '', coefficient: 1, ordre: 1 };

  // ─── MODALE 2 : COURS ─────────────────────────────────────────────────────────
  showCoursModal = false;
  isEditingCours = false;
  isSavingCours = false;
  targetModuleForCours: Module | null = null;
  selectedCoursId = '';
  coursFormData = { titre: '', contenu: '', fileUrl: '' };

  // ─── MODALE 3 : ÉVALUATION ────────────────────────────────────────────────────
  showEvaluationModal = false;
  isSavingEval = false;
  targetModuleForEval: Module | null = null;
  evalFormData = { titre: '', noteMaximale: 20 };

  // ─── MODALE 4 : QUIZ ──────────────────────────────────────────────────────────
  showQuizModal = false;
  isSavingQuiz = false;
  targetModuleForQuiz: Module | null = null;
  quizFormData = {
    titre: '',
    dureeMinutes: 15,
    q1: '',
    a1: '',
    a1_wrong: '',
    q2: '',
    a2: '',
    a2_wrong: '',
  };

  // ─── MODALE 5 : DEVOIR ────────────────────────────────────────────────────────
  showDevoirModal = false;
  isSavingDevoir = false;
  targetModuleForDevoir: Module | null = null;
  devoirFormData = { titre: '', consignes: '', dateLimite: '' };

  // ─── MODALE 6 : MODIFIER FORMATION ────────────────────────────────────────────
  showEditFormationModal = false;
  isSavingFormationSettings = false;
  editFormationData: any = {};

  // ─── MODALE 7 : SUPPRESSION SÉCURISÉE ─────────────────────────────────────────
  deleteModalState: {
    open: boolean;
    type: 'module' | 'cours' | 'evaluation' | 'quiz' | 'devoir';
    id: string;
    itemTitle: string;
  } = {
    open: false,
    type: 'module',
    id: '',
    itemTitle: '',
  };
  isDeletingItem = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public auth: AuthService,
    private pedagogie: PedagogieService,
    private certification: CertificationService,
    private quizService: QuizService,
    private devoirsService: DevoirsService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.reloadFormation();
  }

  get homeRoute(): string {
    return this.auth.hasRole('ADMIN_CENTRE') ? '/admin/accueil' : '/dashboard';
  }

  get backLink(): string {
    return this.auth.hasRole('ADMIN_CENTRE') ? '/admin/formations' : '/formations';
  }

  selectTab(tab: 'modules' | 'evaluations' | 'apprenants' | 'referentiel') {
    this.activeTab = tab;
    if (tab === 'apprenants') {
      if (this.apprenants.length === 0) this.loadApprenants();
      this.loadInscriptions();
    }
    if (tab === 'referentiel' && this.referentielFilieres.length === 0) {
      this.loadReferentielFilieres();
    }
  }

  // ─── CHARGEMENT DES DONNÉES ──────────────────────────────────────────────────
  reloadFormation(forceRefresh = false) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Identifiant de formation manquant.';
      this.isLoading = false;
      return;
    }

    // ─── AFFICHAGE INSTANTANÉ (0 ms) ───
    // Si la formation est déjà en cache (depuis la liste ou navigation précédente),
    // on l'affiche immédiatement sans écran blanc ni spinner bloquant
    const cached = this.pedagogie.getCachedFormation(id);
    if (cached) {
      this.formation = cached;
      this.isLoading = false;
      if (cached.modules) {
        cached.modules.forEach((m) => this.expandedModules.add(m.id));
      }
    } else {
      this.isLoading = true;
    }

    this.errorMessage = '';

    this.pedagogie.getFormation(id, forceRefresh).subscribe({
      next: (f) => {
        this.formation = f;
        this.isLoading = false;
        if (f.modules) {
          f.modules.forEach((m) => this.expandedModules.add(m.id));
        }
      },
      error: (err) => {
        if (!this.formation) {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Erreur lors du chargement de la formation.';
          this.toast.error(this.errorMessage);
        }
      },
    });
  }

  loadCategories() {
    if (this.categories.length > 0) return;
    this.pedagogie.getCategories(true).subscribe({
      next: (cats) => this.categories = cats || [],
      error: () => {},
    });
  }

  loadReferentielFilieres() {
    if (this.referentielFilieres.length > 0) return;
    this.pedagogie.getReferentielFilieres(true).subscribe({
      next: (fils) => this.referentielFilieres = fils || [],
      error: () => {},
    });
  }

  loadApprenants() {
    this.pedagogie.getApprenants().subscribe({
      next: (a) => this.apprenants = a || [],
      error: () => {},
    });
  }

  loadInscriptions() {
    if (!this.formation) return;
    this.loadingInscriptions = true;
    this.pedagogie.getInscriptionsByFormation(this.formation.id).subscribe({
      next: (data) => {
        this.inscriptions = data || [];
        this.loadingInscriptions = false;
      },
      error: () => {
        this.loadingInscriptions = false;
      },
    });
  }

  openInscrireModal() {
    this.inscrireFormData = {
      apprenantId: '',
      statut: 'ACTIVE',
    };
    this.showInscrireModal = true;
    if (this.apprenants.length === 0) {
      this.loadApprenants();
    }
  }

  closeInscrireModal() {
    this.showInscrireModal = false;
    this.isInscribing = false;
  }

  submitInscription() {
    if (!this.formation || !this.inscrireFormData.apprenantId) return;
    this.isInscribing = true;
    this.pedagogie.inscrireApprenant({
      apprenantId: this.inscrireFormData.apprenantId,
      formationId: this.formation.id,
      statut: this.inscrireFormData.statut,
    }).subscribe({
      next: () => {
        this.toast.success('Apprenant inscrit avec succès à la formation.');
        this.closeInscrireModal();
        this.loadInscriptions();
        this.reloadFormation(true);
      },
      error: (err) => {
        this.isInscribing = false;
        this.toast.error(err?.error?.message || 'Erreur lors de l\'inscription de l\'apprenant.');
      },
    });
  }

  desinscrireApprenant(inscriptionId: string, nomApprenant: string) {
    if (!confirm(`Êtes-vous sûr de vouloir retirer ${nomApprenant} de cette formation ?`)) {
      return;
    }
    this.pedagogie.desinscrireApprenant(inscriptionId).subscribe({
      next: () => {
        this.toast.success('Désinscription effectuée.');
        this.loadInscriptions();
        this.reloadFormation(true);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Erreur lors de la désinscription.');
      },
    });
  }

  // ─── GESTION ACCORDÉONS MODULES ──────────────────────────────────────────────
  toggleModule(moduleId: string) {
    if (this.expandedModules.has(moduleId)) {
      this.expandedModules.delete(moduleId);
    } else {
      this.expandedModules.add(moduleId);
    }
  }

  isModuleExpanded(moduleId: string): boolean {
    return this.expandedModules.has(moduleId);
  }

  areAllModulesExpanded(): boolean {
    if (!this.formation?.modules?.length) return false;
    return this.formation.modules.every((m) => this.expandedModules.has(m.id));
  }

  toggleAllModules() {
    if (this.areAllModulesExpanded()) {
      this.expandedModules.clear();
    } else {
      this.formation?.modules?.forEach((m) => this.expandedModules.add(m.id));
    }
  }

  // ─── KPIS & COMPTEURS ────────────────────────────────────────────────────────
  get totalCoursCount(): number {
    return (this.formation?.modules || []).reduce((acc, m) => acc + (m.cours?.length || 0), 0);
  }

  get totalPdfCount(): number {
    return (this.formation?.modules || []).reduce(
      (acc, m) => acc + (m.cours || []).filter((c) => !!c.fileUrl).length,
      0
    );
  }

  get totalAssessmentsCount(): number {
    return (this.formation?.modules || []).reduce((acc, m) => {
      const evals = m.evaluations?.length || 0;
      const quiz = m.quiz?.length || 0;
      const devoirs = m.devoirs?.length || 0;
      return acc + evals + quiz + devoirs;
    }, 0);
  }

  get allEvaluations(): any[] {
    const list: any[] = [];
    (this.formation?.modules || []).forEach((m) => {
      (m.evaluations || []).forEach((ev) => {
        list.push({ ...ev, moduleTitre: m.titre });
      });
    });
    return list;
  }

  get allQuiz(): any[] {
    const list: any[] = [];
    (this.formation?.modules || []).forEach((m) => {
      (m.quiz || []).forEach((q) => {
        list.push({ ...q, moduleTitre: m.titre });
      });
    });
    return list;
  }

  get allDevoirs(): any[] {
    const list: any[] = [];
    (this.formation?.modules || []).forEach((m) => {
      (m.devoirs || []).forEach((d) => {
        list.push({ ...d, moduleTitre: m.titre });
      });
    });
    return list;
  }

  // ─── GESTION DES CATÉGORIES ──────────────────────────────────────────────────
  getCategorieColor(code?: string): string {
    const found = this.categories.find((c) => c.code === code);
    if (found?.couleur) return found.couleur;
    if (code === 'tech') return '#1C75BC';
    if (code === 'gestion') return '#F0791E';
    if (code === 'technique') return '#276B44';
    return '#124F80';
  }

  getCategorieLabel(code?: string): string {
    const found = this.categories.find((c) => c.code === code);
    if (found?.libelle) return found.libelle;
    if (code === 'tech') return 'Informatique & Technologies';
    if (code === 'gestion') return 'Gestion & Management';
    if (code === 'technique') return 'Techniques & BTP';
    return code ? code.toUpperCase() : 'Général';
  }

  // ─── CRUD 1 : MODULES ────────────────────────────────────────────────────────
  openCreateModuleModal() {
    this.isEditingModule = false;
    this.selectedModuleId = '';
    const nextOrdre = (this.formation?.modules?.length || 0) + 1;
    this.moduleFormData = { titre: '', coefficient: 1, ordre: nextOrdre };
    this.showModuleModal = true;
  }

  openEditModuleModal(mod: Module) {
    this.isEditingModule = true;
    this.selectedModuleId = mod.id;
    this.moduleFormData = {
      titre: mod.titre,
      coefficient: Number(mod.coefficient) || 1,
      ordre: mod.ordre || 1,
    };
    this.showModuleModal = true;
  }

  closeModuleModal() {
    this.showModuleModal = false;
    this.isSavingModule = false;
  }

  saveModule() {
    if (!this.formation) return;
    if (!this.moduleFormData.titre.trim()) {
      this.toast.info('Le titre du module est requis.');
      return;
    }

    this.isSavingModule = true;
    const payload = {
      titre: this.moduleFormData.titre.trim(),
      coefficient: Number(this.moduleFormData.coefficient) || 1,
      ordre: Number(this.moduleFormData.ordre) || 1,
    };

    if (this.isEditingModule && this.selectedModuleId) {
      this.pedagogie.updateModule(this.selectedModuleId, payload).subscribe({
        next: () => {
          this.toast.success('Module mis à jour avec succès.');
          this.closeModuleModal();
          this.reloadFormation();
        },
        error: (err) => {
          this.isSavingModule = false;
          this.toast.error(err?.error?.message || 'Erreur lors de la mise à jour du module.');
        },
      });
    } else {
      this.pedagogie.createModule(this.formation.id, payload).subscribe({
        next: () => {
          this.toast.success('Nouveau module ajouté au programme.');
          this.closeModuleModal();
          this.reloadFormation();
        },
        error: (err) => {
          this.isSavingModule = false;
          this.toast.error(err?.error?.message || 'Erreur lors de la création du module.');
        },
      });
    }
  }

  // ─── CRUD 2 : COURS ──────────────────────────────────────────────────────────
  openCreateCoursModal(mod: Module) {
    this.isEditingCours = false;
    this.targetModuleForCours = mod;
    this.selectedCoursId = '';
    this.coursFormData = { titre: '', contenu: '', fileUrl: '' };
    this.showCoursModal = true;
  }

  openEditCoursModal(mod: Module, cours: Cours) {
    this.isEditingCours = true;
    this.targetModuleForCours = mod;
    this.selectedCoursId = cours.id;
    this.coursFormData = {
      titre: cours.titre,
      contenu: cours.contenu || '',
      fileUrl: cours.fileUrl || '',
    };
    this.showCoursModal = true;
  }

  closeCoursModal() {
    this.showCoursModal = false;
    this.isSavingCours = false;
    this.targetModuleForCours = null;
  }

  saveCours() {
    if (!this.targetModuleForCours) return;
    if (!this.coursFormData.titre.trim()) {
      this.toast.info('Le titre du cours est obligatoire.');
      return;
    }

    this.isSavingCours = true;
    const payload = {
      titre: this.coursFormData.titre.trim(),
      contenu: this.coursFormData.contenu?.trim() || undefined,
      fileUrl: this.coursFormData.fileUrl?.trim() || undefined,
    };

    if (this.isEditingCours && this.selectedCoursId) {
      this.pedagogie.updateCours(this.selectedCoursId, payload).subscribe({
        next: () => {
          this.toast.success('Cours mis à jour avec succès.');
          this.closeCoursModal();
          this.reloadFormation();
        },
        error: (err) => {
          this.isSavingCours = false;
          this.toast.error(err?.error?.message || 'Erreur lors de la mise à jour du cours.');
        },
      });
    } else {
      this.pedagogie.createCours(this.targetModuleForCours.id, payload).subscribe({
        next: () => {
          this.toast.success('Nouveau support de cours ajouté.');
          this.closeCoursModal();
          this.reloadFormation();
        },
        error: (err) => {
          this.isSavingCours = false;
          this.toast.error(err?.error?.message || 'Erreur lors de la création du cours.');
        },
      });
    }
  }

  uploadCoursFile(coursId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.toast.info('Téléversement du document en cours...');
    this.pedagogie.uploadCoursFile(coursId, file).subscribe({
      next: () => {
        this.toast.success('Document PDF téléversé avec succès.');
        this.reloadFormation();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Erreur lors du téléversement du fichier.');
      },
    });
  }

  // ─── CRUD 3 : ÉVALUATIONS ────────────────────────────────────────────────────
  openCreateEvaluationModal(mod: Module) {
    this.targetModuleForEval = mod;
    this.evalFormData = { titre: '', noteMaximale: 20 };
    this.showEvaluationModal = true;
  }

  closeEvaluationModal() {
    this.showEvaluationModal = false;
    this.isSavingEval = false;
    this.targetModuleForEval = null;
  }

  saveEvaluation() {
    if (!this.targetModuleForEval) return;
    if (!this.evalFormData.titre.trim()) {
      this.toast.info('Le titre de l\'évaluation est obligatoire.');
      return;
    }

    this.isSavingEval = true;
    this.pedagogie.createEvaluation(this.targetModuleForEval.id, {
      titre: this.evalFormData.titre.trim(),
      noteMaximale: Number(this.evalFormData.noteMaximale) || 20,
    }).subscribe({
      next: () => {
        this.toast.success('Évaluation continue créée.');
        this.closeEvaluationModal();
        this.reloadFormation();
      },
      error: (err) => {
        this.isSavingEval = false;
        this.toast.error(err?.error?.message || 'Erreur lors de la création de l\'évaluation.');
      },
    });
  }

  // ─── CRUD 4 : QUIZ ───────────────────────────────────────────────────────────
  openCreateQuizModal(mod: Module) {
    this.targetModuleForQuiz = mod;
    this.quizFormData = {
      titre: '',
      dureeMinutes: 15,
      q1: '',
      a1: '',
      a1_wrong: 'Option alternative fausse',
      q2: '',
      a2: '',
      a2_wrong: 'Option alternative fausse',
    };
    this.showQuizModal = true;
  }

  closeQuizModal() {
    this.showQuizModal = false;
    this.isSavingQuiz = false;
    this.targetModuleForQuiz = null;
  }

  saveQuiz() {
    if (!this.targetModuleForQuiz) return;
    if (!this.quizFormData.titre.trim()) {
      this.toast.info('Le titre du quiz est obligatoire.');
      return;
    }
    if (!this.quizFormData.q1.trim() || !this.quizFormData.a1.trim()) {
      this.toast.info('Veuillez renseigner au moins la Question 1 et sa bonne réponse.');
      return;
    }

    this.isSavingQuiz = true;
    const questions: any[] = [
      {
        enonce: this.quizFormData.q1.trim(),
        options: [
          { text: this.quizFormData.a1.trim(), correct: true },
          { text: this.quizFormData.a1_wrong.trim() || 'Option erronée', correct: false },
        ],
      },
    ];

    if (this.quizFormData.q2.trim() && this.quizFormData.a2.trim()) {
      questions.push({
        enonce: this.quizFormData.q2.trim(),
        options: [
          { text: this.quizFormData.a2.trim(), correct: true },
          { text: this.quizFormData.a2_wrong.trim() || 'Option erronée', correct: false },
        ],
      });
    }

    this.quizService.create(this.targetModuleForQuiz.id, {
      titre: this.quizFormData.titre.trim(),
      dureeMinutes: Number(this.quizFormData.dureeMinutes) || 15,
      questions,
    }).subscribe({
      next: () => {
        this.toast.success('Quiz interactif créé avec succès.');
        this.closeQuizModal();
        this.reloadFormation();
      },
      error: (err) => {
        this.isSavingQuiz = false;
        this.toast.error(err?.error?.message || 'Erreur lors de la création du quiz.');
      },
    });
  }

  // ─── CRUD 5 : DEVOIRS ────────────────────────────────────────────────────────
  openCreateDevoirModal(mod: Module) {
    this.targetModuleForDevoir = mod;
    this.devoirFormData = { titre: '', consignes: '', dateLimite: '' };
    this.showDevoirModal = true;
  }

  closeDevoirModal() {
    this.showDevoirModal = false;
    this.isSavingDevoir = false;
    this.targetModuleForDevoir = null;
  }

  saveDevoir() {
    if (!this.targetModuleForDevoir) return;
    if (!this.devoirFormData.titre.trim()) {
      this.toast.info('Le titre du devoir est requis.');
      return;
    }

    this.isSavingDevoir = true;
    this.devoirsService.create(this.targetModuleForDevoir.id, {
      titre: this.devoirFormData.titre.trim(),
      consignes: this.devoirFormData.consignes?.trim() || undefined,
      dateLimite: this.devoirFormData.dateLimite ? new Date(this.devoirFormData.dateLimite).toISOString() : undefined,
    }).subscribe({
      next: () => {
        this.toast.success('Devoir pratique ajouté au module.');
        this.closeDevoirModal();
        this.reloadFormation();
      },
      error: (err) => {
        this.isSavingDevoir = false;
        this.toast.error(err?.error?.message || 'Erreur lors de la création du devoir.');
      },
    });
  }

  // ─── CRUD 6 : MODIFIER FORMATION ─────────────────────────────────────────────
  openEditFormationModal() {
    if (!this.formation) return;
    this.loadCategories();
    this.loadReferentielFilieres();
    this.editFormationData = {
      titre: this.formation.titre || '',
      description: this.formation.description || '',
      duree: this.formation.duree || '40 Heures',
      categorie: this.formation.categorie || 'tech',
      formationReferentielId: this.formation.formationReferentielId || this.formation.formationReferentiel?.filiere?.id || '',
      publieSurLanding: this.formation.publieSurLanding ?? true,
      aLaUne: this.formation.aLaUne ?? false,
      badgeTexte: this.formation.badgeTexte || '',
      fraisInscription: this.formation.fraisInscription,
      debouches: this.formation.debouches || '',
      objectifs: this.formation.objectifs || '',
      prerequis: this.formation.prerequis || '',
    };
    this.showEditFormationModal = true;
  }

  closeEditFormationModal() {
    this.showEditFormationModal = false;
    this.isSavingFormationSettings = false;
  }

  saveFormationSettings() {
    if (!this.formation) return;
    if (!this.editFormationData.titre.trim()) {
      this.toast.info('Le titre de la formation est requis.');
      return;
    }

    this.isSavingFormationSettings = true;
    const payload = {
      titre: this.editFormationData.titre.trim(),
      description: this.editFormationData.description?.trim() || undefined,
      duree: this.editFormationData.duree?.trim() || '40 Heures',
      categorie: this.editFormationData.categorie || 'tech',
      formationReferentielId: this.editFormationData.formationReferentielId?.trim() || null,
      publieSurLanding: this.editFormationData.publieSurLanding,
      aLaUne: this.editFormationData.aLaUne,
      badgeTexte: this.editFormationData.badgeTexte?.trim() || undefined,
      fraisInscription: this.editFormationData.fraisInscription !== null && this.editFormationData.fraisInscription !== undefined ? Number(this.editFormationData.fraisInscription) : undefined,
      debouches: this.editFormationData.debouches?.trim() || undefined,
      objectifs: this.editFormationData.objectifs?.trim() || undefined,
      prerequis: this.editFormationData.prerequis?.trim() || undefined,
    };

    this.pedagogie.updateFormation(this.formation.id, payload).subscribe({
      next: (updated) => {
        this.toast.success('Paramètres et vitrine mis à jour avec succès.');
        this.closeEditFormationModal();
        this.reloadFormation();
      },
      error: (err) => {
        this.isSavingFormationSettings = false;
        this.toast.error(err?.error?.message || 'Erreur lors de la mise à jour.');
      },
    });
  }

  // ─── CRUD 7 : SUPPRESSION SÉCURISÉE ──────────────────────────────────────────
  confirmDeleteModule(mod: Module) {
    this.deleteModalState = {
      open: true,
      type: 'module',
      id: mod.id,
      itemTitle: `Module : "${mod.titre}"`,
    };
  }

  confirmDeleteCours(c: Cours) {
    this.deleteModalState = {
      open: true,
      type: 'cours',
      id: c.id,
      itemTitle: `Cours : "${c.titre}"`,
    };
  }

  confirmDeleteEvaluation(ev: any) {
    this.deleteModalState = {
      open: true,
      type: 'evaluation',
      id: ev.id,
      itemTitle: `Évaluation : "${ev.titre}"`,
    };
  }

  confirmDeleteQuiz(q: any) {
    this.deleteModalState = {
      open: true,
      type: 'quiz',
      id: q.id,
      itemTitle: `Quiz : "${q.titre}"`,
    };
  }

  confirmDeleteDevoir(d: any) {
    this.deleteModalState = {
      open: true,
      type: 'devoir',
      id: d.id,
      itemTitle: `Devoir : "${d.titre}"`,
    };
  }

  closeDeleteModal() {
    this.deleteModalState.open = false;
    this.isDeletingItem = false;
  }

  executeDelete() {
    const { type, id } = this.deleteModalState;
    if (!id) return;

    this.isDeletingItem = true;
    let obs$;

    switch (type) {
      case 'module':
        obs$ = this.pedagogie.deleteModule(id);
        break;
      case 'cours':
        obs$ = this.pedagogie.deleteCours(id);
        break;
      case 'evaluation':
        obs$ = this.pedagogie.deleteEvaluation(id);
        break;
      case 'quiz':
        obs$ = this.quizService.delete(id);
        break;
      case 'devoir':
        obs$ = this.devoirsService.delete(id);
        break;
    }

    obs$.subscribe({
      next: () => {
        this.toast.success('Suppression effectuée avec succès.');
        this.closeDeleteModal();
        this.reloadFormation();
      },
      error: (err) => {
        this.isDeletingItem = false;
        this.toast.error(err?.error?.message || 'Erreur lors de la suppression.');
      },
    });
  }

  // ─── ÉMISSION CERTIFICAT ─────────────────────────────────────────────────────
  selectApprenantForCertificat(apprenantId: string) {
    this.selectedApprenantId = apprenantId;
    this.certMessage = '';
  }

  emettreCertificat() {
    if (!this.formation || !this.selectedApprenantId) return;
    this.isEmittingCertificat = true;
    this.certMessage = '';

    this.certification.emettre(this.formation.id, this.selectedApprenantId).subscribe({
      next: (res: any) => {
        this.isEmittingCertificat = false;
        this.certSuccess = true;
        this.certMessage = res.message || 'Certificat officiel délivré avec succès.';
        this.toast.success(this.certMessage);
      },
      error: (err) => {
        this.isEmittingCertificat = false;
        this.certSuccess = false;
        this.certMessage = err.error?.message || 'Conditions non remplies pour l\'émission du certificat.';
        this.toast.error(this.certMessage);
      },
    });
  }
}
