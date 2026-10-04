import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';
import { getHomeRouteForRole } from '../../../core/guards/auth.guard';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  loading = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | '' = '';
  year = new Date().getFullYear();
  private notificationTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private notifSub: Subscription | null = null;

  constructor(private authService: AuthService, private router: Router, private notifications: NotificationsService, private toast: ToastService) {}

  ngOnInit() {
    this.notifSub = this.notifications.messages().subscribe({
      next: (m) => {
        if (m && m.type === 'auth') {
          this.showNotification(m.event === 'login' ? 'success' : 'success', m.message || 'Notification');
        }
      },
      error: () => {},
    });
  }

  ngOnDestroy() {
    if (this.notifSub) this.notifSub.unsubscribe();
  }

  private showNotification(type: 'success' | 'error', message: string) {
    try { this.toast.show(message, type); } catch {}
    this.notificationType = type;
    this.notificationMessage = message;
    if (this.notificationTimeoutId) {
      clearTimeout(this.notificationTimeoutId);
    }
    this.notificationTimeoutId = setTimeout(() => {
      this.notificationMessage = '';
      this.notificationType = '';
      this.notificationTimeoutId = null;
    }, 8000);
    console.log('[LoginComponent] showNotification', type, message);
  }
  
  dismissNotification() {
    if (this.notificationTimeoutId) { 
      clearTimeout(this.notificationTimeoutId); 
      this.notificationTimeoutId = null; 
    }
    this.notificationMessage = '';
    this.notificationType = '';
  }

  private getErrorMessage(err: any): string {
    if (!err || !err.status) {
      return 'Erreur de connexion. Veuillez réessayer.';
    }
    if (err.status === 401) {
      return 'Email ou mot de passe incorrect. Vérifiez vos identifiants.';
    }
    if (err.status === 403) {
      return 'Accès refusé. Votre compte n\u2019est pas autorisé à se connecter ici.';
    }
    if (err.status === 0) {
      return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
    }
    return err.error?.message || 'Erreur de connexion. Veuillez réessayer.';
  }

  onSubmit() {
    this.loading = true;
    this.notificationMessage = '';
    this.notificationType = '';
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        const homeRoute = getHomeRouteForRole(res.utilisateur?.role);
        this.showNotification('success', 'Connexion réussie ! Redirection en cours...');
        this.loading = false;
        setTimeout(() => this.router.navigate([homeRoute]), 700);
      },
      error: (err) => {
        this.showNotification('error', this.getErrorMessage(err));
        this.loading = false;
      },
    });
  }
}
