import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ClinicSector } from '../../generated/prisma/client';

export class ClinicQueryDto {
  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  sector?: ClinicSector;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  barangayId?: number;
}
