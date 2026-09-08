import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Etablissement } from '../models';

@Injectable({ providedIn: 'root' })
export class EtablissementsService {
  private url = `${environment.apiUrl}/etablissements`;

  // Cache persistant de session (survit à la navigation entre onglets)
  private etablissementsSubject = new BehaviorSubject<Etablissement[] | null>(null);
  public etablissements$ = this.etablissementsSubject.asObservable();

  private cacheTime = 0;
  private readonly TTL = 300_000; // 5 minutes
  private inFlight$: Observable<Etablissement[]> | null = null;

  constructor(private http: HttpClient) {}

  getAll(forceRefresh = false): Observable<Etablissement[]> {
    const current = this.etablissementsSubject.value;
    const isFresh = current && (Date.now() - this.cacheTime < this.TTL);

    if (!forceRefresh && isFresh) {
      return of(current);
    }

    if (this.inFlight$) {
      return this.inFlight$;
    }

    this.inFlight$ = this.http.get<Etablissement[]>(this.url).pipe(
      tap((data) => {
        this.cacheTime = Date.now();
        this.etablissementsSubject.next(data);
      }),
      shareReplay(1),
      finalize(() => {
        this.inFlight$ = null;
      })
    );

    return this.inFlight$;
  }

  getCached(): Etablissement[] | null {
    return this.etablissementsSubject.value;
  }

  getPublicList(): Observable<Etablissement[]> {
    return this.http.get<Etablissement[]>(`${this.url}/list/public`);
  }

  getOne(id: string): Observable<Etablissement> {
    return this.http.get<Etablissement>(`${this.url}/${id}`);
  }

  create(data: {
    nom: string;
    adresse?: string;
    codeAntenne?: string;
    pays?: string;
    typeEtablissement?: string;
  }): Observable<Etablissement> {
    return this.http.post<Etablissement>(this.url, data).pipe(
      tap((created) => {
        const list = this.etablissementsSubject.value;
        if (list && created) {
          this.etablissementsSubject.next([created, ...list]);
        }
      })
    );
  }

  update(id: string, data: { nom?: string; codeAntenne?: string; adresse?: string; pays?: string }): Observable<Etablissement> {
    return this.http.put<Etablissement>(`${this.url}/${id}`, data).pipe(
      tap((updated) => {
        const list = this.etablissementsSubject.value;
        if (list) {
          const next = list.map((e) => (e.id === id ? { ...e, ...updated } : e));
          this.etablissementsSubject.next(next);
        }
      })
    );
  }

  updateStatut(id: string, statut: string): Observable<Etablissement> {
    return this.http.patch<Etablissement>(`${this.url}/${id}/statut`, { statut }).pipe(
      tap((updated) => {
        const list = this.etablissementsSubject.value;
        if (list) {
          const next = list.map((e) => (e.id === id ? { ...e, ...updated, statut: statut as any } : e));
          this.etablissementsSubject.next(next);
        }
      })
    );
  }

  clearCache() {
    this.etablissementsSubject.next(null);
    this.cacheTime = 0;
    this.inFlight$ = null;
  }
}
