import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-course-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-5 sm:p-6 bg-white border border-[#D7DBDE] rounded-xs shadow-2xs space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D7DBDE] pb-3">
        <div>
          <h3 class="text-xs sm:text-sm font-bold text-[#1B1D1F] font-heading flex items-center gap-2">
            <svg class="w-4 h-4 text-[#F0791E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Bloc-Notes Personnel d'Étude</span>
          </h3>
          <p class="text-[11px] text-[#4B5157]">Vos notes personnelles restent strictement privées et associées à cette leçon.</p>
        </div>

        <div class="flex items-center gap-2">
          @if (currentVideoTime > 0) {
            <button
              type="button"
              (click)="insererMinutage()"
              class="px-3 py-1.5 rounded-xs bg-[#E7F1FA] hover:bg-[#d0e4f5] text-[#1C75BC] border border-[#1C75BC]/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Insérer le minutage actuel de la vidéo dans les notes"
            >
              <span>⏱ Insérer {{ formatVideoSeconds(currentVideoTime) }}</span>
            </button>
          }
        </div>
      </div>

      <div>
        <textarea
          [(ngModel)]="notes"
          rows="6"
          placeholder="Consignez vos réflexions, définitions et repères temporels ici..."
          class="w-full p-3.5 bg-[#F5F6F7] border border-[#D7DBDE] rounded-xs text-xs font-sans text-[#1B1D1F] focus:border-[#1C75BC] focus:bg-white focus:outline-none transition-all leading-relaxed"
        ></textarea>
      </div>

      <div class="flex items-center justify-between pt-1">
        <span class="text-[10px] text-[#71787E] font-mono">
          {{ notes.length }} caractères enregistrés
        </span>

        <button
          type="button"
          (click)="onSauvegarder()"
          [disabled]="saving"
          class="px-5 py-2 rounded-xs bg-[#1C75BC] hover:bg-[#124F80] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          @if (saving) {
            <span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Enregistrement...</span>
          } @else {
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Enregistrer mes notes</span>
          }
        </button>
      </div>
    </div>
  `,
})
export class CourseNotesComponent {
  @Input() notes = '';
  @Input() currentVideoTime = 0;
  @Input() saving = false;

  @Output() saveNotes = new EventEmitter<string>();

  formatVideoSeconds(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  insererMinutage(): void {
    const tag = ` [⏱ ${this.formatVideoSeconds(this.currentVideoTime)}] `;
    this.notes = (this.notes || '') + tag;
  }

  onSauvegarder(): void {
    this.saveNotes.emit(this.notes);
  }
}
