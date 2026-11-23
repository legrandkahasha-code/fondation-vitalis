import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Utilisateur } from '../models';

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string; // Désormais transmis via cookie HttpOnly, absent du body JSON
  utilisateur: Utilisateur;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/utilisateurs`;
  private currentUserSubject = new BehaviorSubject<Utilisateur | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Signals to guards/components that auth init (loadMe call) is done
  private isReadySubject = new BehaviorSubject<boolean>(false);
  public isReady$ = this.isReadySubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem('vitalis_token');
    const savedUser = localStorage.getItem('vitalis_user');

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.currentUserSubject.next(user);
      } catch (e) {
        console.warn('[AuthService] Erreur lecture cache utilisateur:', e);
      }
    }

    if (token) {
      // Mark ready immediately so routes & guards can activate with cached user
      this.isReadySubject.next(true);

      // Refresh / validate profile in background
      this.loadMe().subscribe();
    } else {
      this.isReadySubject.next(true);
    }
  }

  get currentUser(): Utilisateur | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!localStorage.getItem('vitalis_token');
  }

  get token(): string | null {
    return localStorage.getItem('vitalis_token');
  }

  /**
   * Le refreshToken est désormais stocké dans un cookie HttpOnly (non lisible côté JS).
   * Ce getter retourne un marqueur booléen basé sur la présence d'un accessToken actif,
   * ce qui indique qu'un refresh cookie est probablement disponible côté serveur.
   */
  get refreshTokenValue(): string | null {
    // Retourner un marqueur non-null si l'utilisateur est authentifié,
    // car le cookie HttpOnly existe mais n'est pas lisible en JS.
    return this.isAuthenticated ? '__httponly_cookie__' : null;
  }

  get isAdminCentre(): boolean {
    return this.currentUser?.role === 'ADMIN_CENTRE';
  }

  get isAdminEtab(): boolean {
    return this.currentUser?.role === 'ADMIN_ETABLISSEMENT';
  }

  get isFormateur(): boolean {
    return this.currentUser?.role === 'FORMATEUR';
  }

  get isPersonnelAdmin(): boolean {
    return this.currentUser?.role === 'PERSONNEL_ADMINISTRATIF' || this.currentUser?.role === 'PERSONNEL_ADMIN';
  }

  get isApprenant(): boolean {
    return this.currentUser?.role === 'APPRENANT';
  }

  loadMe(): Observable<Utilisateur | null> {
    return this.http.get<Utilisateur>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        if (user) {
          localStorage.setItem('vitalis_user', JSON.stringify(user));
          this.currentUserSubject.next(user);
          console.log('[AuthService] Profil actualisé avec succès depuis l’API:', user.email);
        }
      }),
      catchError((err) => {
        const statusText = err?.status ? `HTTP ${err.status}` : 'serveur injoignable / hors ligne';
        console.warn(`[AuthService] loadMe() non-bloquant (${statusText}) — session active via cache local`);
        if (err?.status === 401 && !this.isAuthenticated) {
          this.clearSession();
        }
        return of(this.currentUserSubject.value);
      }),
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      { email, password },
      { withCredentials: true }, // Nécessaire pour recevoir le cookie HttpOnly
    ).pipe(
      tap((res) => this.storeSession(res)),
    );
  }

  register(data: {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    etablissementId: string;
  }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  enrolerApprenant(data: {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    etablissementId: string;
  }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/enroler`, data);
  }

  doRefreshToken(): Observable<{ accessToken: string }> {
    // Le refreshToken est envoyé automatiquement via le cookie HttpOnly
    return this.http.post<{ accessToken: string }>(
      `${this.apiUrl}/refresh`,
      {},
      { withCredentials: true },
    ).pipe(
      tap((res) => {
        localStorage.setItem('vitalis_token', res.accessToken);
      }),
    );
  }

  changePassword(data: { ancienMotDePasse: string; nouveauMotDePasse: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/change-password`, data);
  }

  updateProfile(data: { nom: string; prenom: string }): Observable<any> {
    return this.http.put<{ success: boolean; utilisateur: Utilisateur }>(`${this.apiUrl}/me`, data).pipe(
      tap((res) => {
        if (res.utilisateur) {
          localStorage.setItem('vitalis_user', JSON.stringify(res.utilisateur));
          this.currentUserSubject.next(res.utilisateur);
        }
      }),
    );
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem('vitalis_token', res.accessToken);
    // Le refreshToken est désormais dans un cookie HttpOnly — plus stocké en localStorage
    localStorage.setItem('vitalis_user', JSON.stringify(res.utilisateur));
    this.currentUserSubject.next(res.utilisateur);
    this.isReadySubject.next(true);
  }

  logout(): void {
    // Le serveur lira le refreshToken depuis le cookie HttpOnly
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      error: () => {}, // silencieux si hors ligne
    });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    localStorage.removeItem('vitalis_token');
    // vitalis_refresh n'est plus stocké en localStorage (cookie HttpOnly côté serveur)
    localStorage.removeItem('vitalis_user');
    this.currentUserSubject.next(null);
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.currentUser?.role === r);
  }
}
