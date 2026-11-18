import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_PIPE, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { UtilisateursModule } from './modules/utilisateurs/utilisateurs.module';
import { EtablissementsModule } from './modules/etablissements/etablissements.module';
import { PedagogieModule } from './modules/pedagogie/pedagogie.module';
import { CertificationModule } from './modules/certification/certification.module';
import { SeancesModule } from './modules/seances/seances.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { DevoirsModule } from './modules/devoirs/devoirs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LandingModule } from './modules/landing/landing.module';
import { ApprenantModule } from './modules/apprenant/apprenant.module';
import { AdmissionModule } from './modules/admission/admission.module';
import { RattrapageModule } from './modules/rattrapage/rattrapage.module';
import { EnquetesModule } from './modules/enquetes/enquetes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { EtablissementGuard } from './common/guards/etablissement.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env'],
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
    CommonModule,
    PrismaModule,
    UtilisateursModule,
    EtablissementsModule,
    PedagogieModule,
    CertificationModule,
    SeancesModule,
    AnalyticsModule,
    QuizModule,
    DevoirsModule,
    NotificationsModule,
    LandingModule,
    ApprenantModule,
    AdmissionModule,
    RattrapageModule,
    EnquetesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EtablissementGuard,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
