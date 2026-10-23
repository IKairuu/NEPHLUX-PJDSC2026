import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { StaffRole } from '../../generated/prisma/client';
import { AuthUser } from '../auth-user';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Global guard, runs after JwtAuthGuard. ADMIN passes every role check.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<StaffRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;
    const user = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>().user;
    if (user && (user.role === 'ADMIN' || roles.includes(user.role))) {
      return true;
    }
    throw new ForbiddenException('Your role cannot use this');
  }
}
