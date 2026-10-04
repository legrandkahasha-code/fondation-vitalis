import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReleveNotesBulletin } from '../../../../core/services/apprenant.service';

@Component({
  selector: 'app-releve-notes-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div
        (click)="close.emit()"
        class="fixed inset-0 z-50 bg-[#1B1D1F]/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in"
      >
        <div
          (click)="$event.stopPropagation()"
          class="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-[#D7DBDE] shadow-2xl rounded-xs"
        >
          <!-- Modal Header -->
          <div class="px-5 py-4 border-b border-[#D7DBDE] bg-[#124F80] text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xs bg-white text-[#124F80] font-bold flex items-center justify-center text-xs shadow-xs">
                VC
              </div>
              <div>
                <h3 class="text-sm font-bold text-white font-heading leading-tight">Relevé de Notes Académique Officiel</h3>
                <p class="text-[10px] text-[#C6D2E3] font-mono">Bulletin certifié · Vitalis Center EUP</p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="imprimer()"
                class="px-3 py-1 rounded-xs bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimer</span>
              </button>
              <button
                type="button"
                (click)="close.emit()"
                class="w-7 h-7 rounded-xs hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Modal Body (Printable area) -->
          <div id="releve-printable" class="p-6 md:p-8 overflow-y-auto space-y-6 text-[#1B1D1F]">
            @if (loading) {
              <div class="p-12 text-center text-[#4B5157]">
                <div class="inline-block w-8 h-8 border-3 border-[#1C75BC] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p class="text-xs font-semibold">Génération du relevé officiel en cours...</p>
              </div>
            } @else if (releve) {
              <!-- Official Header -->
              <div class="flex items-center justify-between pb-4 border-b-2 border-[#124F80] gap-4">
                <div>
                  <h2 class="text-lg font-bold text-[#124F80] font-heading">RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</h2>
                  <p class="text-[10px] text-[#4B5157] font-semibold">MINISTÈRE DE LA FORMATION PROFESSIONNELLE</p>
                  <p class="text-[9px] text-[#4B5157]">Établissement d'Utilité Publique VITALIS CENTER · CFP 00095</p>
                </div>
                <div class="text-right font-mono text-[11px] text-[#4B5157]">
                  <p class="font-bold text-[#1B1D1F]">Édité le : {{ releve.dateEdition | date:'dd/MM/yyyy à HH:mm' }}</p>
                  <p>Antenne : {{ releve.formation.etablissement.nom }}</p>
                </div>
              </div>

              <!-- Student & Formation Profile -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs">
                <div>
                  <span class="text-[10px] uppercase font-bold text-[#4B5157] block">Apprenant</span>
                  <p class="font-bold text-[#1B1D1F] text-sm">{{ releve.apprenant.prenom }} {{ releve.apprenant.nom }}</p>
                  <p class="text-[11px] text-[#4B5157] font-mono">{{ releve.apprenant.email }}</p>
                  <p class="text-[10px] text-[#1C75BC] font-mono">Matricule : {{ releve.apprenant.id.substring(0, 8).toUpperCase() }}</p>
                </div>
                <div>
                  <span class="text-[10px] uppercase font-bold text-[#4B5157] block">Formation Suivie</span>
                  <p class="font-bold text-[#1B1D1F]">{{ releve.formation.titre }}</p>
                  <p class="text-[11px] text-[#4B5157]">Règle de validation : BR-03 (Moyenne &ge; 10/20)</p>
                </div>
              </div>

              <!-- Table of Grades -->
              <div class="overflow-x-auto border border-[#D7DBDE] rounded-xs">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="bg-[#124F80] text-white text-[11px] uppercase tracking-wider">
                      <th class="p-3 font-semibold">Module</th>
                      <th class="p-3 font-semibold text-center w-20">Coeff.</th>
                      <th class="p-3 font-semibold">Épreuves Évaluées</th>
                      <th class="p-3 font-semibold text-right w-28">Moyenne Module</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#D7DBDE]">
                    @for (m of releve.modules; track m.id) {
                      <tr class="hover:bg-[#F5F6F7]">
                        <td class="p-3 font-bold text-[#1B1D1F] align-top">
                          {{ m.titre }}
                        </td>
                        <td class="p-3 font-mono text-center align-top text-[#4B5157]">
                          {{ m.coefficient }}
                        </td>
                        <td class="p-3 align-top">
                          @if (m.epreuves.length === 0) {
                            <span class="text-[11px] text-[#4B5157] italic">Aucune note enregistrée</span>
                          } @else {
                            <div class="space-y-1">
                              @for (el of m.epreuves; track el.titre) {
                                <div class="flex items-center justify-between text-[11px] gap-2">
                                  <span class="text-[#4B5157] truncate max-w-xs">
                                    <strong class="text-[10px] uppercase" [class]="el.type === 'evaluation' ? 'text-[#1C75BC]' : el.type === 'devoir' ? 'text-[#F0791E]' : 'text-[#276B44]'">[{{ el.type }}]</strong> {{ el.titre }}
                                  </span>
                                  <span class="font-mono font-bold text-[#1B1D1F] shrink-0">
                                    {{ el.noteSur20 !== null ? (el.noteSur20 + '/20') : 'En attente' }}
                                  </span>
                                </div>
                              }
                            </div>
                          }
                        </td>
                        <td class="p-3 text-right font-mono font-black text-sm align-top" [class]="(m.moyenneModule ?? 0) >= 10 ? 'text-[#276B44]' : 'text-[#ED1C24]'">
                          {{ m.moyenneModule !== null ? (m.moyenneModule | number:'1.2-2') : '-' }}/20
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Summary & Deliberation -->
              <div class="p-5 bg-[#E7F1FA] border-2 border-[#1C75BC] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                  <span class="text-[10px] uppercase font-bold text-[#124F80] tracking-wider">Résultat Académique Général</span>
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-bold text-[#1B1D1F]">Mention :</span>
                    <span class="px-2.5 py-0.5 rounded-xs bg-white text-[#124F80] border border-[#124F80] text-xs font-black uppercase">
                      {{ releve.mention }}
                    </span>
                  </div>
                  <p class="text-[11px] text-[#4B5157]">
                    Statut :
                    <strong [class]="releve.moyenneGenerale >= 10 ? 'text-[#276B44]' : 'text-[#ED1C24]'">
                      {{ releve.moyenneGenerale >= 10 ? 'ADMIS (BR-03)' : 'EN COURS / AJOURNÉ' }}
                    </strong>
                  </p>
                </div>

                <div class="text-right sm:border-l border-[#1C75BC]/30 sm:pl-6">
                  <span class="text-[10px] uppercase font-bold text-[#4B5157] block">Moyenne Générale</span>
                  <span class="text-3xl font-black font-mono leading-none" [class]="releve.moyenneGenerale >= 10 ? 'text-[#276B44]' : 'text-[#ED1C24]'">
                    {{ releve.moyenneGenerale | number:'1.2-2' }}
                  </span>
                  <span class="text-xs font-bold text-[#4B5157]"> / 20</span>
                </div>
              </div>

              <!-- Legal Mention & Watermark -->
              <div class="pt-4 border-t border-[#D7DBDE] text-[10px] text-[#4B5157] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>Document officiel délivré sous signature électronique sécurisée par Vitalis Center EUP.</span>
                <span class="font-mono">Cachet de conformité vérifiable sur portail national</span>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @media print {
      body * {
        visibility: hidden;
      }
      #releve-printable, #releve-printable * {
        visibility: visible;
      }
      #releve-printable {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
    }
  `]
})
export class ReleveNotesModalComponent {
  @Input() isOpen = false;
  @Input() loading = false;
  @Input() releve: ReleveNotesBulletin | null = null;
  @Output() close = new EventEmitter<void>();

  imprimer(): void {
    window.print();
  }
}
