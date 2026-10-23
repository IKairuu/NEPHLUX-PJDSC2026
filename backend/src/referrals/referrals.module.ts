import { Module } from '@nestjs/common';
import { AssessmentsModule } from '../assessments/assessments.module';
import { BarangaysModule } from '../barangays/barangays.module';
import { ReferralsController } from './referrals.controller';
import { ReferralsRepository } from './referrals.repository';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [AssessmentsModule, BarangaysModule],
  controllers: [ReferralsController],
  providers: [ReferralsService, ReferralsRepository],
})
export class ReferralsModule {}
