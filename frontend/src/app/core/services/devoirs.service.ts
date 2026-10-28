import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { timeout, tap, shareReplay, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Devoir {
  id: string;
  titre: string;
  consignes?: string;
  dateLimite?: string;
  criteresEvaluation?: any;
  moduleId: string;
  soumissions?: SoumissionDevoir[];
  _count?: { soumissions: number };
}

export interface SoumissionDevoir {
  id: string;
  devoirId?: string;
  fileUrl: string;
  dateDepot: string;
  note?: number;
  commentaire?: string;
  apprenant?: { id: string; nom: string; prenom: string; email?: string };
  devoir?: { id?: string; titre: string; module?: { formation?: { titre: string } } };
}

export interface DevoirFormateurItem {
  id: string;
  titre: string;
  consignes?: string;
  dateLimite?: string;
  moduleId: string;
  moduleTitre: string;
  formationId: string;
  formationTitre: string;
  nbTotalSoumissions: number;
  nbEnAttente: number;
  nbNotes: number;
  soumissions: SoumissionDevoir[];
}

@Injectable({ providedIn: 'root' })
export class DevoirsService {
  private url = `${environment.apiUrl}/devoirs`;

  constructor(private http: HttpClient) {}

  // Cache en mémoire pour affichage instantané (0ms) et anti-freeze
  private aCorrigerCache: DevoirFormateurItem[] | null = null;
  private aCorrigerCacheTime = 0;
  private readonly CACHE_TTL = 30_000; // 30s
  private aCorrigerInFlight$: Observable<DevoirFormateurItem[]> | null = null;

  invalidateCache(): void {
    this.aCorrigerCache = null;
    this.aCorrigerCacheTime = 0;
    this.aCorrigerInFlight$ = null;
  }

  getDevoirsACorriger(forceRefresh = false): Observable<DevoirFormateurItem[]> {
    const isFresh = this.aCorrigerCache && (Date.now() - this.aCorrigerCacheTime < this.CACHE_TTL);
    if (!forceRefresh && isFresh) {
      return of(this.aCorrigerCache!);
    }

    if (!forceRefresh && this.aCorrigerInFlight$) {
      return this.aCorrigerInFlight$;
    }

    this.aCorrigerInFlight$ = this.http.get<DevoirFormateurItem[]>(`${this.url}/formateur/a-corriger`).pipe(
      timeout(6000),
      tap((data) => {
        this.aCorrigerCache = data;
        this.aCorrigerCacheTime = Date.now();
      }),
      shareReplay(1),
      finalize(() => {
        this.aCorrigerInFlight$ = null;
      })
    );

    return this.aCorrigerInFlight$;
  }

  getByModule(moduleId: string): Observable<Devoir[]> {
    return this.http.get<Devoir[]>(`${this.url}/module/${moduleId}`);
  }

  getOne(id: string): Observable<Devoir> {
    return this.http.get<Devoir>(`${this.url}/${id}`);
  }

  create(moduleId: string, data: { titre: string; consignes?: string; dateLimite?: string; criteresEvaluation?: any }): Observable<Devoir> {
    return this.http.post<Devoir>(`${this.url}/module/${moduleId}`, data);
  }

  submit(devoirId: string, file: File): Observable<SoumissionDevoir> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<SoumissionDevoir>(`${this.url}/${devoirId}/submit`, form);
  }

  noter(devoirId: string, apprenantId: string, note: number, commentaire?: string): Observable<SoumissionDevoir> {
    return this.http.put<SoumissionDevoir>(`${this.url}/${devoirId}/noter/${apprenantId}`, { note, commentaire });
  }

  mesSoumissions(): Observable<SoumissionDevoir[]> {
    return this.http.get<SoumissionDevoir[]>(`${this.url}/mes/soumissions`);
  }

  update(id: string, data: { titre?: string; consignes?: string; dateLimite?: string; criteresEvaluation?: any }): Observable<Devoir> {
    return this.http.put<Devoir>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
