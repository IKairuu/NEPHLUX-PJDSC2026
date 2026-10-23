import { Injectable } from '@nestjs/common';
import { StaffUser } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStaffByEmail(email: string): Promise<StaffUser | null> {
    return this.prisma.staffUser.findUnique({ where: { email } });
  }

  findStaffById(id: string): Promise<StaffUser | null> {
    return this.prisma.staffUser.findUnique({ where: { id } });
  }

  recordLogin(id: string): Promise<StaffUser> {
    return this.prisma.staffUser.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        auditLogs: {
          create: { action: 'LOGIN', entity: 'staff_users', entityId: id },
        },
      },
    });
  }
}
