import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateUacrResultDto {
  @IsUUID()
  assessmentId: string;

  // urine albumin-creatinine ratio, mg/g
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5000)
  valueMgG: number;

  // defaults to true when the assessment already has a result
  @IsOptional()
  @IsBoolean()
  isRepeat?: boolean;
}
