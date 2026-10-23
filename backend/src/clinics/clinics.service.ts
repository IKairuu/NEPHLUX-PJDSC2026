import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicsRepository, ClinicWithBarangay } from './clinics.repository';
import { ClinicQueryDto } from './dto/clinic-query.dto';

@Injectable()
export class ClinicsService {
  constructor(private readonly repository: ClinicsRepository) {}

  findAll(query: ClinicQueryDto): Promise<ClinicWithBarangay[]> {
    return this.repository.findMany({
      ...(query.sector && { sector: query.sector }),
      ...(query.barangayId && { barangayId: query.barangayId }),
    });
  }

  async findOne(id: string): Promise<ClinicWithBarangay> {
    const c = await this.repository.findById(id);
    if (!c) throw new NotFoundException(`Clinic ${id} not found`);
    return c;
  }
}
