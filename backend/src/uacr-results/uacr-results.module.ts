import { Module } from '@nestjs/common';
import { UacrResultsController } from './uacr-results.controller';
import { UacrResultsRepository } from './uacr-results.repository';
import { UacrResultsService } from './uacr-results.service';

@Module({
  controllers: [UacrResultsController],
  providers: [UacrResultsService, UacrResultsRepository],
})
export class UacrResultsModule {}
