import { IsIn, IsOptional } from 'class-validator';
import type { NephraRole } from '../nephra-engine';
import { NEPHRA_ROLES } from './create-nephra-chat.dto';

export class NephraQueryDto {
  @IsOptional()
  @IsIn(NEPHRA_ROLES)
  role?: NephraRole;
}
