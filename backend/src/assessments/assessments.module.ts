import { Module } from '@nestjs/common';
import { BarangaysModule } from '../barangays/barangays.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsRepository } from './assessments.repository';
import { AssessmentsService } from './assessments.service';

@Module({
  imports: [BarangaysModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AssessmentsRepository],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
