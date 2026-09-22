import { SetMetadata } from '@nestjs/common';
import { EnrollmentScope, ResourceAction } from '../services/authorization.service';

export interface CheckEnrollmentOptions {
  resource: 'FORMATION' | 'MODULE' | 'COURS' | 'QUIZ' | 'DEVOIR' | 'SEANCE' | 'EVALUATION';
  paramName?: string;
  action?: ResourceAction;
  scope?: EnrollmentScope;
}

export const CHECK_ENROLLMENT_KEY = 'check_enrollment';
export const CheckEnrollment = (options: CheckEnrollmentOptions) =>
  SetMetadata(CHECK_ENROLLMENT_KEY, options);
