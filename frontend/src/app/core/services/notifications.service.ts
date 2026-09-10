import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { ReplaySubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type NotificationEventType =
  // ─── Module Apprenant ───────────────────────────────────────────────────────
  | 'DEVOIR_NOTE'
  | 'NOTE_PUBLIEE'
  | 'COURS_PUBLIE'
  | 'CERTIFICAT_EMIS'
  // ─── Module Admission ───────────────────────────────────────────────────────
  | 'ADMISSION_NEW_CANDIDATURE'
  | 'ADMISSION_CONFIRMED'
  | 'ADMISSION_INSCRIBED'
  | 'ADMISSION_STATUS_CHANGE'
  | 'DEMANDE_ORIENTATION'
  // ─── Module Landing / Actualités ────────────────────────────────────────────
  | 'ACTUALITE_UPDATE'
  | 'LANDING_UPDATE'
  // ─── Auth / Utilisateurs & Dossiers ─────────────────────────────────────────
  | 'auth'
  | 'UTILISATEUR_UPDATE'
  | 'UTILISATEUR_ENROLE'
  | 'DOSSIER_DOCUMENT_AJOUTE'
  | 'DOSSIER_DOCUMENT_SUPPRIME'
  | 'DEMANDE_REGULARISATION'
  | 'REGULARISATION_DECISION'
  | 'DOCUMENT_REGULARISATION_SOUMIS'
  // ─── Générique ───────────────────────────────────────────────────────────────
  | 'BROADCAST'
  | (string & {});

export interface NotificationPayload {
  type: NotificationEventType;
  recipientUserId?: string;
  recipientEtablissementId?: string;
  title?: string;
  message?: string;
  data?: Record<string, any>;
  timestamp?: string;
  event?: string;
  [key: string]: any;
}

/**
 * Décode le payload d'un token JWT sans validation de signature (côté client uniquement).
 * Retourne null si le token est invalide ou illisible.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Retourne true si le token est expiré ou expire dans moins de `bufferSec` secondes.
 */
function isTokenExpired(token: string, bufferSec = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 >= payload.exp - bufferSec;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
  private subject = new ReplaySubject<NotificationPayload>(1);
  private es: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  /** Timer qui déclenche une reconnexion juste avant l'expiration du token actuel */
  private tokenExpiryTimer: any = null;
  private destroy$ = new Subject<void>();

  constructor(private ngZone: NgZone) {}

  /**
   * Tente d'ouvrir la connexion SSE avec le token courant.
   * Si le token est expiré, tente un refresh via l'endpoint /refresh avant de se connecter.
   * Appeler cette méthode est idempotent (ne crée pas de doublon si déjà connecté).
   */
  connect(): void {
    if (this.es) return; // Déjà connecté

    const token = localStorage.getItem('vitalis_token');
    if (!token) return; // Pas authentifié

    if (isTokenExpired(token)) {
      // Token expiré → tenter un refresh silencieux avant de connecter
      this._refreshThenConnect();
      return;
    }

    this._openEventSource(token);
  }

  /** Rafraîchit le token via le refresh token, puis ouvre l'EventSource. */
  private _refreshThenConnect(): void {
    const refreshToken = localStorage.getItem('vitalis_refresh');
    if (!refreshToken) {
      // Pas de refresh token disponible, on ne peut rien faire
      return;
    }

    const apiBase = environment.apiUrl.replace(/\/api$/, '');
    fetch(`${environment.apiUrl}/utilisateurs/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { accessToken: string; refreshToken: string }) => {
        localStorage.setItem('vitalis_token', data.accessToken);
        localStorage.setItem('vitalis_refresh', data.refreshToken);
        this._openEventSource(data.accessToken);
      })
      .catch(() => {
        // Refresh échoué : session expirée définitivement, ne pas boucler
        console.warn('[NotificationsService] Refresh token invalide ou expiré, SSE non connecté.');
      });
  }

  /** Crée et configure l'EventSource avec le token fourni. */
  private _openEventSource(token: string): void {
    const url = `${environment.apiUrl}/notifications/sse?token=${encodeURIComponent(token)}`;
    this.es = new EventSource(url);

    // Planifier une reconnexion propre avant l'expiration du token
    this._scheduleTokenExpiryReconnect(token);

    this.es.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.es.onmessage = (e) => {
      this.ngZone.run(() => {
        try {
          this.subject.next(JSON.parse(e.data) as NotificationPayload);
        } catch {
          // Ignorer les messages malformés
        }
      });
    };

    this.es.onerror = () => {
      this.ngZone.run(() => {
        this.close();
        // Backoff exponentiel plafonné à 30s
        this.reconnectAttempts = Math.min(10, this.reconnectAttempts + 1);
        const delay = Math.min(30_000, 500 * Math.pow(2, this.reconnectAttempts));
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          try {
            this.connect(); // connect() vérifiera si le token est expiré avant d'ouvrir
          } catch {}
        }, delay);
      });
    };
  }

  /**
   * Planifie une reconnexion proactive 30 secondes avant l'expiration du token,
   * de sorte que la connexion SSE ne tombe jamais en 401 par expiration silencieuse.
   */
  private _scheduleTokenExpiryReconnect(token: string): void {
    if (this.tokenExpiryTimer) clearTimeout(this.tokenExpiryTimer);

    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return;

    // Reconnecter 30s avant l'expiration
    const msUntilRefresh = (payload.exp - 30) * 1000 - Date.now();
    if (msUntilRefresh <= 0) return; // Déjà trop tard

    this.tokenExpiryTimer = setTimeout(() => {
      this.ngZone.run(() => {
        // Fermer proprement et reconnecter avec un token frais
        this.close();
        this.connect();
      });
    }, msUntilRefresh);
  }

  messages(): Observable<NotificationPayload> {
    this.connect();
    return this.subject.asObservable();
  }

  close(): void {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
      this.tokenExpiryTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.close();
    this.subject.complete();
  }
}
