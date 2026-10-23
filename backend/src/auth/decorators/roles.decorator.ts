import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '../../generated/prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
