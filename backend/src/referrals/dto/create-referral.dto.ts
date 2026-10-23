import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Decision } from '../../generated/prisma/client';

// The doctor's decision on one assessment
export class CreateReferralDto {
  @IsUUID()
  assessmentId: string;

  @IsIn(['APPROVED', 'OVERRIDDEN', 'NO_REFERRAL'])
  decision: Decision;

  // required for OVERRIDDEN, and for APPROVED when the model suggested routine care
  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}
