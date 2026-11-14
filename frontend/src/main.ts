import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Injection dynamique de theme-color pour Chrome, Edge et Safari mobile (sans avertissement statique HTML)
if (typeof document !== 'undefined') {
  const metaTheme = document.createElement('meta');
  metaTheme.name = 'theme-color';
  metaTheme.content = '#124F80';
  document.head.appendChild(metaTheme);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
