import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { tap, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationPayload } from './notifications.service';

export interface ApprenantProfileInfo {
  id: string;
  utilisateurId: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  dateNaissance?: string | null;
  etablissement: { id: string; nom: string; codeAntenne: string } | null;
}

export interface ApprenantBootstrapData {
  profile: ApprenantProfileInfo;
  dashboard: ApprenantDashboard;
  formations: ApprenantFormation[];
  devoirs: any[];
  quiz: ApprenantQuizItem[];
  seances: ApprenantSeanceItem[];
  assiduite: ApprenantAssiduite;
  certificats: ApprenantCertificat[];
  candidatures: any[];
  dossier: ApprenantDossierData;
  formationsFiliere?: FormationsFiliereResponse;
}

export interface ApprenantDashboard {
  completionGlobale: number;
  formationsActives: Array<{
    id: string;
    titre: string;
    description: string;
    nbModules: number;
    totalCours: number;
    coursCompletes: number;
    pourcentage: number;
    certifie: boolean;
    certificatId: string | null;
  }>;
  nbFormations: number;
  nbQuizPasses: number;
  nbDevoirsDeposes: number;
  nbCertificats: number;
  prochaineEcheance: {
    type: 'devoir' | 'seance' | 'quiz';
    id: string;
    titre: string;
    formationTitre: string;
    dateLimite: string;
  } | null;
}

export interface FormationFiliereItem {
  id: string;
  titre: string;
  code?: string;
  description?: string;
  duree?: string;
  categorie?: string;
  debouches?: string;
  prerequis?: string;
  objectifs?: string;
  fraisInscription?: number | null;
  etablissement?: { id: string; nom: string; codeAntenne: string };
  filiere?: { id: string; libelle: string; code: string; description?: string | null } | null;
  niveau?: { id: string; libelle: string; code: string } | null;
  nbModules: number;
  totalCours: number;
  totalQuiz: number;
  totalDevoirs: number;
  modulesApercu?: Array<{ id: string; titre: string }>;
  estInscrit: boolean;
  statutInscription?: string | null;
  inscriptionId?: string | null;
  pourcentage?: number | null;
}

export interface FormationsFiliereResponse {
  filieresChoisies: Array<{ id: string; libelle: string; code: string; description?: string | null }>;
  hasFiliereChoisie: boolean;
  totalFormations: number;
  formations: FormationFiliereItem[];
}

export interface ApprenantFormation {
  id: string;
  titre: string;
  description: string;
  createdAt: string;
  etablissement?: { id: string; nom: string; codeAntenne: string };
  nbModules: number;
  totalCours: number;
  coursCompletes: number;
  totalQuiz?: number;
  totalDevoirs?: number;
  pourcentage: number;
  estCertifie: boolean;
  certificat: {
    id: string;
    numeroSerie: string;
    dateEmission: string;
  } | null;
}

export interface FormationArborescence {
  formation: {
    id: string;
    titre: string;
    description: string;
    etablissement: { id: string; nom: string; codeAntenne: string };
    progressionGlobale: number;
    certificat: { id: string; numeroSerie: string; dateEmission: string } | null;
  };
  modules: Array<{
    id: string;
    titre: string;
    ordre: number;
    coefficient: number;
    statut: 'non_commence' | 'en_cours' | 'termine';
    pourcentage: number;
    totalCours: number;
    completedCours: number;
    cours: Array<{
      id: string;
      titre: string;
      hasMedia: boolean;
      hasText: boolean;
      complete: boolean;
      dateTerminaison: string | null;
    }>;
    quiz: Array<{
      id: string;
      titre: string;
      dureeMinutes: number | null;
      passe: boolean;
      score: number | null;
      datePassage: string | null;
    }>;
    devoirs: Array<{
      id: string;
      titre: string;
      consignes: string | null;
      dateLimite: string | null;
      estEnRetard: boolean;
      soumis: boolean;
      note: number | null;
      commentaire: string | null;
      dateDepot: string | null;
    }>;
    evaluations?: Array<{
      id: string;
      titre: string;
      noteMaximale: number;
      note: number | null;
      dateNotation: string | null;
    }>;
  }>;
}

