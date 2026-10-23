import { Injectable } from '@nestjs/common';
import { Barangay, Prisma } from '../generated/prisma/client';

// boundary is only loaded when asked for
export type BarangayRow = Omit<Barangay, 'boundary'> & {
  boundary?: Barangay['boundary'];
};
import { PrismaService } from '../prisma/prisma.service';

export interface FindBarangaysParams {
  search?: string;
  includeBoundary?: boolean;
}

@Injectable()
export class BarangaysRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(params: FindBarangaysParams): Promise<BarangayRow[]> {
    const where: Prisma.BarangayWhereInput = params.search
      ? { name: { contains: params.search, mode: 'insensitive' } }
      : {};
    return this.prisma.barangay.findMany({
      where,
      omit: { boundary: !params.includeBoundary },
      orderBy: { codeIndex: 'asc' },
    });
  }

  findById(id: number, includeBoundary = false): Promise<BarangayRow | null> {
    return this.prisma.barangay.findUnique({
      where: { id },
      omit: { boundary: !includeBoundary },
    });
  }

  findByCodeIndex(codeIndex: number): Promise<BarangayRow | null> {
    return this.prisma.barangay.findUnique({
      where: { codeIndex },
      omit: { boundary: true },
    });
  }
}
