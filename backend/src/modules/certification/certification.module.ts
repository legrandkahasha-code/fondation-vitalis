import { Module } from '@nestjs/common';
import { CertificationController } from './certification.controller';
import { CertificationService } from './certification.service';
import { CertificationListener } from './listeners/certification.listener';
import { PedagogieModule } from '../pedagogie/pedagogie.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PedagogieModule, NotificationsModule],
  controllers: [CertificationController],
  providers: [CertificationService, CertificationListener],
  exports: [CertificationService],
})
export class CertificationModule {}
