import { Module } from '@nestjs/common';
import { BarangaysController } from './barangays.controller';
import { BarangaysRepository } from './barangays.repository';
import { BarangaysService } from './barangays.service';

@Module({
  controllers: [BarangaysController],
  providers: [BarangaysService, BarangaysRepository],
  exports: [BarangaysService],
})
export class BarangaysModule {}
