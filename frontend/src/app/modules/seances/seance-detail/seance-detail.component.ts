import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SeancesService } from '../../../core/services/seances.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Seance, Utilisateur } from '../../../core/models';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-seance-detail',
  standalone: true,
  imports: [FormsModule, MainLayoutComponent, DatePipe],
  template: `
    <app-main-layout>
      <div class="p-4 sm:p-8 max-w-4xl mx-auto">
        @if (seance) {
          <h1 class="text-2xl sm:text-3xl font-bold text-vc-primary font-heading mb-2">{{ seance.titreActivite }}</h1>
          <p class="text-slate-500 mb-6 text-sm">{{ seance.dateHeureDebut | date:'dd/MM/yyyy HH:mm' }} — {{ seance.typeSession }}</p>

          <div class="card">
            <h3 class="font-bold mb-4">Émargement électronique</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm min-w-[300px]">
              <thead><tr class="border-b"><th class="py-2 text-left">Apprenant</th><th class="py-2">Statut</th></tr></thead>
              <tbody>
                @for (a of apprenants; track a.id) {
                  <tr class="border-b">
                    <td class="py-2">{{ a.prenom }} {{ a.nom }}</td>
                    <td class="py-2">
                      <select class="form-input text-sm py-1" [(ngModel)]="statuts[a.id]">
                        <option value="PRESENT">Présent</option>
                        <option value="ABSENT">Absent</option>
                        <option value="RETARD">Retard</option>
                        <option value="JUSTIFIE">Justifié</option>
                      </select>
                    </td>
                  </tr>
                }
              </tbody>
              </table>
            </div>
            <button class="btn btn-primary mt-4" (click)="saveEmargement()">Enregistrer l'émargement</button>
            @if (message) { <p class="text-sm mt-2 text-vc-success">{{ message }}</p> }
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class SeanceDetailComponent implements OnInit {
  seance: Seance | null = null;
  apprenants: Utilisateur[] = [];
  statuts: Record<string, string> = {};
  message = '';

  constructor(private route: ActivatedRoute, private seancesService: SeancesService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.seancesService.getOne(id).subscribe({
      next: (s) => {
        this.seance = s;
        s.presences?.forEach(p => { this.statuts[p.utilisateurId] = p.statut; });
      },
    });
    this.seancesService.getApprenants(id).subscribe({
      next: (a) => {
        this.apprenants = a;
        a.forEach(u => { if (!this.statuts[u.id]) this.statuts[u.id] = 'ABSENT'; });
      },
    });
  }

  saveEmargement() {
    if (!this.seance) return;
    const presences = Object.entries(this.statuts).map(([apprenantId, statut]) => ({
      apprenantId,
      statut: statut as 'PRESENT' | 'ABSENT' | 'RETARD' | 'JUSTIFIE',
    }));
    this.seancesService.emargement(this.seance.id, presences).subscribe({
      next: () => { this.message = 'Émargement enregistré'; },
    });
  }
}
