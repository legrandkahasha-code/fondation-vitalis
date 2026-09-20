import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SessionAdmission {
  id: string;
  libelle: string;
  description?: string;
  piecesRequises?: string[];
  etablissementsPartages?: string[];
  statut: string;
  modeSelection: string;
  capacite: number;
  dateOuverture: string;
  dateFermeture: string;
  dateDebutFormation: string;
  delaiConfirmationJours?: number;
  filiere: { id?: string; libelle: string };
  niveau: { id?: string; libelle: string };
  formation?: { id: string; titre: string } | null;
  etablissement: { id: string; nom: string; codeAntenne: string; pays?: string; typeEtablissement?: string };
  _count?: { candidatures: number };
}

export interface Candidature {
  id: string;
  statut: string;
  session: SessionAdmission;
  apprenant?: {
    id?: string;
    nom: string;
    prenom: string;
    email: string;
    matricule?: string;
    telephone?: string;
    paysOrigine?: string;
    numeroIdentite?: string;
    dateNaissance?: string;
  };
  conflitCalendrier?: boolean;
  dateSoumission?: string;
  dateDecision?: string;
  dateConfirmation?: string;
  dateExpiration?: string;
  scoreEvaluation?: number | string;
  commentaireGestionnaire?: string;
  motifRejet?: string;
  rangListeAttente?: number;
  createdAt?: string;
  pieces?: PieceCandidature[];
  historique?: {
    id?: string;
    statutAvant?: string;
    statutApres?: string;
    commentaire?: string;
    timestamp?: string;
  }[];
}

export interface PieceCandidature {
  id: string;
  type: string;
  nomFichier: string;
  fileUrl?: string;
  valide?: boolean;
  uploadedAt?: string;
}

export interface SessionStats {
  sessionId: string;
  capacite: number;
  placesPrises: number;
  placesRestantes: number;
  parStatut: Record<string, number>;
}

export interface AdmissionReference {
  id: string;
  code: string;
  libelle: string;
}

@Injectable({ providedIn: 'root' })
export class AdmissionService {
  private readonly url = environment.apiUrl;

  private readonly CACHE_KEYS = {
    SESSIONS_PUB: 'vc_admission_sessions_pub',
    MES_VOEUX: 'vc_admission_mes_voeux',
    SESSIONS_GESTION: 'vc_admission_sessions_gestion',
    FILIERES: 'vc_admission_filieres',
    NIVEAUX: 'vc_admission_niveaux',
  };

  constructor(private http: HttpClient) {}

  private getLocal<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private setLocal<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  // Snapshots instantanés (0ms) pour chargement immédiat
  getSessionsPubliquesSnapshot(): SessionAdmission[] | null {
    return this.getLocal<SessionAdmission[]>(this.CACHE_KEYS.SESSIONS_PUB);
  }

  getMesVoeuxSnapshot(): Candidature[] | null {
    return this.getLocal<Candidature[]>(this.CACHE_KEYS.MES_VOEUX);
  }

  getSessionsGestionSnapshot(): SessionAdmission[] | null {
    return this.getLocal<SessionAdmission[]>(this.CACHE_KEYS.SESSIONS_GESTION);
  }

  getFilieresSnapshot(): AdmissionReference[] | null {
    return this.getLocal<AdmissionReference[]>(this.CACHE_KEYS.FILIERES);
  }

  getNiveauxSnapshot(): AdmissionReference[] | null {
    return this.getLocal<AdmissionReference[]>(this.CACHE_KEYS.NIVEAUX);
  }

  /**
   * Sessions publiques OUVERTES.
   * Si etablissementId est fourni, le backend filtre pour ne retourner que
   * les sessions de cet établissement + celles qui lui sont partagées.
   */
  getSessionsPubliques(etablissementId?: string): Observable<SessionAdmission[]> {
    const params = etablissementId ? `?etablissementId=${encodeURIComponent(etablissementId)}` : '';
    return this.http.get<SessionAdmission[]>(`${this.url}/sessions-admission/public${params}`).pipe(
      tap((sessions) => this.setLocal(this.CACHE_KEYS.SESSIONS_PUB, sessions))
    );
  }

