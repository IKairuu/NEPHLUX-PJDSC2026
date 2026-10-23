import { Module } from '@nestjs/common';
import { ModelVersionsController } from './model-versions.controller';
import { ModelVersionsRepository } from './model-versions.repository';
import { ModelVersionsService } from './model-versions.service';

@Module({
  controllers: [ModelVersionsController],
  providers: [ModelVersionsService, ModelVersionsRepository],
})
export class ModelVersionsModule {}
