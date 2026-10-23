import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Role, email, clinic, barangay and CHO unit are set by an admin, not here
export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{M} .,'-]+$/u, {
    message: "fullName may only contain letters, spaces and . , ' -",
  })
  fullName?: string;
}