export interface EligibiliteCertificat {
  eligible: boolean;
  completionRate: number;
  moyenne: number;
  raison: string | null;
  dejaEmis: boolean;
  certificat: {
    id: string;
    numeroSerie: string;
    dateEmission: string;
    urlPdfS3: string;
  } | null;
}

export interface CoursContenu {
  id: string;
  titre: string;
  contenu: string | null;
  fileUrl: string | null;
  module: { id: string; titre: string };
  formation: { id: string; titre: string };
  complete: boolean;
  dateTerminaison: string | null;
}

export interface QuizQuestion {
  id: string;
  enonce: string;
  ordre: number;
  options: Array<{ text: string }>;
}

export interface QuizDetail {
  id: string;
  titre: string;
  dureeMinutes: number | null;
  moduleId: string;
  formationTitre: string;
  totalQuestions: number;
  questions: QuizQuestion[];
  tentative: {
    id: string;
    score: number;
    datePassage: string;
    dejaPasse: boolean;
  } | null;
}

export interface QuizSubmissionResult {
  success: boolean;
  tentativeId: string;
  score: number;
  bonnesReponses: number;
  totalQuestions: number;
  datePassage: string;
  detailsCorrection: Array<{
    questionId: string;
    enonce: string;
    selectedIndex: number;
    estCorrect: boolean;
  }>;
}

export interface ApprenantQuizItem {
  id: string;
  titre: string;
  dureeMinutes: number | null;
  nbQuestions: number;
  moduleId: string;
  moduleTitre: string;
  formationId: string;
  formationTitre: string;
  tentative: {
    id: string;
    score: number;
    datePassage: string;
  } | null;
}

export interface ApprenantCertificat {
  id: string;
  numeroSerie: string;
  hashVerification: string;
  moyenneGenerale: number;
  dateEmission: string;
  urlPdfS3: string;
  formation: {
    id: string;
    titre: string;
    description: string;
    etablissement: { nom: string; codeAntenne: string };
  };
}

export interface ApprenantSeanceItem {
  id: string;
  titreActivite: string;
  typeSession: string;
  dateHeureDebut: string;
  dateHeureFin: string;
  salleOuLien: string | null;
  moduleTitre: string;
  formationId: string;
  formationTitre: string;
  formateurNom: string;
  presence: {
    statut: 'PRESENT' | 'ABSENT' | 'RETARD' | 'JUSTIFIE';
    remarqueJustification: string | null;
    misAJourA: string | null;
  } | null;
}

export interface ApprenantAssiduite {
  total: number;
  presents: number;
  retards: number;
  absents: number;
  justifies: number;
  tauxAssiduite: number;
}

export interface ReleveNotesBulletin {
  formation: {
    id: string;
    titre: string;
    etablissement: { nom: string; codeAntenne: string };
  };
  apprenant: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  completionRate: number;
  moyenneGenerale: number;
  mention: string;
  dateEdition: string;
  modules: Array<{
    id: string;
    titre: string;
    ordre: number;
    coefficient: number;
    moyenneModule: number | null;
    epreuves: Array<{
      type: 'evaluation' | 'devoir' | 'quiz';
      titre: string;
      noteSur20: number | null;
      date: string | null;
    }>;
  }>;
}

export interface DocumentDossierItem {
  id: string;
  titre: string;
  typeDocument: string;
  nomFichier: string;
  fileUrl: string | null;
  statut: string;
  commentaire?: string | null;
  createdAt: string;
}

export interface DemandeRegularisationItem {
  id: string;
  motif: string;
  description: string;
  piecesDemandees: string[];
  dateLimite: string;
  statut: string;
  decisionCommentaire?: string | null;
  auteur?: { nom: string; prenom: string; role: string };
  createdAt: string;
}

