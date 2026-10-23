import { Module } from '@nestjs/common';
import { BarangaysModule } from '../barangays/barangays.module';
import { ResidentCheckController } from './resident-check.controller';
import { ResidentCheckRepository } from './resident-check.repository';
import { ResidentCheckService } from './resident-check.service';

@Module({
  imports: [BarangaysModule],
  controllers: [ResidentCheckController],
  providers: [ResidentCheckService, ResidentCheckRepository],
})
export class ResidentCheckModule {}
