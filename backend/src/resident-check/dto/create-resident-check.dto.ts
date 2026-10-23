import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

// The resident's answers. Nothing in this body is stored.
export class CreateResidentCheckDto {
  @IsInt()
  @Min(20)
  @Max(100)
  age: number;

  @IsBoolean()
  female: boolean;

  @IsBoolean()
  dmHx: boolean;

  @IsBoolean()
  htnHx: boolean;

  @IsBoolean()
  bpMed: boolean;

  @IsBoolean()
  cvdHx: boolean;

  @IsBoolean()
  smoker: boolean;

  @IsBoolean()
  famDm: boolean;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(25)
  @Max(250)
  weightKg: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(120)
  @Max(220)
  heightCm: number;

  // used only to show the nearest YAKAP clinics and to fill the clinic code
  @IsOptional()
  @IsInt()
  @Min(1)
  barangayId?: number;
}