export interface ApprenantDossierData {
  documents: DocumentDossierItem[];
  regularisations: DemandeRegularisationItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ApprenantService {
  private apiUrl = `${environment.apiUrl}/apprenant`;

  public readonly CACHE_KEYS = {
    BOOTSTRAP: 'vc_apprenant_bootstrap',
    PROFILE: 'vc_apprenant_profile',
    VOEUX: 'vc_admission_mes_voeux',
    DASHBOARD: 'vc_apprenant_dashboard',
    FORMATIONS: 'vc_apprenant_formations',
    FORMATIONS_FILIERE: 'vc_apprenant_formations_filiere',
    MODULES_PREFIX: 'vc_apprenant_modules_',
    CERTIFICATS: 'vc_apprenant_certificats',
    DEVOIRS: 'vc_apprenant_devoirs',
    QUIZ_LIST: 'vc_apprenant_quiz_list',
    QUIZ_PREFIX: 'vc_apprenant_quiz_detail_',
    SEANCES: 'vc_apprenant_seances',
    ASSIDUITE: 'vc_apprenant_assiduite',
    DOSSIER: 'vc_apprenant_dossier',
  };

  /** Store réactif du bundle apprenant */
  readonly bootstrap$ = new BehaviorSubject<ApprenantBootstrapData | null>(null);

  constructor(private http: HttpClient) {}

  // ───────────────────────────────────────────────────────────
  // BUS TEMPS RÉEL — événements SSE reçus et distribués aux composants
  // ───────────────────────────────────────────────────────────
  /** Bus interne : chaque message SSE reçu est relayé ici. */
  readonly liveUpdates$ = new Subject<NotificationPayload>();

  /**
   * Appelé par ApprenantShellComponent lors de la réception d'un événement SSE.
   * Invalide le cache puis recharge les données concernées en arrière-plan.
   */
  triggerRealtimeRefresh(event: NotificationPayload): void {
    // 1. Invalider les caches pertinents selon le type d'événement
    switch (event.type) {
      case 'DEVOIR_NOTE':
      case 'DEVOIR_DEPOSE':
        localStorage.removeItem(this.CACHE_KEYS.DEVOIRS);
        localStorage.removeItem(this.CACHE_KEYS.DASHBOARD);
        this.getAllDevoirs().subscribe({ error: () => {} });
        break;
      case 'NOTE_PUBLIEE':
      case 'COURS_COMPLETED':
        localStorage.removeItem(this.CACHE_KEYS.DASHBOARD);
        localStorage.removeItem(this.CACHE_KEYS.FORMATIONS);
        this.invalidateModulesCache();
        this.getAllDevoirs().subscribe({ error: () => {} });
        break;
      case 'QUIZ_SUBMITTED':
        localStorage.removeItem(this.CACHE_KEYS.DASHBOARD);
        localStorage.removeItem(this.CACHE_KEYS.FORMATIONS);
        localStorage.removeItem(this.CACHE_KEYS.QUIZ_LIST);
        this.invalidateModulesCache();
        this.getAllQuiz().subscribe({ error: () => {} });
        break;
      case 'COURS_PUBLIE':
      case 'FORMATION_UPDATE':
        // Purge explicite de TOUS les caches qui contiennent des formations
        // (le bootstrap contient formations + formationsFiliere en un bundle)
        localStorage.removeItem(this.CACHE_KEYS.BOOTSTRAP);
        localStorage.removeItem(this.CACHE_KEYS.DASHBOARD);
        localStorage.removeItem(this.CACHE_KEYS.FORMATIONS);
        localStorage.removeItem(this.CACHE_KEYS.FORMATIONS_FILIERE);
        localStorage.removeItem(this.CACHE_KEYS.CERTIFICATS);
        this.invalidateModulesCache();
        // Rechargements en arrière-plan : les deux onglets du tableau de bord apprenant
        this.getFormations().subscribe({ error: () => {} });
        this.getFormationsFiliere().subscribe({ error: () => {} });
        this.getCertificats().subscribe({ error: () => {} });
        break;
      case 'CERTIFICAT_EMIS':
        localStorage.removeItem(this.CACHE_KEYS.CERTIFICATS);
        localStorage.removeItem(this.CACHE_KEYS.DASHBOARD);
        localStorage.removeItem(this.CACHE_KEYS.FORMATIONS);
        this.getCertificats().subscribe({ error: () => {} });
        break;
      case 'SEANCE_UPDATE':
      case 'ASSIDUITE_UPDATE':
        localStorage.removeItem(this.CACHE_KEYS.DASHBOARD);
        localStorage.removeItem(this.CACHE_KEYS.SEANCES);
        localStorage.removeItem(this.CACHE_KEYS.ASSIDUITE);
        this.getSeances().subscribe({ error: () => {} });
        this.getAssiduite().subscribe({ error: () => {} });
        break;
      case 'DEMANDE_REGULARISATION':
      case 'REGULARISATION_DECISION':
      case 'DOCUMENT_REGULARISATION_SOUMIS':
      case 'DOSSIER_DOCUMENT_AJOUTE':
        localStorage.removeItem(this.CACHE_KEYS.DOSSIER);
        this.getDossier().subscribe({ error: () => {} });
        break;
      default:
        this.invalidateCache();
    }

    // 2. Relayer l'événement aux composants abonnés
    this.liveUpdates$.next(event);

    // 3. Recharger le dashboard en arrière-plan (silencieusement)
    this.getDashboard().subscribe({ error: () => {} });
  }

  /** Invalide uniquement les caches d'arborescence de modules. */
  private invalidateModulesCache(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_KEYS.MODULES_PREFIX)) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  /**
   * Helper pour lire en toute sécurité depuis le localStorage
   */
  private getLocal<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /**
   * Helper pour écrire dans le localStorage
   */
  private setLocal<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  /**
   * Retourne immédiatement l'instantané du Dashboard en cache (0ms - aucun chargement)
   */
  getDashboardSnapshot(): ApprenantDashboard | null {
    return this.getLocal<ApprenantDashboard>(this.CACHE_KEYS.DASHBOARD);
  }

