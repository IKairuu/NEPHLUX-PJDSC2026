import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AccessRequestStatus } from '../../generated/prisma/client';

export class AccessRequestQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: AccessRequestStatus;
}
