import { Controller, Sse, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationsService, NotificationPayload } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * SSE stream authentifié — filtré par utilisateur.
   * Chaque client reçoit uniquement les événements qui le concernent
   * (événement ciblé recipientUserId ou diffusion établissement recipientEtablissementId).
   * Le token JWT est passé en query param car EventSource ne supporte pas les headers Authorization.
   * Ex: new EventSource('/api/notifications/sse?token=<jwt>')
   */
  @UseGuards(JwtAuthGuard)
  @Sse('sse')
  sse(@Req() req: any): Observable<MessageEvent> {
    return this.notifications.streamForUser({
      id: req.user.id,
      etablissementId: req.user.etablissementId,
      role: req.user.role,
    }).pipe(
      map((payload: NotificationPayload) => ({ data: payload } as unknown as MessageEvent)),
    );
  }
}
