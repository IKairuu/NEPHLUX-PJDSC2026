import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BarangayQueryDto {
  // case-insensitive match on the barangay name
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  // boundaries add ~85 KB for all 80 barangays, so they are opt-in
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeBoundary?: boolean;
}
