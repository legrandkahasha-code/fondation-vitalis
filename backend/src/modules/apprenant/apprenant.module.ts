import { Module } from '@nestjs/common';
import { ApprenantController } from './apprenant.controller';
import { ApprenantService } from './apprenant.service';
import { ApprenantCertificationHandler } from './services/apprenant-certification.handler';
import { PedagogieModule } from '../pedagogie/pedagogie.module';
import { CertificationModule } from '../certification/certification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdmissionModule } from '../admission/admission.module';

@Module({
  imports: [PedagogieModule, CertificationModule, NotificationsModule, AdmissionModule],
  controllers: [ApprenantController],
  providers: [ApprenantService, ApprenantCertificationHandler],
  exports: [ApprenantService, ApprenantCertificationHandler],
})
export class ApprenantModule {}