  /**
   * Retourne immédiatement l'instantané des Formations en cache (0ms)
   */
  getFormationsSnapshot(): ApprenantFormation[] | null {
    return this.getLocal<ApprenantFormation[]>(this.CACHE_KEYS.FORMATIONS);
  }

  /**
   * Retourne immédiatement l'instantané des Modules d'une formation en cache (0ms)
   */
  getFormationModulesSnapshot(formationId: string): FormationArborescence | null {
    return this.getLocal<FormationArborescence>(this.CACHE_KEYS.MODULES_PREFIX + formationId);
  }

  /**
   * Retourne immédiatement l'instantané des Devoirs en cache (0ms)
   */
  getDevoirsSnapshot(): any[] | null {
    return this.getLocal<any[]>(this.CACHE_KEYS.DEVOIRS);
  }

  /**
   * Retourne immédiatement l'instantané des Certificats en cache (0ms)
   */
  getCertificatsSnapshot(): ApprenantCertificat[] | null {
    return this.getLocal<ApprenantCertificat[]>(this.CACHE_KEYS.CERTIFICATS);
  }

  /**
   * Retourne immédiatement l'instantané d'un Quiz en cache local (0ms - transition instantanée)
   */
  getQuizSnapshot(quizId: string): QuizDetail | null {
    return this.getLocal<QuizDetail>(this.CACHE_KEYS.QUIZ_PREFIX + quizId);
  }

  /**
   * Retourne immédiatement l'instantané de la liste des Quiz en cache local (0ms)
   */
  /**
   * Retourne immédiatement l'instantané de la liste des Quiz en cache local (0ms)
   */
  getAllQuizSnapshot(): ApprenantQuizItem[] | null {
    return this.getLocal<ApprenantQuizItem[]>(this.CACHE_KEYS.QUIZ_LIST);
  }

  /**
   * Retourne immédiatement l'instantané des Séances / Planning en cache local (0ms)
   */
  getSeancesSnapshot(): ApprenantSeanceItem[] | null {
    return this.getLocal<ApprenantSeanceItem[]>(this.CACHE_KEYS.SEANCES);
  }

