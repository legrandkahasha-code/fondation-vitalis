import { Injectable, OnDestroy, NgZone, Injector } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type NotificationEventType =
  // ─── Module Apprenant & Pédagogie ──────────────────────────────────────────
  | 'DEVOIR_NOTE'
  | 'NOTE_PUBLIEE'
  | 'COURS_PUBLIE'
  | 'CERTIFICAT_EMIS'
  | 'FILIERE_UPDATE'
  | 'FORMATION_UPDATE'
  | 'SEANCE_UPDATE'
  | 'ASSIDUITE_UPDATE'
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
  link?: string;
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
  private subject = new Subject<NotificationPayload>();
  private es: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  /** Timer qui déclenche une reconnexion juste avant l'expiration du token actuel */
  private tokenExpiryTimer: any = null;
  private isRefreshing = false;
  private destroy$ = new Subject<void>();

  private authService?: AuthService;
  constructor(private ngZone: NgZone, private injector: Injector) {}

  private getAuth(): AuthService | null {
    if (!this.authService) {
      try {
        this.authService = this.injector.get(AuthService);
      } catch {}
    }
    return this.authService || null;
  }

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
    if (this.isRefreshing) return;

    const refreshToken = localStorage.getItem('vitalis_refresh');
    if (!refreshToken) {
      const token = localStorage.getItem('vitalis_token');
      // Ne purger que si le jeton d'accès est réellement expiré
      if (!token || isTokenExpired(token, 0)) {
        localStorage.removeItem('vitalis_token');
        localStorage.removeItem('vitalis_user');
      }
      return;
    }

    this.isRefreshing = true;

    const apiBase = environment.apiUrl.replace(/\/api$/, '');
    fetch(`${environment.apiUrl}/utilisateurs/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }
        return Promise.reject({ status: res.status });
      })
      .then((data: { accessToken: string; refreshToken: string }) => {
        this.isRefreshing = false;
        localStorage.setItem('vitalis_token', data.accessToken);
        localStorage.setItem('vitalis_refresh', data.refreshToken);
        this._openEventSource(data.accessToken);
      })
      .catch((err) => {
        this.isRefreshing = false;
        const status = err?.status;
        const currentToken = localStorage.getItem('vitalis_token');
        const tokenIsExpired = !currentToken || isTokenExpired(currentToken, 0);

        // Purge STRICTEMENT sur refus 401 ou 403 et seulement si le jeton est expiré
        if ((status === 401 || status === 403) && tokenIsExpired) {
          console.warn('[NotificationsService] Refresh token refusé (401/403) et jeton expiré : déconnexion via AuthService.');
          const auth = this.getAuth();
          if (auth) {
            auth.logout();
          } else {
            localStorage.removeItem('vitalis_token');
            localStorage.removeItem('vitalis_refresh');
            localStorage.removeItem('vitalis_user');
          }
        } else {
          // Erreur réseau, serveur injoignable ou 5xx : pas de purge de session
          console.warn('[NotificationsService] Échec temporaire de rafraîchissement (réseau ou serveur), session conservée :', err);
        }
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
          const payload = JSON.parse(e.data) as NotificationPayload;
          // Filtre strict : Ne jamais propager les heartbeats/keepalives techniques vers l'interface utilisateur
          if (!payload || payload.type === 'HEARTBEAT' || (payload as any).type === 'heartbeat') {
            return;
          }
          this.subject.next(payload);
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
