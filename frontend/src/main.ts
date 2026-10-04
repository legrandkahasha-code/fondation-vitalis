import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { NotificationsService } from './app/core/services/notifications.service';

// Injection dynamique de theme-color pour Chrome, Edge et Safari mobile (sans avertissement statique HTML)
if (typeof document !== 'undefined') {
  const metaTheme = document.createElement('meta');
  metaTheme.name = 'theme-color';
  metaTheme.content = '#124F80';
  document.head.appendChild(metaTheme);
}

bootstrapApplication(App, appConfig)
  .then((ref) => {
    try {
      const injector = (ref as any).injector ?? (ref as any).hostElement?.injector;
      if (injector && injector.get) {
        const notifications = injector.get(NotificationsService as any);
        if (notifications && typeof notifications.connect === 'function') {
          notifications.connect();
        }
      }
    } catch (e) {
      console.error('Failed to ensure notifications connect early', e);
    }
  })
  .catch((err) => console.error(err));