  /**
   * Retourne immédiatement l'instantané des métriques d'Assiduité en cache local (0ms)
   */
  getAssiduiteSnapshot(): ApprenantAssiduite | null {
    return this.getLocal<ApprenantAssiduite>(this.CACHE_KEYS.ASSIDUITE);
  }

  /**
   * Retourne immédiatement l'instantané du Dossier administratif en cache local (0ms)
   */
  getDossierSnapshot(): ApprenantDossierData | null {
    return this.getLocal<ApprenantDossierData>(this.CACHE_KEYS.DOSSIER);
  }

  /**
   * Retourne immédiatement l'instantané du Profil enrichi avec Matricule en cache (0ms)
   */
  getProfileSnapshot(): ApprenantProfileInfo | null {
    return this.getLocal<ApprenantProfileInfo>(this.CACHE_KEYS.PROFILE);
  }

  /**
   * Retourne immédiatement l'instantané du Bundle Bootstrap complet en cache (0ms)
   */
  getBootstrapSnapshot(): ApprenantBootstrapData | null {
    return this.getLocal<ApprenantBootstrapData>(this.CACHE_KEYS.BOOTSTRAP);
  }

  /**
   * Récupère l'intégralité des données apprenant en UNE SEULE requête parallèle (Bootstrap).
   * Peuple immédiatement l'ensemble des caches des 7 sous-modules.
   */
  getBootstrap(forceRefresh = false): Observable<ApprenantBootstrapData> {
    const cached = this.getBootstrapSnapshot();
    if (cached && !forceRefresh) {
      this.bootstrap$.next(cached);
    }
    return this.http.get<ApprenantBootstrapData>(`${this.apiUrl}/bootstrap`).pipe(
      tap((data) => {
        this.setLocal(this.CACHE_KEYS.BOOTSTRAP, data);
        if (data.profile) this.setLocal(this.CACHE_KEYS.PROFILE, data.profile);
        if (data.dashboard) this.setLocal(this.CACHE_KEYS.DASHBOARD, data.dashboard);
        if (data.formations) this.setLocal(this.CACHE_KEYS.FORMATIONS, data.formations);
        if (data.devoirs) this.setLocal(this.CACHE_KEYS.DEVOIRS, data.devoirs);
        if (data.quiz) this.setLocal(this.CACHE_KEYS.QUIZ_LIST, data.quiz);
        if (data.seances) this.setLocal(this.CACHE_KEYS.SEANCES, data.seances);
        if (data.assiduite) this.setLocal(this.CACHE_KEYS.ASSIDUITE, data.assiduite);
        if (data.certificats) this.setLocal(this.CACHE_KEYS.CERTIFICATS, data.certificats);
        if (data.dossier) this.setLocal(this.CACHE_KEYS.DOSSIER, data.dossier);
        if (data.candidatures) this.setLocal(this.CACHE_KEYS.VOEUX, data.candidatures);
        if (data.formationsFiliere) this.setLocal(this.CACHE_KEYS.FORMATIONS_FILIERE, data.formationsFiliere);
        this.bootstrap$.next(data);
      }),
      shareReplay(1),
    );
  }

  /**
   * Préchauffe de manière transparente toutes les données de l'apprenant en tâche de fond.
   * Utilise désormais l'endpoint unique Bootstrap (1 seule requête HTTP).
   */
  preloadAllLearnerData(): void {
    this.getBootstrap().subscribe({ error: () => {} });
  }

