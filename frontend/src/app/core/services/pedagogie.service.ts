import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Formation, Cours, Evaluation, Utilisateur, ProgressInfo, Module, FiliereSuiviItem, FiliereSuiviDetail, CategorieFormation, FiliereReferentiel } from '../models';

@Injectable({ providedIn: 'root' })
export class PedagogieService {
  private url = `${environment.apiUrl}/pedagogie`;

  // Cache persistant de session (survit à la navigation entre onglets, affichage 0ms)
  private filieresSuiviSubject = new BehaviorSubject<FiliereSuiviItem[] | null>(null);
  public filieresSuivi$ = this.filieresSuiviSubject.asObservable();

  private cacheTime = 0;
  private readonly TTL = 180_000; // 3 minutes de validité
  private inFlight$: Observable<FiliereSuiviItem[]> | null = null;

  // Cache formations (même pattern : BehaviorSubject + TTL, affichage instantané 0ms)
  private formationsSubject = new BehaviorSubject<Formation[] | null>(null);
  public formations$ = this.formationsSubject.asObservable();
  private formationsCacheTime = 0;
  private readonly FORMATIONS_TTL = 180_000; // 3 minutes
  private formationsInFlight$: Observable<Formation[]> | null = null;

  constructor(private http: HttpClient) {}

  getFilieresSuivi(
    params?: { etablissementId?: string; statut?: string; search?: string },
    forceRefresh = false
  ): Observable<FiliereSuiviItem[]> {
    const isBaseQuery = !params?.statut && !params?.search;
    const current = this.filieresSuiviSubject.value;
    const isFresh = current && (Date.now() - this.cacheTime < this.TTL);

    // Si pas de filtre de recherche/statut et données fraîches en cache, retour immédiat (0ms)
    if (isBaseQuery && !forceRefresh && isFresh) {
      if (!params?.etablissementId || params.etablissementId === 'ALL') {
        return of(current);
      }
      return of(current.filter((f) => f.etablissementId === params.etablissementId));
    }

    if (isBaseQuery && !forceRefresh && this.inFlight$) {
      return this.inFlight$;
    }

    let query = '';
    if (params) {
      const q = new URLSearchParams();
      if (params.etablissementId) q.set('etablissementId', params.etablissementId);
      if (params.statut) q.set('statut', params.statut);
      if (params.search) q.set('search', params.search);
      const str = q.toString();
      if (str) query = `?${str}`;
    }

    const req$ = this.http.get<FiliereSuiviItem[]>(`${this.url}/filieres-suivi${query}`).pipe(
      tap((data) => {
        if (isBaseQuery && (!params?.etablissementId || params.etablissementId === 'ALL')) {
          this.cacheTime = Date.now();
          this.filieresSuiviSubject.next(data);
        }
      }),
      shareReplay(1),
      finalize(() => {
        if (isBaseQuery) this.inFlight$ = null;
      })
    );

    if (isBaseQuery) {
      this.inFlight$ = req$;
    }

    return req$;
  }

  getCachedFilieres(): FiliereSuiviItem[] | null {
    return this.filieresSuiviSubject.value;
  }

  // Cache détail formation (par ID) pour ouverture instantanée 0ms
  private formationDetailCache = new Map<string, { data: Formation; time: number }>();
  private readonly DETAIL_TTL = 180_000; // 3 minutes

  invalidateCache(): void {
    this.cacheTime = 0;
    this.filieresSuiviSubject.next(null);
    this.invalidateFormationsCache();
  }

  invalidateFormationsCache(): void {
    this.formationsCacheTime = 0;
    this.formationsSubject.next(null);
    this.formationDetailCache.clear();
  }

  getCachedFormation(id: string): Formation | null {
    const cached = this.formationDetailCache.get(id);
    if (cached && Date.now() - cached.time < this.DETAIL_TTL) {
      return cached.data;
    }
    const list = this.formationsSubject.value;
    if (list) {
      const found = list.find((f) => f.id === id);
      if (found) return found;
    }
    return null;
  }

  getFiliereSuiviDetail(id: string): Observable<FiliereSuiviDetail> {
    return this.http.get<FiliereSuiviDetail>(`${this.url}/filieres-suivi/${id}`);
  }

