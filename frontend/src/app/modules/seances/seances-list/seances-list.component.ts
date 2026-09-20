import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SeancesService } from '../../../core/services/seances.service';
import { PedagogieService } from '../../../core/services/pedagogie.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { MainLayoutComponent } from '../../../shared/layout/main-layout.component';
import { Seance, Formation } from '../../../core/models';

@Component({
  selector: 'app-seances-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MainLayoutComponent, DatePipe],
  template: `
    <app-main-layout>
      <div class="p-8 max-w-6xl mx-auto">
        <div class="flex justify-between items-center mb-8">
          <h1 class="text-3xl font-bold text-vc-primary font-heading">Séances de formation</h1>
          <button class="btn btn-primary" (click)="toggleForm()">{{ showForm ? 'Annuler' : '+ Planifier' }}</button>
        </div>

        @if (showForm) {
          <div class="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class="form-label">Module (via formation)</label>
              <select class="form-input" [(ngModel)]="form.moduleId">
                @for (m of allModules; track m.id) {
                  <option [value]="m.id">{{ m.formationTitre }} — {{ m.titre }}</option>
                }
              </select>
            </div>
            <div><label class="form-label">Titre activité</label><input class="form-input" [(ngModel)]="form.titreActivite" /></div>
            <div><label class="form-label">Type</label>
              <select class="form-input" [(ngModel)]="form.typeSession">
                <option value="THEORIQUE">Théorique</option><option value="PRATIQUE">Pratique</option>
                <option value="ATELIER">Atelier</option><option value="EVALUATION">Évaluation</option>
              </select>
            </div>
            <div><label class="form-label">Salle / Lien</label><input class="form-input" [(ngModel)]="form.salleOuLien" /></div>
            <div><label class="form-label">Début</label><input class="form-input" type="datetime-local" [(ngModel)]="form.dateHeureDebut" /></div>
            <div><label class="form-label">Fin</label><input class="form-input" type="datetime-local" [(ngModel)]="form.dateHeureFin" /></div>
            <button class="btn btn-primary md:col-span-2 w-fit" (click)="create()">Planifier la séance</button>
          </div>
        }

        <!-- Skeleton Loader -->
        @if (loading) {
          <div class="space-y-4">
            @for (i of [1,2,3,4]; track i) {
              <div class="card block animate-pulse">
                <div class="flex justify-between">
                  <div class="space-y-2 flex-1">
                    <div class="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div class="h-3 bg-slate-100 rounded w-1/2 mt-2"></div>
                    <div class="h-3 bg-slate-100 rounded w-1/4 mt-1"></div>
                  </div>
                  <div class="h-6 bg-slate-200 rounded w-20 self-start"></div>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="space-y-4">
            @for (s of seances; track s.id) {
              <a [routerLink]="['/seances', s.id]" class="card block no-underline cursor-pointer">
                <div class="flex justify-between">
                  <div>
                    <h3 class="font-bold">{{ s.titreActivite }}</h3>
                    <p class="text-sm text-slate-500">{{ s.module?.formation?.titre }} — {{ s.typeSession }}</p>
                    <p class="text-xs text-vc-secondary mt-1">{{ s.dateHeureDebut | date:'dd/MM/yyyy HH:mm' }} → {{ s.dateHeureFin | date:'HH:mm' }}</p>
                  </div>
                  <span class="badge badge-formateur">{{ s._count?.presences ?? 0 }} présences</span>
                </div>
              </a>
            }
            @if (seances.length === 0) {
              <div class="text-center text-slate-400 py-12">Aucune séance planifiée pour le moment.</div>
            }
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class SeancesListComponent implements OnInit, OnDestroy {
  seances: Seance[] = [];
  allModules: { id: string; titre: string; formationTitre: string }[] = [];
  showForm = false;
  loading = true;
  form = { moduleId: '', titreActivite: '', typeSession: 'THEORIQUE', dateHeureDebut: '', dateHeureFin: '', salleOuLien: '' };

  private sseSub?: Subscription;
  private pollSub?: Subscription;

  constructor(
    private seancesService: SeancesService,
    private pedagogie: PedagogieService,
    private notifications: NotificationsService,
  ) {}

  ngOnInit() {
    this.loadData();

    // ─── Flux Temps Réel SSE : Réception immédiate dès qu'une séance est planifiée/modifiée ───
    this.sseSub = this.notifications.messages().subscribe((msg) => {
      if (msg.type === 'SEANCE_UPDATE') {
        this.seancesService.invalidateCache();
        this.loadData(true);
      }
    });

    // Filet de sécurité périodique (60s)
    this.pollSub = timer(60_000, 60_000).pipe(
      switchMap(() => this.seancesService.getAll(true))
    ).subscribe({
      next: (s) => this.seances = s,
    });
  }

  ngOnDestroy() {
    this.sseSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm && this.allModules.length === 0) {
      this.loadModules();
    }
  }

  private loadModules() {
    this.pedagogie.getFormations().subscribe({
      next: (formations) => {
        this.allModules = [];
        formations.forEach(f =>
          f.modules?.forEach(m =>
            this.allModules.push({ id: m.id, titre: m.titre, formationTitre: f.titre })
          )
        );
        if (this.allModules.length > 0 && !this.form.moduleId) {
          this.form.moduleId = this.allModules[0].id;
        }
      },
    });
  }

  private loadData(forceRefresh = false) {
    this.seancesService.getAll(forceRefresh).subscribe({
      next: (s) => {
        this.seances = s;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  create() {
    this.seancesService.create({
      ...this.form,
      dateHeureDebut: new Date(this.form.dateHeureDebut).toISOString(),
      dateHeureFin: new Date(this.form.dateHeureFin).toISOString(),
    }).subscribe({
      next: () => {
        this.showForm = false;
        this.seancesService.invalidateCache();
        this.loadData(true);
      },
    });
  }
}
