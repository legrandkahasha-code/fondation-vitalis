import { Module } from '@nestjs/common';
import { SeancesController } from './seances.controller';
import { SeancesService } from './seances.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SeancesController],
  providers: [SeancesService],
  exports: [SeancesService],
})
export class SeancesModule {}
