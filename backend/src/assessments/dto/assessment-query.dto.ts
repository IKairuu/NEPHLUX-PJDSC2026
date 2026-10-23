import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RiskLevel } from '../../generated/prisma/client';

export class AssessmentQueryDto extends PaginationQueryDto {
  // PENDING = waiting for the doctor's decision (the queue)
  @IsOptional()
  @IsIn(['PENDING', 'DECIDED'])
  status?: 'PENDING' | 'DECIDED';

  @IsOptional()
  @IsIn(['HIGH', 'MODERATE', 'LOW'])
  riskLevel?: RiskLevel;
}
