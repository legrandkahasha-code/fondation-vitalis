import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Seance, Utilisateur, Presence } from '../models';

@Injectable({ providedIn: 'root' })
export class SeancesService {
  private url = `${environment.apiUrl}/seances`;

  // Cache séances (affichage instantané 0ms lors des navigations)
  private seancesSubject = new BehaviorSubject<Seance[] | null>(null);
  public seances$ = this.seancesSubject.asObservable();
  private seancesCacheTime = 0;
  private readonly TTL = 120_000; // 2 minutes
  private seancesInFlight$: Observable<Seance[]> | null = null;

  // Cache synthèse assiduité par établissement
  private assiduiteCacheMap = new Map<string, { data: any[]; time: number }>();
  private readonly ASSIDUITE_TTL = 120_000; // 2 minutes
  private assiduiteInFlightMap = new Map<string, Observable<any[]>>();

  constructor(private http: HttpClient) {}

  getAll(forceRefresh = false): Observable<Seance[]> {
    const current = this.seancesSubject.value;
    const isFresh = current && (Date.now() - this.seancesCacheTime < this.TTL);

    if (!forceRefresh && isFresh) {
      return of(current);
    }

    if (!forceRefresh && this.seancesInFlight$) {
      return this.seancesInFlight$;
    }

    this.seancesInFlight$ = this.http.get<Seance[]>(this.url).pipe(
      tap((data) => {
        this.seancesCacheTime = Date.now();
        this.seancesSubject.next(data);
      }),
      shareReplay(1),
      finalize(() => {
        this.seancesInFlight$ = null;
      })
    );

    return this.seancesInFlight$;
  }

  getByModule(moduleId: string): Observable<Seance[]> {
    return this.http.get<Seance[]>(`${this.url}/module/${moduleId}`);
  }

  getOne(id: string): Observable<Seance> {
    return this.http.get<Seance>(`${this.url}/${id}`);
  }

  create(data: {
    moduleId: string;
    coursId?: string;
    titreActivite: string;
    typeSession: string;
    dateHeureDebut: string;
    dateHeureFin: string;
    salleOuLien?: string;
  }): Observable<Seance> {
    return this.http.post<Seance>(this.url, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  update(id: string, data: Partial<Seance>): Observable<Seance> {
    return this.http.put<Seance>(`${this.url}/${id}`, data).pipe(
      tap(() => this.invalidateCache())
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  getApprenants(seanceId: string): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(`${this.url}/${seanceId}/apprenants`);
  }

  emargement(seanceId: string, presences: Partial<Presence>[]): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.url}/${seanceId}/emargement`, { presences }).pipe(
      tap(() => {
        this.invalidateCache();
        this.invalidateAssiduiteCache();
      })
    );
  }

  getAssiduite(apprenantId: string): Observable<{ tauxAssiduite: number; total: number; present: number }> {
    return this.http.get<{ tauxAssiduite: number; total: number; present: number }>(`${this.url}/apprenant/${apprenantId}/assiduite`);
  }

  getAssiduiteSynthese(etablissementId: string, forceRefresh = false): Observable<{
    apprenant: Utilisateur;
    total: number;
    present: number;
    absent: number;
    taux: number;
  }[]> {
    const cached = this.assiduiteCacheMap.get(etablissementId);
    const isFresh = cached && (Date.now() - cached.time < this.ASSIDUITE_TTL);

    if (!forceRefresh && isFresh) {
      return of(cached.data);
    }

    const existing = this.assiduiteInFlightMap.get(etablissementId);
    if (!forceRefresh && existing) {
      return existing;
    }

    const req$ = this.http.get<any[]>(`${this.url}/assiduite/synthese/${etablissementId}`).pipe(
      tap((data) => {
        this.assiduiteCacheMap.set(etablissementId, { data, time: Date.now() });
      }),
      shareReplay(1),
      finalize(() => {
        this.assiduiteInFlightMap.delete(etablissementId);
      })
    );

    this.assiduiteInFlightMap.set(etablissementId, req$);
    return req$;
  }

  invalidateCache(): void {
    this.seancesCacheTime = 0;
    this.seancesSubject.next(null);
  }

  invalidateAssiduiteCache(): void {
    this.assiduiteCacheMap.clear();
  }
}
