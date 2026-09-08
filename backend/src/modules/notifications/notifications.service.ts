import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  // ─── Module Landing / Actualités ────────────────────────────────────────────
  | 'ACTUALITE_UPDATE'
  | 'DEMANDE_ORIENTATION'
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
  | 'HEARTBEAT';

export interface NotificationPayload {
  type: NotificationEventType;
  /** ID de l'utilisateur destinataire ciblé (ex: l'apprenant concerné). */
  recipientUserId?: string;
  /** Si défini, l'événement est diffusé à tous les utilisateurs de cet établissement. */
  recipientEtablissementId?: string;
  title?: string;
  message?: string;
  data?: Record<string, any>;
  timestamp: string;
  /** Champs legacy admis pour rétrocompatibilité avec les anciens services. */
  [key: string]: any;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private subject = new Subject<NotificationPayload>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Heartbeat Keep-Alive : envoie un signal toutes les 20s pour maintenir
   * les connexions SSE ouvertes sur les reverse proxies cloud (Render, etc.)
   */
  onModuleInit() {
    this.heartbeatInterval = setInterval(() => {
      this.subject.next({
        type: 'HEARTBEAT',
        message: 'heartbeat',
        timestamp: new Date().toISOString(),
      } as NotificationPayload);
    }, 20_000);
  }

  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Émet un événement structuré vers le flux SSE global.
   */
  emit(payload: Omit<NotificationPayload, 'timestamp'>): void {
    this.subject.next({ ...payload, timestamp: new Date().toISOString() } as NotificationPayload);
  }

  /**
   * Retourne un Observable filtré pour un utilisateur précis.
   * - ADMIN_CENTRE : reçoit TOUS les événements du réseau (bypass complet)
   * - HEARTBEAT / BROADCAST : reçus par tous pour maintenir la connexion
   * - Correspond si recipientUserId = userId (événement ciblé)
   * - Ou si recipientEtablissementId = etablissementId (broadcast établissement)
   * - Fallback : vérifie la clé legacy `etablissementId` non normalisée
   */
  streamForUser(user: { id: string; etablissementId: string; role?: string }): Observable<NotificationPayload> {
    return this.subject.asObservable().pipe(
      filter((payload) => {
        // Heartbeat keepalive reçu par tous pour maintenir la connexion SSE
        if (payload.type === 'HEARTBEAT') return true;
        // L'Admin Central voit l'intégralité du réseau en temps réel
        if (user.role === 'ADMIN_CENTRE') return true;
        if (payload.type === 'BROADCAST') return true;
        if (payload.recipientUserId && payload.recipientUserId === user.id) return true;
        if (payload.recipientEtablissementId && payload.recipientEtablissementId === user.etablissementId) return true;
        // Fallback : clés non normalisées émises par les services legacy
        if ((payload as any).etablissementId && (payload as any).etablissementId === user.etablissementId) return true;
        return false;
      }),
    );
  }

  /** @deprecated Utiliser streamForUser() pour les appels authentifiés. */
  stream(): Observable<NotificationPayload> {
    return this.subject.asObservable();
  }
}
