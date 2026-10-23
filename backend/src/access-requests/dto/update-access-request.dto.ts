import { IsIn } from 'class-validator';
import type { AccessRequestStatus } from '../../generated/prisma/client';

// Only the review status can change. What the requester sent stays as sent,
// so this does not extend PartialType(CreateAccessRequestDto).
export class UpdateAccessRequestDto {
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status: AccessRequestStatus;
}
