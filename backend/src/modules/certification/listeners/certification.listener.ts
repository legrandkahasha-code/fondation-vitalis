import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CertificatDemandeAsyncEvent } from '../../../common/events/app.events';
import { CertificationService } from '../certification.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CertificationListener {
  private readonly logger = new Logger(CertificationListener.name);

  constructor(
    private readonly certService: CertificationService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent('certificat.demande_async', { async: true })
  async handleCertificatDemandeAsync(event: CertificatDemandeAsyncEvent) {
    this.logger.log(
      `[EventBus:Async] Découplage asynchrone : Génération certificat pour ${event.utilisateurId} (Formation ${event.formationId})`,
    );
    try {
      const baseUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
      const result = await this.certService.emettreCertificat(
        event.formationId,
        event.utilisateurId,
        baseUrl,
      );
      this.logger.log(
        `[EventBus:Async] Certificat généré avec succès: ${result.certificat?.numeroSerie ?? 'existant'}`,
      );
    } catch (err: any) {
      this.logger.error(`[EventBus:Async] Échec émission asynchrone certificat: ${err.message}`);
    }
  }
}