  /**
   * Invalide de façon ciblée le cache local selon le besoin sans détruire les autres sous-modules
   */
  invalidateCache(targetKeys?: string[]) {
    try {
      if (targetKeys && targetKeys.length > 0) {
        targetKeys.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem(this.CACHE_KEYS.BOOTSTRAP);
        localStorage.removeItem(this.CACHE_KEYS.FORMATIONS_FILIERE);
        return;
      }
      localStorage.removeItem(this.CACHE_KEYS.BOOTSTRAP);
      localStorage.removeItem(this.CACHE_KEYS.DASHBOARD);
      localStorage.removeItem(this.CACHE_KEYS.FORMATIONS);
      localStorage.removeItem(this.CACHE_KEYS.FORMATIONS_FILIERE);
      localStorage.removeItem(this.CACHE_KEYS.CERTIFICATS);
      localStorage.removeItem(this.CACHE_KEYS.DEVOIRS);
      localStorage.removeItem(this.CACHE_KEYS.QUIZ_LIST);
      localStorage.removeItem(this.CACHE_KEYS.SEANCES);
      localStorage.removeItem(this.CACHE_KEYS.ASSIDUITE);
      localStorage.removeItem(this.CACHE_KEYS.DOSSIER);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(this.CACHE_KEYS.MODULES_PREFIX) || key.startsWith(this.CACHE_KEYS.QUIZ_PREFIX))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  getDashboard(): Observable<ApprenantDashboard> {
    return this.http.get<ApprenantDashboard>(`${this.apiUrl}/dashboard`).pipe(
      tap((data) => this.setLocal(this.CACHE_KEYS.DASHBOARD, data)),
      shareReplay(1),
    );
  }

  getFormations(): Observable<ApprenantFormation[]> {
    return this.http.get<ApprenantFormation[]>(`${this.apiUrl}/formations`).pipe(
      tap((data) => this.setLocal(this.CACHE_KEYS.FORMATIONS, data)),
      shareReplay(1),
    );
  }

  getFormationsFiliere(forceRefresh = false): Observable<FormationsFiliereResponse> {
    if (!forceRefresh) {
      const cached = this.getLocal<FormationsFiliereResponse>(this.CACHE_KEYS.FORMATIONS_FILIERE);
      if (cached) return of(cached);
    }
    return this.http.get<FormationsFiliereResponse>(`${this.apiUrl}/formations-filiere`).pipe(
      tap((data) => this.setLocal(this.CACHE_KEYS.FORMATIONS_FILIERE, data)),
      shareReplay(1),
    );
  }

  getFormationsFiliereSnapshot(): FormationsFiliereResponse | null {
    return this.getLocal<FormationsFiliereResponse>(this.CACHE_KEYS.FORMATIONS_FILIERE);
  }

  getFormationModules(formationId: string): Observable<FormationArborescence> {
    return this.http.get<FormationArborescence>(`${this.apiUrl}/formations/${formationId}/modules`).pipe(
      tap((data) => this.setLocal(this.CACHE_KEYS.MODULES_PREFIX + formationId, data)),
      shareReplay(1),
    );
  }

  getEligibiliteCertificat(formationId: string): Observable<EligibiliteCertificat> {
    return this.http.get<EligibiliteCertificat>(`${this.apiUrl}/formations/${formationId}/eligibilite-certificat`).pipe(
      map((res) => ({
        ...res,
        certificat: res.certificat
          ? {
              ...res.certificat,
              urlPdfS3: this.resolveFileUrl(res.certificat.urlPdfS3),
            }
          : null,
      })),
      shareReplay(1),
    );
  }

  getCoursContenu(coursId: string): Observable<CoursContenu> {
    return this.http.get<CoursContenu>(`${this.apiUrl}/cours/${coursId}/contenu`).pipe(
      map((c) => ({
        ...c,
        fileUrl: c.fileUrl ? this.resolveFileUrl(c.fileUrl) : null,
      }))
    );
  }

  markCoursProgression(coursId: string): Observable<any> {
    this.invalidateCache([this.CACHE_KEYS.DASHBOARD, this.CACHE_KEYS.FORMATIONS]);
    this.invalidateModulesCache();
    return this.http.post<any>(`${this.apiUrl}/cours/${coursId}/progression`, {}).pipe(
      tap((res) => {
        this.liveUpdates$.next({
          type: 'COURS_COMPLETED',
          title: 'Cours complété',
          message: 'Votre progression a été synchronisée en temps réel',
          data: { coursId, ...res },
        } as any);
      }),
    );
  }

  getQuiz(quizId: string): Observable<QuizDetail> {
    return this.http.get<QuizDetail>(`${this.apiUrl}/quiz/${quizId}`).pipe(
      tap((data) => this.setLocal(this.CACHE_KEYS.QUIZ_PREFIX + quizId, data)),
      shareReplay(1),
    );
  }

  submitQuiz(quizId: string, reponses: { questionId: string; selectedIndex: number }[]): Observable<QuizSubmissionResult> {
    this.invalidateCache([this.CACHE_KEYS.DASHBOARD, this.CACHE_KEYS.QUIZ_LIST, this.CACHE_KEYS.QUIZ_PREFIX + quizId]);
    this.invalidateModulesCache();
    return this.http.post<QuizSubmissionResult>(`${this.apiUrl}/quiz/${quizId}/soumettre`, { reponses }).pipe(
      tap((res) => {
        this.liveUpdates$.next({
          type: 'QUIZ_SUBMITTED',
          title: 'Quiz validé',
          message: `Résultat enregistré : ${res.score}% (${res.bonnesReponses}/${res.totalQuestions})`,
          data: { quizId, ...res },
        } as any);
      }),
    );
  }

  deposerDevoir(devoirId: string, file: File): Observable<any> {
    this.invalidateCache([this.CACHE_KEYS.DASHBOARD, this.CACHE_KEYS.DEVOIRS]);
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/devoirs/${devoirId}/deposer`, formData).pipe(
      map((res) => ({
        ...res,
        fileUrl: res.fileUrl ? this.resolveFileUrl(res.fileUrl) : null,
      })),
      tap((res) => {
        this.liveUpdates$.next({
          type: 'DEVOIR_DEPOSE',
          title: 'Devoir transmis',
          message: 'Votre devoir a été déposé avec succès',
          data: { devoirId, ...res },
        } as any);
      }),
    );
  }

  /**
   * Récupère tous les devoirs en UNE SEULE requête (endpoint agrégé backend)
   */
  getAllDevoirs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/devoirs`).pipe(
      map((list) =>
        list.map((d) => ({
          ...d,
          soumission: d.soumission
            ? {
                ...d.soumission,
                fileUrl: d.soumission.fileUrl ? this.resolveFileUrl(d.soumission.fileUrl) : null,
              }
            : null,
        }))
      ),
      tap((data) => this.setLocal(this.CACHE_KEYS.DEVOIRS, data)),
      shareReplay(1),
    );
  }

