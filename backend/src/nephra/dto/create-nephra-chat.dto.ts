import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { NephraRole } from '../nephra-engine';

export const NEPHRA_ROLES: NephraRole[] = [
  'guest',
  'resident',
  'doctor',
  'cho',
  'bhw',
];

export class NephraTurnDto {
  @IsIn(['user', 'nephra'])
  who: 'user' | 'nephra';

  @IsString()
  @MaxLength(500)
  text: string;
}

// One chat message. Nothing in this body is stored or logged.
export class CreateNephraChatDto {
  @IsString()
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsIn(NEPHRA_ROLES)
  role?: NephraRole;

  // the screen the user is on, for example "resident-check" or "doctor-queue"
  @IsOptional()
  @IsString()
  @MaxLength(40)
  screen?: string;

  // the last few turns, kept by the frontend; only the user's turns are used
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => NephraTurnDto)
  history?: NephraTurnDto[];
}
