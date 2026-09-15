import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Formation, Cours, Evaluation, Utilisateur, ProgressInfo, Module, FiliereSuiviItem, FiliereSuiviDetail } from '../models';

@Injectable({ providedIn: 'root' })
export class PedagogieService {
  private url = `${environment.apiUrl}/pedagogie`;

  // Cache persistant de session (survit à la navigation entre onglets, affichage 0ms)
  private filieresSuiviSubject = new BehaviorSubject<FiliereSuiviItem[] | null>(null);
  public filieresSuivi$ = this.filieresSuiviSubject.asObservable();

  private cacheTime = 0;
  private readonly TTL = 180_000; // 3 minutes de validité
  private inFlight$: Observable<FiliereSuiviItem[]> | null = null;

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

  invalidateCache(): void {
    this.cacheTime = 0;
    this.filieresSuiviSubject.next(null);
  }

  getFiliereSuiviDetail(id: string): Observable<FiliereSuiviDetail> {
    return this.http.get<FiliereSuiviDetail>(`${this.url}/filieres-suivi/${id}`);
  }

  getFormations(): Observable<Formation[]> {
    return this.http.get<Formation[]>(`${this.url}/formations`);
  }

  getFormation(id: string): Observable<Formation> {
    return this.http.get<Formation>(`${this.url}/formations/${id}`);
  }

  createFormation(data: { titre: string; description?: string; etablissementId?: string; formationReferentielId?: string }): Observable<Formation> {
    return this.http.post<Formation>(`${this.url}/formations`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  updateFormation(id: string, data: { titre?: string; description?: string }): Observable<Formation> {
    return this.http.put<Formation>(`${this.url}/formations/${id}`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteFormation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/formations/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  createModule(formationId: string, data: { titre: string; coefficient?: number }): Observable<Module> {
    return this.http.post<Module>(`${this.url}/formations/${formationId}/modules`, data);
  }

  createCours(moduleId: string, data: { titre: string; contenu?: string }): Observable<Cours> {
    return this.http.post<Cours>(`${this.url}/modules/${moduleId}/cours`, data);
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
    return this.http.post<Cours>(`${this.url}/cours/${coursId}/upload`, form);
  }

  getProgress(formationId: string, apprenantId?: string): Observable<ProgressInfo> {
    const params = apprenantId ? `?apprenantId=${apprenantId}` : '';
    return this.http.get<ProgressInfo>(`${this.url}/formations/${formationId}/progress${params}`);
  }

  getApprenants(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(`${this.url}/apprenants`);
  }

  createEvaluation(moduleId: string, data: { titre: string; noteMaximale?: number }): Observable<Evaluation> {
    return this.http.post<Evaluation>(`${this.url}/modules/${moduleId}/evaluations`, data);
  }

  getEvaluations(moduleId: string): Observable<Evaluation[]> {
    return this.http.get<Evaluation[]>(`${this.url}/modules/${moduleId}/evaluations`);
  }

  submitNote(evaluationId: string, utilisateurId: string, valeur: number): Observable<unknown> {
    return this.http.post(`${this.url}/evaluations/${evaluationId}/notes`, { utilisateurId, valeur });
  }

  updateModule(id: string, data: { titre?: string; coefficient?: number }): Observable<Module> {
    return this.http.put<Module>(`${this.url}/modules/${id}`, data);
  }

  deleteModule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/modules/${id}`);
  }

  updateCours(id: string, data: { titre?: string; contenu?: string }): Observable<Cours> {
    return this.http.put<Cours>(`${this.url}/cours/${id}`, data);
  }

  deleteCours(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/cours/${id}`);
  }

  updateEvaluation(id: string, data: { titre?: string; noteMaximale?: number }): Observable<Evaluation> {
    return this.http.put<Evaluation>(`${this.url}/evaluations/${id}`, data);
  }

  deleteEvaluation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/evaluations/${id}`);
  }
}