  getFormations(
    params?: { search?: string; filiereId?: string; etablissementId?: string; categorie?: string; publieSurLanding?: string; actif?: string },
    forceRefresh = false
  ): Observable<Formation[]> {
    const isBaseQuery = !params?.search && !params?.filiereId && (!params?.etablissementId || params.etablissementId === 'ALL') && !params?.categorie && !params?.publieSurLanding && !params?.actif;
    const current = this.formationsSubject.value;
    const isFresh = current && (Date.now() - this.formationsCacheTime < this.FORMATIONS_TTL);

    if (isBaseQuery && !forceRefresh && isFresh) {
      return of(current);
    }

    if (isBaseQuery && !forceRefresh && this.formationsInFlight$) {
      return this.formationsInFlight$;
    }

    let query = '';
    if (params) {
      const q = new URLSearchParams();
      if (params.search) q.set('search', params.search);
      if (params.filiereId) q.set('filiereId', params.filiereId);
      if (params.etablissementId) q.set('etablissementId', params.etablissementId);
      if (params.categorie) q.set('categorie', params.categorie);
      if (params.publieSurLanding !== undefined) q.set('publieSurLanding', params.publieSurLanding);
      if (params.actif !== undefined) q.set('actif', params.actif);
      const str = q.toString();
      if (str) query = `?${str}`;
    }

    const req$ = this.http.get<Formation[]>(`${this.url}/formations${query}`).pipe(
      tap((data) => {
        if (isBaseQuery) {
          this.formationsCacheTime = Date.now();
          this.formationsSubject.next(data);
          // Pré-remplir le cache détail pour chacune des formations listées
          for (const f of data) {
            if (!this.formationDetailCache.has(f.id)) {
              this.formationDetailCache.set(f.id, { data: f, time: Date.now() });
            }
          }
        }
      }),
      shareReplay(1),
      finalize(() => {
        if (isBaseQuery) this.formationsInFlight$ = null;
      })
    );

    if (isBaseQuery) {
      this.formationsInFlight$ = req$;
    }

    return req$;
  }

  getFormation(id: string, forceRefresh = false): Observable<Formation> {
    const cached = this.formationDetailCache.get(id);
    const isFresh = cached && (Date.now() - cached.time < this.DETAIL_TTL);

    // Si on a les détails complets (avec modules et cours) et pas de forceRefresh, retour immédiat (0ms)
    if (!forceRefresh && isFresh && cached.data.modules !== undefined) {
      return of(cached.data);
    }

    return this.http.get<Formation>(`${this.url}/formations/${id}`).pipe(
      tap((data) => {
        this.formationDetailCache.set(id, { data, time: Date.now() });
      }),
      shareReplay(1)
    );
  }

