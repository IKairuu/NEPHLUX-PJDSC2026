import { Injectable } from '@nestjs/common';
import { ModelVersion } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModelVersionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(): Promise<ModelVersion[]> {
    return this.prisma.modelVersion.findMany({
      where: { isActive: true },
      orderBy: { step: 'asc' },
    });
  }
}
