import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Devoir {
  id: string;
  titre: string;
  consignes?: string;
  dateLimite?: string;
  criteresEvaluation?: any;
  moduleId: string;
  soumissions?: SoumissionDevoir[];
  _count?: { soumissions: number };
}

export interface SoumissionDevoir {
  id: string;
  devoirId?: string;
  fileUrl: string;
  dateDepot: string;
  note?: number;
  commentaire?: string;
  apprenant?: { id: string; nom: string; prenom: string };
  devoir?: { id?: string; titre: string; module?: { formation?: { titre: string } } };
}

@Injectable({ providedIn: 'root' })
export class DevoirsService {
  private url = `${environment.apiUrl}/devoirs`;

  constructor(private http: HttpClient) {}

  getByModule(moduleId: string): Observable<Devoir[]> {
    return this.http.get<Devoir[]>(`${this.url}/module/${moduleId}`);
  }

  getOne(id: string): Observable<Devoir> {
    return this.http.get<Devoir>(`${this.url}/${id}`);
  }

  create(moduleId: string, data: { titre: string; consignes?: string; dateLimite?: string; criteresEvaluation?: any }): Observable<Devoir> {
    return this.http.post<Devoir>(`${this.url}/module/${moduleId}`, data);
  }

  submit(devoirId: string, file: File): Observable<SoumissionDevoir> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<SoumissionDevoir>(`${this.url}/${devoirId}/submit`, form);
  }

  noter(devoirId: string, apprenantId: string, note: number, commentaire?: string): Observable<SoumissionDevoir> {
    return this.http.put<SoumissionDevoir>(`${this.url}/${devoirId}/noter/${apprenantId}`, { note, commentaire });
  }

  mesSoumissions(): Observable<SoumissionDevoir[]> {
    return this.http.get<SoumissionDevoir[]>(`${this.url}/mes/soumissions`);
  }

  update(id: string, data: { titre?: string; consignes?: string; dateLimite?: string; criteresEvaluation?: any }): Observable<Devoir> {
    return this.http.put<Devoir>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
