import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { ChoUnit } from '../../generated/prisma/client';

// ADMIN accounts are never requested from the public page
export const REQUESTABLE_ROLES = ['DOCTOR', 'BHW', 'CHO'] as const;
export type RequestableRole = (typeof REQUESTABLE_ROLES)[number];
export const CHO_UNITS = ['NCD', 'EPIDEMIOLOGY', 'PLANNING'] as const;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAccessRequestDto {
  @IsIn(REQUESTABLE_ROLES)
  role: RequestableRole;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  // letters, spaces and . , ' - only (no line breaks in the email subject)
  @Matches(/^[\p{L}\p{M} .,'-]+$/u, {
    message: "fullName may only contain letters, spaces and . , ' -",
  })
  fullName: string;

  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ValidateIf((o: CreateAccessRequestDto) => o.role === 'DOCTOR')
  @Transform(trim)
  @Matches(/^\d{7}$/, { message: 'prcLicenseNo must be 7 digits' })
  prcLicenseNo?: string;

  // the clinic's YAKAP reference, e.g. "Y12"
  @ValidateIf((o: CreateAccessRequestDto) => o.role === 'DOCTOR')
  @Transform(trim)
  @Matches(/^Y\d{1,3}$/i, { message: 'clinicRef must look like Y12' })
  clinicRef?: string;

  @ValidateIf((o: CreateAccessRequestDto) => o.role === 'BHW')
  @IsInt()
  @Min(1)
  barangayId?: number;

  @ValidateIf((o: CreateAccessRequestDto) => o.role === 'CHO')
  @IsIn(CHO_UNITS)
  choUnit?: ChoUnit;
}