  /**
   * Récupère tous les quiz de l'apprenant en UNE SEULE requête (endpoint agrégé backend)
   */
  getAllQuiz(): Observable<ApprenantQuizItem[]> {
    return this.http.get<ApprenantQuizItem[]>(`${this.apiUrl}/quiz`).pipe(
      tap((data) => this.setLocal(this.CACHE_KEYS.QUIZ_LIST, data)),
      shareReplay(1),
    );
  }

  /**
   * Résout les URLs de fichiers locaux (/uploads/...) vers le backend NestJS.
   * En mode local, les fichiers sont servis par NestJS, pas Angular.
   */
  private resolveFileUrl(url: string): string {
    if (url && url.startsWith('/uploads/')) {
      // Mode stockage local : préfixer avec l'URL de base du backend
      const backendBase = environment.apiUrl.replace('/api', '');
      return `${backendBase}${url}`;
    }
    return url; // URL S3 absolue : inchangée
  }

  getCertificats(): Observable<ApprenantCertificat[]> {
    return this.http.get<ApprenantCertificat[]>(`${this.apiUrl}/certificats`).pipe(
      map((data) =>
        data.map((c) => ({
          ...c,
          urlPdfS3: this.resolveFileUrl(c.urlPdfS3),
        }))
      ),
      tap((data) => this.setLocal(this.CACHE_KEYS.CERTIFICATS, data)),
      shareReplay(1),
    );
  }

