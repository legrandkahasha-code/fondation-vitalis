import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RattrapageService } from './rattrapage.service';
import { RattrapageController } from './rattrapage.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [RattrapageController],
  providers: [RattrapageService],
  exports: [RattrapageService],
})
export class RattrapageModule {}
