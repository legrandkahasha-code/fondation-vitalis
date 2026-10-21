import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { UtilisateursService } from '../../../core/services/utilisateurs.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Utilisateur } from '../../../core/models';

@Component({
  selector: 'app-utilisateurs-etab',
  standalone: true,
  imports: [MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="p-4 sm:p-8 max-w-6xl mx-auto">
        <h1 class="text-2xl sm:text-3xl font-bold text-vc-primary font-heading mb-6 sm:mb-8">Utilisateurs de mon établissement</h1>
        <div class="card overflow-x-auto p-0">
          <table class="w-full min-w-[650px]">
            <thead><tr class="text-white text-left" style="background: var(--color-vc-primary);">
              <th class="px-4 py-3">Nom</th><th class="px-4 py-3">Email</th><th class="px-4 py-3">Rôle</th>
              <th class="px-4 py-3">Statut</th><th class="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              @for (u of utilisateurs; track u.id) {
                <tr class="border-b hover:bg-slate-50">
                  <td class="px-4 py-3">{{ u.prenom }} {{ u.nom }}</td>
                  <td class="px-4 py-3 text-sm">{{ u.email }}</td>
                  <td class="px-4 py-3"><span class="badge badge-formateur text-[10px]">{{ u.role }}</span></td>
                  <td class="px-4 py-3">
                    <span class="badge" [class]="u.actif !== false ? 'badge-personnel-admin' : 'bg-slate-400 text-white'">
                      {{ u.actif !== false ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    @if (u.role === 'APPRENANT') {
                      <button class="btn btn-outline text-xs py-1 px-2" (click)="toggleActif(u)">
                        {{ u.actif !== false ? 'Désactiver' : 'Activer' }}
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </app-main-layout>
  `,
})
export class UtilisateursEtabComponent implements OnInit {
  utilisateurs: Utilisateur[] = [];

  constructor(private auth: AuthService, private service: UtilisateursService) {}

  ngOnInit() {
    const etabId = this.auth.currentUser?.etablissementId;
    if (etabId) {
      this.service.getByEtablissement(etabId).subscribe({ next: (u) => this.utilisateurs = u });
    }
  }

  toggleActif(u: Utilisateur) {
    this.service.setActif(u.id, u.actif === false).subscribe({
      next: () => { u.actif = u.actif === false; },
    });
  }
}
