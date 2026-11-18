import { Module } from '@nestjs/common';
import { PedagogieController } from './pedagogie.controller';
import { PedagogieService } from './pedagogie.service';
import { PedagogieAffectationService } from './services/pedagogie-affectation.service';
import { PedagogieGradingService } from './services/pedagogie-grading.service';
import { PedagogieSyncService } from './services/pedagogie-sync.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PedagogieController],
  providers: [
    PedagogieService,
    PedagogieAffectationService,
    PedagogieGradingService,
    PedagogieSyncService,
  ],
  exports: [
    PedagogieService,
    PedagogieAffectationService,
    PedagogieGradingService,
    PedagogieSyncService,
  ],
})
export class PedagogieModule {}