  getMesVoeux(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.url}/candidatures/mes-voeux`).pipe(
      tap((voeux) => this.setLocal(this.CACHE_KEYS.MES_VOEUX, voeux))
    );
  }

  createCandidature(sessionId: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.url}/candidatures`, { sessionId });
  }

  getSessionsGestion(): Observable<SessionAdmission[]> {
    return this.http.get<SessionAdmission[]>(`${this.url}/sessions-admission`).pipe(
      tap((sessions) => this.setLocal(this.CACHE_KEYS.SESSIONS_GESTION, sessions))
    );
  }

  getAllCandidatures(params?: { sessionId?: string; etablissementId?: string; statut?: string; search?: string }): Observable<Candidature[]> {
    let queryParams = '';
    const parts: string[] = [];
    if (params?.sessionId) parts.push(`sessionId=${encodeURIComponent(params.sessionId)}`);
    if (params?.etablissementId) parts.push(`etablissementId=${encodeURIComponent(params.etablissementId)}`);
    if (params?.statut) parts.push(`statut=${encodeURIComponent(params.statut)}`);
    if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
    if (parts.length > 0) queryParams = `?${parts.join('&')}`;

    return this.http.get<Candidature[]>(`${this.url}/candidatures${queryParams}`).pipe(
      tap((candidatures) => this.setLocal('vc_admission_all_candidatures', candidatures))
    );
  }

  getAllCandidaturesSnapshot(): Candidature[] | null {
    return this.getLocal<Candidature[]>('vc_admission_all_candidatures');
  }

  getCandidaturesSession(sessionId: string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.url}/candidatures/session/${sessionId}`);
  }

  getSessionStats(sessionId: string): Observable<SessionStats> {
    return this.http.get<SessionStats>(`${this.url}/sessions-admission/${sessionId}/stats`);
  }

  getFilieres(): Observable<AdmissionReference[]> {
    return this.http.get<AdmissionReference[]>(`${this.url}/referentiel/filieres`).pipe(
      tap((filieres) => this.setLocal(this.CACHE_KEYS.FILIERES, filieres))
    );
  }

  getNiveaux(): Observable<AdmissionReference[]> {
    return this.http.get<AdmissionReference[]>(`${this.url}/referentiel/niveaux`).pipe(
      tap((niveaux) => this.setLocal(this.CACHE_KEYS.NIVEAUX, niveaux))
    );
  }

  createSession(data: Record<string, unknown>): Observable<SessionAdmission> {
    return this.http.post<SessionAdmission>(`${this.url}/sessions-admission`, data);
  }

  /** Mettre à jour les infos d'une session (description, pièces requises, capacité, partage) */
  updateSession(id: string, data: Partial<{
    libelle: string;
    description: string;
    piecesRequises: string[];
    capacite: number;
    etablissementsPartages: string[];
  }>): Observable<SessionAdmission> {
    return this.http.patch<SessionAdmission>(`${this.url}/sessions-admission/${id}`, data);
  }

  updateSessionStatus(id: string, statut: string): Observable<SessionAdmission> {
    return this.http.patch<SessionAdmission>(`${this.url}/sessions-admission/${id}/statut`, { statut });
  }

  /** Partager une session avec une liste d'établissements (Admin Central uniquement) */
  partagerSession(id: string, etablissementIds: string[]): Observable<SessionAdmission> {
    return this.http.patch<SessionAdmission>(`${this.url}/sessions-admission/${id}/partager`, { etablissementIds });
  }

  /** Obtenir le détail d'une session par son id */
  getSession(id: string): Observable<SessionAdmission> {
    return this.http.get<SessionAdmission>(`${this.url}/sessions-admission/${id}`);
  }

  submitCandidature(id: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.url}/candidatures/${id}/soumettre`, {});
  }

  confirmCandidature(id: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.url}/candidatures/${id}/confirmer`, {});
  }

  withdrawCandidature(id: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.url}/candidatures/${id}/retirer`, {});
  }

  openEvaluation(id: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.url}/candidatures/${id}/evaluer`, {});
  }

  decideCandidature(
    id: string,
    decision: 'ADMIS' | 'LISTE_ATTENTE' | 'REJETE',
    scoreEvaluation?: number,
    motifRejet?: string,
    commentaireGestionnaire?: string
  ): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.url}/candidatures/${id}/decision`, {
      decision,
      scoreEvaluation,
      motifRejet,
      commentaireGestionnaire,
    });
  }

  getPieceUrl(fileUrl?: string): string {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
    const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    return `${baseUrl}${cleanPath}`;
  }

  downloadFile(fileUrl: string): Observable<Blob> {
    const fullUrl = this.getPieceUrl(fileUrl);
    return this.http.get(fullUrl, { responseType: 'blob' });
  }

  saveBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  promoteCandidature(id: string): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.url}/candidatures/${id}/promouvoir`, {});
  }

  uploadPiece(id: string, type: string, file: File): Observable<PieceCandidature> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<PieceCandidature>(`${this.url}/candidatures/${id}/pieces?type=${encodeURIComponent(type)}`, body);
  }

  deletePiece(candidatureId: string, pieceId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.url}/candidatures/${candidatureId}/pieces/${pieceId}`);
  }
}
