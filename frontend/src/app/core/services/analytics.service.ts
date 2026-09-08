import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { KpiGlobal, KpiEtablissement } from '../models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private url = `${environment.apiUrl}/analytics`;
  
  // Cache persistant de session (survit à la navigation entre onglets)
  private globalDetailedSubject = new BehaviorSubject<any | null>(null);
  public globalDetailed$ = this.globalDetailedSubject.asObservable();

  private cacheTime = 0;
  private readonly TTL = 300_000; // 5 minutes de validité
  private inFlightDetailed$: Observable<any> | null = null;

  constructor(private http: HttpClient) {}

  getGlobal(): Observable<KpiGlobal> {
    return this.http.get<KpiGlobal>(`${this.url}/global`);
  }

  /**
   * Récupération cockpit détaillé :
   * - 0 ms si déjà en mémoire (retour immédiat)
   * - Déduplication stricte des requêtes en vol (partage unique via shareReplay)
   * - Revalidation transparente
   */
  getGlobalDetailed(forceRefresh = false): Observable<any> {
    const current = this.globalDetailedSubject.value;
    const isFresh = current && (Date.now() - this.cacheTime < this.TTL);

    if (!forceRefresh && isFresh) {
      return of(current);
    }

    // Si une requête HTTP identique est déjà en cours d'exécution, la réutiliser
    if (this.inFlightDetailed$) {
      return this.inFlightDetailed$;
    }

    this.inFlightDetailed$ = this.http.get<any>(`${this.url}/global/detailed`).pipe(
      tap((data) => {
        this.cacheTime = Date.now();
        this.globalDetailedSubject.next(data);
      }),
      shareReplay(1),
      finalize(() => {
        this.inFlightDetailed$ = null;
      })
    );

    return this.inFlightDetailed$;
  }

  /**
   * Retourne la dernière donnée connue immédiatement (synchrone, 0ms)
   */
  getCached(): any | null {
    return this.globalDetailedSubject.value;
  }

  exportGlobalCsv(): Observable<Blob> {
    return this.http.get(`${this.url}/global/export`, { responseType: 'blob' });
  }

  getEtablissement(id: string): Observable<KpiEtablissement> {
    return this.http.get<KpiEtablissement>(`${this.url}/etablissement/${id}`);
  }

  getEtablissementDashboardDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.url}/etablissement/${id}/dashboard-details`);
  }

  getFormation(id: string): Observable<unknown> {
    return this.http.get(`${this.url}/formation/${id}`);
  }

  clearCache() {
    this.globalDetailedSubject.next(null);
    this.cacheTime = 0;
    this.inFlightDetailed$ = null;
  }
}
