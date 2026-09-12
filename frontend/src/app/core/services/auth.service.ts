import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Utilisateur } from '../models';

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
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

  get refreshTokenValue(): string | null {
    return localStorage.getItem('vitalis_refresh');
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
    return this.currentUser?.role === 'PERSONNEL_ADMIN';
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
        if (err?.status === 401 && !localStorage.getItem('vitalis_refresh')) {
          this.clearSession();
        }
        return of(this.currentUserSubject.value);
      }),
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
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

  doRefreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
    const refresh = localStorage.getItem('vitalis_refresh');
    return this.http.post<{ accessToken: string; refreshToken: string }>(
      `${this.apiUrl}/refresh`,
      { refreshToken: refresh }
    ).pipe(
      tap((res) => {
        localStorage.setItem('vitalis_token', res.accessToken);
        localStorage.setItem('vitalis_refresh', res.refreshToken);
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
    localStorage.setItem('vitalis_refresh', res.refreshToken);
    localStorage.setItem('vitalis_user', JSON.stringify(res.utilisateur));
    this.currentUserSubject.next(res.utilisateur);
    this.isReadySubject.next(true);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    localStorage.removeItem('vitalis_token');
    localStorage.removeItem('vitalis_refresh');
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
