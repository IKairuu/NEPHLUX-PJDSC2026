import { Injectable } from '@nestjs/common';
import { Setting } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Setting[]> {
    return this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
  }

  findByKey(key: string): Promise<Setting | null> {
    return this.prisma.setting.findUnique({ where: { key } });
  }

  upsert(key: string, value: string, userId: string): Promise<Setting> {
    return this.prisma.$transaction(async (tx) => {
      const saved = await tx.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_SETTING',
          entity: 'settings',
          entityId: key,
          details: { value },
        },
      });
      return saved;
    });
  }
}
