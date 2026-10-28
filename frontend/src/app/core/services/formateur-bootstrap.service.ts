import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import { tap, shareReplay, timeout, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Formation, Seance } from '../models';
import { DevoirFormateurItem } from './devoirs.service';
import { NotificationsService } from './notifications.service';

export interface FormateurBootstrapData {
  formateur: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    etablissementId: string;
  };
  formations: Formation[];
  seances: Seance[];
  devoirsACorriger: DevoirFormateurItem[];
  kpis: {
    totalFormations: number;
    totalSeances: number;
    totalDevoirsConfigures: number;
    totalSoumissions: number;
    totalCopiesEnAttente: number;
    totalCopiesNotes: number;
  };
  timestamp: string;
}

const STORAGE_KEY = 'vc_formateur_bootstrap_cache';

@Injectable({ providedIn: 'root' })
export class FormateurBootstrapService implements OnDestroy {
  private url = `${environment.apiUrl}/pedagogie/formateur/bootstrap`;

  readonly bootstrap$ = new BehaviorSubject<FormateurBootstrapData | null>(null);

  // Observables dérivés directement réactifs (0ms à chaque navigation)
  readonly formations$: Observable<Formation[]> = this.bootstrap$.pipe(
    map((b) => b?.formations || [])
  );
  readonly seances$: Observable<Seance[]> = this.bootstrap$.pipe(
    map((b) => b?.seances || [])
  );
  readonly devoirs$: Observable<DevoirFormateurItem[]> = this.bootstrap$.pipe(
    map((b) => b?.devoirsACorriger || [])
  );
  readonly kpis$: Observable<FormateurBootstrapData['kpis'] | null> = this.bootstrap$.pipe(
    map((b) => b?.kpis || null)
  );

  private inFlight$: Observable<FormateurBootstrapData> | null = null;
  private sseSub?: Subscription;

  constructor(
    private http: HttpClient,
    private notifications: NotificationsService
  ) {
    // 1. Hydratation immédiate depuis le stockage session (0ms garanti lors des rechargements)
    this.restoreFromStorage();

    // 2. Écoute du flux temps réel SSE global
    this.sseSub = this.notifications.messages().subscribe((msg) => {
      if (
        msg.type === 'DEVOIR_SUBMIT' ||
        msg.type === 'DEVOIR_NOTE' ||
        msg.type === 'DEVOIR_UPDATE' ||
        msg.type === 'SEANCE_UPDATE' ||
        msg.type === 'ASSIDUITE_UPDATE' ||
        msg.type === 'FORMATION_UPDATE'
      ) {
        // Rafraîchissement silencieux en arrière-plan sans bloquer l'UI
        this.getBootstrap(true).subscribe({ error: () => {} });
      }
    });
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
  }

  private restoreFromStorage(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FormateurBootstrapData;
        this.bootstrap$.next(parsed);
      }
    } catch {
      // Ignorer si sessionStorage inaccessible
    }
  }

  private saveToStorage(data: FormateurBootstrapData): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignorer si quota dépassé
    }
  }

  invalidateCache(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.inFlight$ = null;
  }

  /**
   * Récupère tout le bundle formateur en 1 seule requête HTTP.
   * Retourne immédiatement le snapshot en mémoire si présent.
   */
  getBootstrap(forceRefresh = false): Observable<FormateurBootstrapData> {
    const current = this.bootstrap$.value;
    if (!forceRefresh && current) {
      return of(current);
    }

    if (!forceRefresh && this.inFlight$) {
      return this.inFlight$;
    }

    this.inFlight$ = this.http.get<FormateurBootstrapData>(this.url).pipe(
      timeout(8000),
      tap((data) => {
        this.bootstrap$.next(data);
        this.saveToStorage(data);
      }),
      shareReplay(1),
      catchError((err) => {
        // En cas d'erreur réseau, conserver le cache existant si disponible
        if (current) {
          return of(current);
        }
        throw err;
      })
    );

    return this.inFlight$;
  }
}
