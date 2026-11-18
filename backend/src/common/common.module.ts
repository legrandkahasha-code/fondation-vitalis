import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StorageService } from './services/storage.service';
import { PdfService } from './services/pdf.service';
import { KeepAliveService } from './services/keep-alive.service';
import { AuthorizationService } from './services/authorization.service';
import { CacheService } from './services/cache.service';
import { CheckEnrollmentGuard } from './guards/check-enrollment.guard';

@Global()
@Module({
  providers: [Reflector, StorageService, PdfService, KeepAliveService, AuthorizationService, CacheService, CheckEnrollmentGuard],
  exports: [Reflector, StorageService, PdfService, KeepAliveService, AuthorizationService, CacheService, CheckEnrollmentGuard],
})
export class CommonModule {}