  telechargerCertificat(certificatId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/certificats/${certificatId}/telecharger`, {
      responseType: 'blob',
    });
  }

  /**
   * Récupère la liste des séances / cours en direct pour l'apprenant
   */
  getSeances(): Observable<ApprenantSeanceItem[]> {
    return this.http.get<ApprenantSeanceItem[]>(`${this.apiUrl}/seances`).pipe(
      tap((data) => this.setLocal(this.CACHE_KEYS.SEANCES, data)),
      shareReplay(1),
    );
  }

  /**
   * Récupère les métriques d'assiduité officielle de l'apprenant
   */
  getAssiduite(): Observable<ApprenantAssiduite> {
    return this.http.get<ApprenantAssiduite>(`${this.apiUrl}/assiduite`).pipe(
      tap((data) => this.setLocal(this.CACHE_KEYS.ASSIDUITE, data)),
      shareReplay(1),
    );
  }

  /**
   * Récupère le relevé de notes officiel de la formation
   */
  getReleveNotes(formationId: string): Observable<ReleveNotesBulletin> {
    return this.http.get<ReleveNotesBulletin>(`${this.apiUrl}/formations/${formationId}/releve-notes`).pipe(
      shareReplay(1),
    );
  }

  /**
   * Récupère le dossier administratif et les demandes de régularisation
   */
  getDossier(): Observable<ApprenantDossierData> {
    return this.http.get<ApprenantDossierData>(`${this.apiUrl}/dossier`).pipe(
      map((res) => ({
        ...res,
        documents: (res.documents || []).map((d) => ({
          ...d,
          fileUrl: d.fileUrl ? this.resolveFileUrl(d.fileUrl) : null,
        })),
      })),
      tap((data) => this.setLocal(this.CACHE_KEYS.DOSSIER, data)),
      shareReplay(1),
    );
  }

  /**
   * Téléverse un document administratif
   */
  uploadDocumentDossier(file: File, typeDocument: string, titre: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('typeDocument', typeDocument);
    formData.append('titre', titre);
    return this.http.post<any>(`${this.apiUrl}/dossier/upload`, formData).pipe(
      tap(() => {
        this.liveUpdates$.next({
          type: 'DOSSIER_DOCUMENT_AJOUTE',
          title: 'Pièce déposée',
          message: 'Document ajouté à votre dossier administratif',
        } as any);
      }),
    );
  }

  /**
   * Répond à une demande de régularisation administrative
   */
  repondreRegularisation(regularisationId: string, file?: File, commentaire?: string): Observable<any> {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (commentaire) formData.append('commentaire', commentaire);
    return this.http.post<any>(`${this.apiUrl}/dossier/regularisation/${regularisationId}/repondre`, formData).pipe(
      tap(() => {
        this.liveUpdates$.next({
          type: 'DOCUMENT_REGULARISATION_SOUMIS',
          title: 'Régularisation transmise',
          message: 'Les pièces demandées ont été transmises avec succès',
        } as any);
      }),
    );
  }

  /**
   * Met à jour les informations du profil apprenant (synchronise Utilisateur + Apprenant)
   */
  updateProfile(dto: { nom?: string; prenom?: string; telephone?: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/profil`, dto).pipe(
      tap((res) => {
        const snap = this.getProfileSnapshot();
        if (snap) {
          const updated = { ...snap, ...res };
          this.setLocal(this.CACHE_KEYS.PROFILE, updated);
        }
        this.invalidateCache([this.CACHE_KEYS.BOOTSTRAP, this.CACHE_KEYS.PROFILE]);
      }),
    );
  }

  /**
   * Déclenche la délivrance du certificat officiel pour une formation si éligible (Règle BR-03)
   */
  genererCertificat(formationId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/formations/${formationId}/generer-certificat`, {}).pipe(
      tap(() => {
        this.invalidateCache([this.CACHE_KEYS.CERTIFICATS, this.CACHE_KEYS.DASHBOARD, this.CACHE_KEYS.FORMATIONS]);
        this.liveUpdates$.next({
          type: 'CERTIFICAT_EMIS',
          title: 'Certificat officiel émis',
          message: 'Votre certificat officiel a été émis avec succès.',
        } as any);
      }),
    );
  }
}

