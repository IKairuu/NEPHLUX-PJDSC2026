import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { DipstickGrade, LabUnits } from '../../generated/prisma/client';

const GRADES = ['NEG', 'TRACE', 'ONE_PLUS', 'TWO_PLUS', 'THREE_PLUS'];

// One YAKAP lab review. Lab values are in the units the doctor typed (labUnits);
// the service converts them to conventional units before storing and scoring.
export class CreateAssessmentDto {
  // a follow-up visit for a patient already on record; otherwise initials + barangayId
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ValidateIf((o: CreateAssessmentDto) => !o.patientId)
  @IsString()
  @Matches(/^[A-Za-z]\.?(\s?[A-Za-z]\.?){0,3}$/, {
    message: 'initials must be initials only, like R.S. (never a full name)',
  })
  initials?: string;

  @ValidateIf((o: CreateAssessmentDto) => !o.patientId)
  @IsInt()
  @Min(1)
  barangayId?: number;

  // the resident clinic code, when the patient brought one
  @IsOptional()
  @IsString()
  residentCode?: string;

  @IsOptional()
  @IsBoolean()
  codeConfirmed?: boolean;

  @IsInt()
  @Min(20)
  @Max(100)
  age: number;

  @IsBoolean()
  female: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(25)
  @Max(250)
  weightKg: number;

  @Type(() => Number)
  @IsNumber()
  @Min(120)
  @Max(220)
  heightCm: number;

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

  // blood pressure, mean of 2-3 readings
  @Type(() => Number)
  @IsNumber()
  @Min(60)
  @Max(260)
  sbp: number;

  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(160)
  dbp: number;

  @IsIn(['SI', 'CONVENTIONAL'])
  labUnits: LabUnits;

  @Type(() => Number)
  @IsNumber()
  @Min(3)
  @Max(20)
  hba1cPct: number;

  // µmol/L (SI) or mg/dL
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  creatinine: number;

  // mmol/L (SI) or mg/dL
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  totalCholesterol: number;

  // mmol/L (SI) or mg/dL
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  hdl: number;

  // g/L (SI) or g/dL
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  hemoglobin: number;

  // x10^9/L in both unit systems
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(100)
  wbc: number;

  @Type(() => Number)
  @IsNumber()
  @Min(5)
  @Max(2000)
  platelets: number;

  // YAKAP urinalysis dipstick, when it is done. Protein is needed for Step 2U;
  // blood, glucose and specific gravity are optional.
  @IsOptional()
  @IsIn(GRADES)
  dipProtein?: DipstickGrade;

  @IsOptional()
  @IsIn(GRADES)
  dipBlood?: DipstickGrade;

  @IsOptional()
  @IsIn(GRADES)
  dipGlucose?: DipstickGrade;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1.0)
  @Max(1.05)
  urineSg?: number;
}
