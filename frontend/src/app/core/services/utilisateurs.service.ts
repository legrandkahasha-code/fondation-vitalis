import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, shareReplay, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Utilisateur } from '../models';

@Injectable({ providedIn: 'root' })
export class UtilisateursService {
  private url = `${environment.apiUrl}/utilisateurs`;

  // Cache persistant de session (survit à la navigation entre onglets)
  private utilisateursSubject = new BehaviorSubject<Utilisateur[] | null>(null);
  public utilisateurs$ = this.utilisateursSubject.asObservable();

  private cacheTime = 0;
  private readonly TTL = 300_000; // 5 minutes
  private inFlight$: Observable<Utilisateur[]> | null = null;

  constructor(private http: HttpClient) {}

  getAll(forceRefresh = false): Observable<Utilisateur[]> {
    const current = this.utilisateursSubject.value;
    const isFresh = current && (Date.now() - this.cacheTime < this.TTL);

    if (!forceRefresh && isFresh) {
      return of(current);
    }

    if (this.inFlight$) {
      return this.inFlight$;
    }

    this.inFlight$ = this.http.get<Utilisateur[]>(`${this.url}/all`).pipe(
      tap((data) => {
        this.cacheTime = Date.now();
        this.utilisateursSubject.next(data);
      }),
      shareReplay(1),
      finalize(() => {
        this.inFlight$ = null;
      })
    );

    return this.inFlight$;
  }

  getCached(): Utilisateur[] | null {
    return this.utilisateursSubject.value;
  }

  getByEtablissement(etablissementId: string): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(`${this.url}/etablissement/${etablissementId}`);
  }

  setActif(id: string, actif: boolean): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.url}/${id}/activer`, { actif }).pipe(
      tap(() => {
        const list = this.utilisateursSubject.value;
        if (list) {
          const next = list.map((u) => (u.id === id ? { ...u, actif } : u));
          this.utilisateursSubject.next(next);
        }
      })
    );
  }

  enroler(payload: {
    nom: string;
    prenom: string;
    email: string;
    password: string;
    etablissementId: string;
    role?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.url}/enroler`, payload).pipe(
      tap((created) => {
        const list = this.utilisateursSubject.value;
        if (list && created) {
          this.utilisateursSubject.next([created, ...list]);
        }
      })
    );
  }

  updateUser(id: string, payload: { nom?: string; prenom?: string; role?: string; etablissementId?: string }): Observable<any> {
    return this.http.put<any>(`${this.url}/${id}`, payload).pipe(
      tap((updated) => {
        const list = this.utilisateursSubject.value;
        if (list) {
          const next = list.map((u) => (u.id === id ? { ...u, ...updated } : u));
          this.utilisateursSubject.next(next);
        }
      })
    );
  }

  getDossier(id: string): Observable<any> {
    return this.http.get<any>(`${this.url}/${id}/dossier`);
  }

  reinitialiserAcces(id: string, motDePasse?: string): Observable<{ success: boolean; message: string; motDePasseTemporaire?: string }> {
    return this.http.post<{ success: boolean; message: string; motDePasseTemporaire?: string }>(
      `${this.url}/${id}/reinitialiser-acces`,
      { motDePasse }
    );
  }

  deverrouillerCompte(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.url}/${id}/deverrouiller`,
      {}
    );
  }

  clearCache() {
    this.utilisateursSubject.next(null);
    this.cacheTime = 0;
    this.inFlight$ = null;
  }

  // ─── Documents Dossier ────────────────────────────────────────────────────────

  getDocuments(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/${userId}/documents`);
  }

  ajouterDocument(userId: string, file: File, titre: string, typeDocument: string, commentaire?: string): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('titre', titre);
    fd.append('typeDocument', typeDocument);
    if (commentaire) fd.append('commentaire', commentaire);
    return this.http.post<any>(`${this.url}/${userId}/documents`, fd);
  }

  supprimerDocument(userId: string, docId: string): Observable<any> {
    return this.http.delete<any>(`${this.url}/${userId}/documents/${docId}`);
  }

  // ─── Demandes de Régularisation ───────────────────────────────────────────────

  getRegularisations(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/${userId}/regularisations`);
  }

  creerDemandeRegularisation(userId: string, payload: {
    motif: string;
    description: string;
    piecesDemandees?: string[];
    dateLimite: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.url}/${userId}/regularisations`, payload);
  }

  decisionRegularisation(demandeId: string, payload: { statut: string; commentaire?: string }): Observable<any> {
    return this.http.post<any>(`${this.url}/regularisations/${demandeId}/decision`, payload);
  }

  /** Pour l'utilisateur connecté : récupérer ses demandes actives */
  getMesDemandesRegularisation(): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/me/demandes-regularisation`);
  }

  /** L'utilisateur soumet un fichier en réponse à une demande */
  soumettreDocumentRegularisation(demandeId: string, file: File, titre: string, typeDocument: string): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('titre', titre);
    fd.append('typeDocument', typeDocument);
    return this.http.post<any>(`${this.url}/me/soumettre-document/${demandeId}`, fd);
  }
}
