import { Injectable, NotFoundException } from '@nestjs/common';
import { BarangayRow, BarangaysRepository } from './barangays.repository';
import { BarangayQueryDto } from './dto/barangay-query.dto';

@Injectable()
export class BarangaysService {
  constructor(private readonly barangays: BarangaysRepository) {}

  findAll(query: BarangayQueryDto): Promise<BarangayRow[]> {
    return this.barangays.findMany({
      search: query.search?.trim() || undefined,
      includeBoundary: query.includeBoundary ?? false,
    });
  }

  async findOne(id: number, includeBoundary = false): Promise<BarangayRow> {
    const barangay = await this.barangays.findById(id, includeBoundary);
    if (!barangay) throw new NotFoundException(`Barangay ${id} not found`);
    return barangay;
  }

  // The resident clinic code stores code_index, not the row id
  findByCodeIndex(codeIndex: number): Promise<BarangayRow | null> {
    return this.barangays.findByCodeIndex(codeIndex);
  }
}
