import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
  private subject = new ReplaySubject<NotificationPayload>(1);
  private es: EventSource | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;

  constructor(private ngZone: NgZone) {}

  connect() {
    if (this.es) return;
    const token = localStorage.getItem('vitalis_token');
    if (!token) return;
    const url = `${environment.apiUrl}/notifications/sse?token=${encodeURIComponent(token)}`;
    this.es = new EventSource(url);
    this.es.onopen = () => {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    };
    this.es.onmessage = (e) => {
      // run inside Angular zone so subscribers trigger change detection
      this.ngZone.run(() => {
        try {
          this.subject.next(JSON.parse(e.data) as NotificationPayload);
        } catch {
          // ignore malformed messages
        }
      });
    };
    this.es.onerror = () => {
      this.ngZone.run(() => {
        // close connection but do NOT error the subject to avoid terminating subscribers
        this.close();
        // exponential backoff reconnect
        this.reconnectAttempts = Math.min(10, this.reconnectAttempts + 1);
        const delay = Math.min(30000, 500 * Math.pow(2, this.reconnectAttempts));
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => { try { this.connect(); } catch {} }, delay);
      });
    };
  }

  messages(): Observable<NotificationPayload> {
    this.connect();
    return this.subject.asObservable();
  }

  close() {
    if (this.es) { this.es.close(); this.es = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  ngOnDestroy() {
    this.close();
    this.subject.complete();
  }
}
