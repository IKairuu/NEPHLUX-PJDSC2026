import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Decision } from '../../generated/prisma/client';

export class ReferralQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['APPROVED', 'OVERRIDDEN', 'NO_REFERRAL'])
  decision?: Decision;
}
