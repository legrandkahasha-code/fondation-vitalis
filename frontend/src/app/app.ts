import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NotificationsService } from './core/services/notifications.service';
import { AuthService } from './core/services/auth.service';
import { ToastComponent } from './core/components/toast.component';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  template: `<router-outlet></router-outlet><app-toast></app-toast>`,
})
export class App implements OnInit {
  constructor(
    private notifications: NotificationsService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Restauration de l'URL si arrivée via un fallback 404 de l'hébergeur statique
    try {
      const redirect = sessionStorage.getItem('spa_redirect');
      if (redirect) {
        sessionStorage.removeItem('spa_redirect');
        this.router.navigateByUrl(redirect);
      }
    } catch (e) {
      // Ignorer si sessionStorage indisponible
    }

    // Attendre que l'AuthService soit prêt (loadMe() terminé) avant d'ouvrir le SSE.
    // Cela garantit que le token en localStorage est frais et valide au moment de connect().
    this.auth.isReady$.pipe(
      filter((ready) => ready),
      take(1),
    ).subscribe(() => {
      try {
        this.notifications.connect();
      } catch (e) {
        console.error('[App] Échec connexion SSE notifications:', e);
      }
    });
  }
}
