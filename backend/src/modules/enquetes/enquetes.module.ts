import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EnquetesService } from './enquetes.service';
import { EnquetesController } from './enquetes.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [EnquetesController],
  providers: [EnquetesService],
  exports: [EnquetesService],
})
export class EnquetesModule {}
