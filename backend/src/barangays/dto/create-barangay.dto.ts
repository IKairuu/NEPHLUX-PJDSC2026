import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateBarangayDto {
  @Matches(/^\d{10}$/, { message: 'psgcCode must be a 10-digit PSGC code' })
  psgcCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  // position in PSGC order; stored inside the resident clinic code (7 bits)
  @IsInt()
  @Min(1)
  @Max(127)
  codeIndex: number;

  @IsInt()
  @Min(0)
  pop2020: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pop2024?: number;

  @IsOptional()
  @IsLatitude()
  centreLat?: number;

  @IsOptional()
  @IsLongitude()
  centreLon?: number;

  // GeoJSON polygon
  @IsOptional()
  @IsObject()
  boundary?: Record<string, unknown>;
}
