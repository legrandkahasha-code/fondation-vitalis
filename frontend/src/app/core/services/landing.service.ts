import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LandingPageSettings,
  LandingPageSection,
  LandingPageTemoignage,
  LandingPageActualite,
  PublicLandingData,
  ContactMessageItem,
} from '../models';

@Injectable({ providedIn: 'root' })
export class LandingService {
  private url = `${environment.apiUrl}/landing`;

  constructor(private http: HttpClient) {}

  // --- PUBLIC APIS ---
  getPublicLandingData(): Observable<PublicLandingData> {
    return this.http.get<PublicLandingData>(`${this.url}/public`);
  }

  submitContact(data: { nom: string; telephone: string; filiere?: string; message?: string; email?: string; honeypot?: string }): Observable<any> {
    return this.http.post<any>(`${this.url}/contact`, data);
  }

  // --- ADMIN SETTINGS ---
  getSettings(): Observable<LandingPageSettings> {
    return this.http.get<LandingPageSettings>(`${this.url}/settings`);
  }

  updateSettings(data: Partial<LandingPageSettings>): Observable<LandingPageSettings> {
    return this.http.put<LandingPageSettings>(`${this.url}/settings`, data);
  }

  // --- ADMIN SECTIONS ---
  getSections(typeSection?: string): Observable<LandingPageSection[]> {
    const params = typeSection ? `?type=${typeSection}` : '';
    return this.http.get<LandingPageSection[]>(`${this.url}/sections${params}`);
  }

  createSection(data: Partial<LandingPageSection>): Observable<LandingPageSection> {
    return this.http.post<LandingPageSection>(`${this.url}/sections`, data);
  }

  updateSection(id: string, data: Partial<LandingPageSection>): Observable<LandingPageSection> {
    return this.http.put<LandingPageSection>(`${this.url}/sections/${id}`, data);
  }

  deleteSection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/sections/${id}`);
  }

  // --- ADMIN ACTUALITÉS DU CENTRE VITALIS ---
  getActualites(): Observable<LandingPageActualite[]> {
    return this.http.get<LandingPageActualite[]>(`${this.url}/actualites`);
  }

  createActualite(data: Partial<LandingPageActualite>): Observable<LandingPageActualite> {
    return this.http.post<LandingPageActualite>(`${this.url}/actualites`, data);
  }

  updateActualite(id: string, data: Partial<LandingPageActualite>): Observable<LandingPageActualite> {
    return this.http.put<LandingPageActualite>(`${this.url}/actualites/${id}`, data);
  }

  deleteActualite(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/actualites/${id}`);
  }

  /**
   * Upload d'un média (image ou vidéo) depuis l'appareil de l'administrateur.
   * Retourne { url, type, originalName, size, mimeType }.
   */
  uploadActualiteMedia(file: File): Observable<{ url: string; type: string; originalName: string; size: number; mimeType: string }> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<{ url: string; type: string; originalName: string; size: number; mimeType: string }>(
      `${this.url}/actualites/upload-media`,
      formData,
    );
  }

  // --- ADMIN TEMOIGNAGES ---
  getTemoignages(): Observable<LandingPageTemoignage[]> {
    return this.http.get<LandingPageTemoignage[]>(`${this.url}/temoignages`);
  }

  createTemoignage(data: Partial<LandingPageTemoignage>): Observable<LandingPageTemoignage> {
    return this.http.post<LandingPageTemoignage>(`${this.url}/temoignages`, data);
  }

  updateTemoignage(id: string, data: Partial<LandingPageTemoignage>): Observable<LandingPageTemoignage> {
    return this.http.put<LandingPageTemoignage>(`${this.url}/temoignages/${id}`, data);
  }

  deleteTemoignage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/temoignages/${id}`);
  }

  // --- ADMIN CONTACT MESSAGES / ORIENTATIONS ---
  getContactMessages(): Observable<ContactMessageItem[]> {
    return this.http.get<ContactMessageItem[]>(`${this.url}/contacts`);
  }

  deleteContactMessage(id: string): Observable<any> {
    return this.http.delete(`${this.url}/contacts/${id}`);
  }
}
