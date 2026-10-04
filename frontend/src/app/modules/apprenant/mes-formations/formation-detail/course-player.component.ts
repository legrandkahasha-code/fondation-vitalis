import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeResourceUrl } from '@angular/platform-browser';
import { CoursContenu } from '../../../../core/services/apprenant.service';

@Component({
  selector: 'app-course-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Media Player Display -->
      @if (safeMediaUrl) {
        @if (isVideo(cours.fileUrl || '')) {
          <div class="relative bg-black rounded-xs overflow-hidden shadow-md group">
            <video
              #videoPlayer
              [src]="cours.fileUrl"
              controls
              class="w-full max-h-[520px] aspect-video object-contain mx-auto"
              (timeupdate)="onVideoTimeUpdate($event)"
            ></video>

            <!-- Video Controls Bar (Playback Speed & Resume Badge) -->
            <div class="p-3 bg-[#1B1D1F] text-white flex flex-wrap items-center justify-between gap-3 text-xs border-t border-white/10">
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-[#9AA1A8] font-semibold">Vitesse :</span>
                @for (rate of playbackRates; track rate) {
                  <button
                    type="button"
                    (click)="setPlaybackRate(rate)"
                    class="px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold transition-all cursor-pointer"
                    [class]="selectedPlaybackRate === rate ? 'bg-[#1C75BC] text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'"
                  >
                    {{ rate }}x
                  </button>
                }
              </div>

              <div class="flex items-center gap-2">
                @if (savedPlaybackTime > 0) {
                  <button
                    type="button"
                    (click)="reprendreLecture()"
                    class="px-2.5 py-1 rounded-xs bg-[#F0791E] hover:bg-[#d96612] text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer animate-pulse"
                  >
                    <span>▶ Reprendre à {{ formatVideoSeconds(savedPlaybackTime) }}</span>
                  </button>
                }
                <button
                  type="button"
                  (click)="onNoterMinutage()"
                  class="px-2.5 py-1 rounded-xs bg-[#E7F1FA] text-[#1C75BC] hover:bg-[#1C75BC] hover:text-white border border-[#1C75BC]/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Ajouter un repère dans vos notes d'étude"
                >
                  <span>📝 Noter à {{ formatVideoSeconds(currentVideoTime) }}</span>
                </button>
                <button
                  type="button"
                  (click)="toggleFullscreen()"
                  class="px-2.5 py-1 rounded-xs bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  title="Basculer en plein écran"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>Plein écran</span>
                </button>
              </div>
            </div>
          </div>
        } @else if (isPdf(cours.fileUrl || '')) {
          <div class="border border-[#D7DBDE] rounded-xs bg-white overflow-hidden shadow-xs">
            <div class="p-3 bg-[#F5F6F7] border-b border-[#D7DBDE] flex items-center justify-between text-xs">
              <span class="font-bold text-[#1B1D1F]">Support PDF Officiel</span>
              <a
                [href]="cours.fileUrl"
                target="_blank"
                class="text-[#1C75BC] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Ouvrir dans un nouvel onglet</span>
                <span>↗</span>
              </a>
            </div>
            <iframe
              [src]="safeMediaUrl"
              class="w-full h-[520px] bg-white"
              title="Support de cours PDF"
            ></iframe>
          </div>
        } @else if (isImage(cours.fileUrl || '')) {
          <div class="p-4 bg-white border border-[#D7DBDE] rounded-xs text-center shadow-xs">
            <img
              [src]="cours.fileUrl"
              [alt]="cours.titre"
              class="max-h-[500px] max-w-full mx-auto object-contain rounded-xs"
            />
          </div>
        }
      }
    </div>
  `,
})
export class CoursePlayerComponent implements OnChanges {
  @Input({ required: true }) cours!: CoursContenu;
  @Input() safeMediaUrl: SafeResourceUrl | null = null;
  @Input() marking = false;

  @Output() markComplete = new EventEmitter<string>();
  @Output() timeUpdate = new EventEmitter<number>();
  @Output() timestampNote = new EventEmitter<number>();

  @ViewChild('videoPlayer') videoPlayerRef?: ElementRef<HTMLVideoElement>;

  playbackRates = [0.75, 1, 1.25, 1.5, 2];
  selectedPlaybackRate = 1;
  savedPlaybackTime = 0;
  currentVideoTime = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cours'] && this.cours) {
      this.selectedPlaybackRate = 1;
      const saved = localStorage.getItem('playback_' + this.cours.id);
      this.savedPlaybackTime = saved ? parseInt(saved, 10) : 0;
    }
  }

  onVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video) {
      this.currentVideoTime = Math.floor(video.currentTime);
      if (this.currentVideoTime > 3) {
        localStorage.setItem('playback_' + this.cours.id, this.currentVideoTime.toString());
      }
      this.timeUpdate.emit(this.currentVideoTime);
    }
  }

  setPlaybackRate(rate: number): void {
    this.selectedPlaybackRate = rate;
    if (this.videoPlayerRef?.nativeElement) {
      this.videoPlayerRef.nativeElement.playbackRate = rate;
    }
  }

  reprendreLecture(): void {
    if (this.videoPlayerRef?.nativeElement && this.savedPlaybackTime > 0) {
      this.videoPlayerRef.nativeElement.currentTime = this.savedPlaybackTime;
      this.videoPlayerRef.nativeElement.play();
      this.savedPlaybackTime = 0;
    }
  }

  toggleFullscreen(): void {
    const video = this.videoPlayerRef?.nativeElement;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  }

  formatVideoSeconds(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  onMarkComplete(): void {
    this.markComplete.emit(this.cours.id);
  }

  onNoterMinutage(): void {
    this.timestampNote.emit(this.currentVideoTime);
  }

  isPdf(url: string): boolean {
    if (!url) return false;
    return url.toLowerCase().split('?')[0].endsWith('.pdf');
  }

  isVideo(url: string): boolean {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.ogg');
  }

  isImage(url: string): boolean {
    if (!url) return false;
    const clean = url.toLowerCase().split('?')[0];
    return clean.endsWith('.jpg') || clean.endsWith('.jpeg') || clean.endsWith('.png') || clean.endsWith('.webp') || clean.endsWith('.svg');
  }
}