  createFormation(data: Partial<Formation>): Observable<Formation> {
    return this.http.post<Formation>(`${this.url}/formations`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateFormation(id: string, data: Partial<Formation>): Observable<Formation> {
    return this.http.put<Formation>(`${this.url}/formations/${id}`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  toggleLanding(id: string): Observable<Formation> {
    return this.http.patch<Formation>(`${this.url}/formations/${id}/toggle-landing`, {}).pipe(
      tap(() => this.invalidateCache())
    );
  }

  toggleUne(id: string): Observable<Formation> {
    return this.http.patch<Formation>(`${this.url}/formations/${id}/toggle-une`, {}).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteFormation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/formations/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  getReferentielFilieres(all = true): Observable<FiliereReferentiel[]> {
    return this.http.get<FiliereReferentiel[]>(`${environment.apiUrl}/referentiel/filieres?all=${all}`);
  }

  createFiliere(data: { code: string; libelle: string; description?: string; ordre?: number }): Observable<FiliereReferentiel> {
    return this.http.post<FiliereReferentiel>(`${environment.apiUrl}/referentiel/filieres`, data);
  }

  updateFiliere(id: string, data: Partial<{ code: string; libelle: string; description?: string; ordre?: number; actif?: boolean }>): Observable<FiliereReferentiel> {
    return this.http.put<FiliereReferentiel>(`${environment.apiUrl}/referentiel/filieres/${id}`, data);
  }

  deleteFiliere(id: string): Observable<{ message: string; deleted?: boolean; deactivated?: boolean }> {
    return this.http.delete<{ message: string; deleted?: boolean; deactivated?: boolean }>(`${environment.apiUrl}/referentiel/filieres/${id}`);
  }

  getReferentielFormations(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/referentiel/formations`);
  }

  createModule(formationId: string, data: { titre: string; coefficient?: number }): Observable<Module> {
    return this.http.post<Module>(`${this.url}/formations/${formationId}/modules`, data).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  createCours(moduleId: string, data: { titre: string; contenu?: string }): Observable<Cours> {
    return this.http.post<Cours>(`${this.url}/modules/${moduleId}/cours`, data).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  getCours(id: string): Observable<Cours> {
    return this.http.get<Cours>(`${this.url}/cours/${id}`);
  }

  markComplete(coursId: string): Observable<unknown> {
    return this.http.post(`${this.url}/cours/${coursId}/complete`, {});
  }

  uploadCoursFile(coursId: string, file: File): Observable<Cours> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Cours>(`${this.url}/cours/${coursId}/upload`, form).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  getProgress(formationId: string, apprenantId?: string): Observable<ProgressInfo> {
    const params = apprenantId ? `?apprenantId=${apprenantId}` : '';
    return this.http.get<ProgressInfo>(`${this.url}/formations/${formationId}/progress${params}`);
  }

  getApprenants(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(`${this.url}/apprenants`);
  }

  createEvaluation(moduleId: string, data: { titre: string; noteMaximale?: number }): Observable<Evaluation> {
    return this.http.post<Evaluation>(`${this.url}/modules/${moduleId}/evaluations`, data).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  getEvaluations(moduleId: string): Observable<Evaluation[]> {
    return this.http.get<Evaluation[]>(`${this.url}/modules/${moduleId}/evaluations`);
  }

  submitNote(evaluationId: string, utilisateurId: string, valeur: number): Observable<unknown> {
    return this.http.post(`${this.url}/evaluations/${evaluationId}/notes`, { utilisateurId, valeur }).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  updateModule(id: string, data: { titre?: string; coefficient?: number }): Observable<Module> {
    return this.http.put<Module>(`${this.url}/modules/${id}`, data).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  deleteModule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/modules/${id}`).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  updateCours(id: string, data: { titre?: string; contenu?: string }): Observable<Cours> {
    return this.http.put<Cours>(`${this.url}/cours/${id}`, data).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  deleteCours(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/cours/${id}`).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  updateEvaluation(id: string, data: { titre?: string; noteMaximale?: number }): Observable<Evaluation> {
    return this.http.put<Evaluation>(`${this.url}/evaluations/${id}`, data).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  deleteEvaluation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/evaluations/${id}`).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  // ====================================
  // CATEGORIES DE FORMATION
  // ====================================
  getCategories(includeInactive = false): Observable<CategorieFormation[]> {
    return this.http.get<CategorieFormation[]>(`${this.url}/categories?includeInactive=${includeInactive}`);
  }

  createCategorie(data: Partial<CategorieFormation>): Observable<CategorieFormation> {
    return this.http.post<CategorieFormation>(`${this.url}/categories`, data);
  }

  updateCategorie(id: string, data: Partial<CategorieFormation>): Observable<CategorieFormation> {
    return this.http.put<CategorieFormation>(`${this.url}/categories/${id}`, data);
  }

  deleteCategorie(id: string): Observable<{ success: boolean; deactivated?: boolean; message: string }> {
    return this.http.delete<{ success: boolean; deactivated?: boolean; message: string }>(`${this.url}/categories/${id}`);
  }

  // ====================================
  // DÉPLOIEMENT & ATTRIBUTION DIRECTE
  // ====================================
  deployerFormation(formationId: string, etablissementIds: string[]): Observable<{ success: boolean; message: string; nbEtablissements: number }> {
    return this.http.post<{ success: boolean; message: string; nbEtablissements: number }>(
      `${this.url}/formations/${formationId}/deployer`,
      { etablissementIds }
    ).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  getInscriptionsByFormation(formationId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/inscriptions/formation/${formationId}`);
  }

  inscrireApprenant(data: { apprenantId: string; formationId: string; sessionId?: string; statut?: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/inscriptions`, data).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }

  desinscrireApprenant(inscriptionId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/inscriptions/${inscriptionId}`).pipe(
      tap(() => this.invalidateFormationsCache())
    );
  }
}

