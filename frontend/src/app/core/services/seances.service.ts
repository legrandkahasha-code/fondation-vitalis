import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Seance, Utilisateur, Presence } from '../models';

@Injectable({ providedIn: 'root' })
export class SeancesService {
  private url = `${environment.apiUrl}/seances`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Seance[]> {
    return this.http.get<Seance[]>(this.url);
  }

  getByModule(moduleId: string): Observable<Seance[]> {
    return this.http.get<Seance[]>(`${this.url}/module/${moduleId}`);
  }

  getOne(id: string): Observable<Seance> {
    return this.http.get<Seance>(`${this.url}/${id}`);
  }

  create(data: {
    moduleId: string;
    coursId?: string;
    titreActivite: string;
    typeSession: string;
    dateHeureDebut: string;
    dateHeureFin: string;
    salleOuLien?: string;
  }): Observable<Seance> {
    return this.http.post<Seance>(this.url, data);
  }

  update(id: string, data: Partial<Seance>): Observable<Seance> {
    return this.http.put<Seance>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getApprenants(seanceId: string): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(`${this.url}/${seanceId}/apprenants`);
  }

  emargement(seanceId: string, presences: Partial<Presence>[]): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.url}/${seanceId}/emargement`, { presences });
  }

  getAssiduite(apprenantId: string): Observable<{ tauxAssiduite: number; total: number; present: number }> {
    return this.http.get<{ tauxAssiduite: number; total: number; present: number }>(`${this.url}/apprenant/${apprenantId}/assiduite`);
  }

  getAssiduiteSynthese(etablissementId: string): Observable<{
    apprenant: Utilisateur;
    total: number;
    present: number;
    absent: number;
    taux: number;
  }[]> {
    return this.http.get<any[]>(`${this.url}/assiduite/synthese/${etablissementId}`);
  }
}
