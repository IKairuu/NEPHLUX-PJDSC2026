import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const FOLLOW_UP_TABS = [
  'MISSED',
  'PENDING',
  'OVERRIDES',
  'RECHECK',
  'DONE',
] as const;
export type FollowUpTab = (typeof FOLLOW_UP_TABS)[number];

export class FollowUpSummaryQueryDto {
  // BHWs always get their own barangay; ADMIN may pick one (or all when left out)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  barangayId?: number;
}

export class FollowUpQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  barangayId?: number;

  @IsOptional()
  @IsIn(FOLLOW_UP_TABS)
  tab: FollowUpTab = 'MISSED';
}
