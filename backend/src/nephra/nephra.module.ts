import { Module } from '@nestjs/common';
import { NephraAgent } from './nephra.agent';
import { NephraController } from './nephra.controller';
import { NephraRepository } from './nephra.repository';
import { NephraService } from './nephra.service';

@Module({
  controllers: [NephraController],
  providers: [NephraService, NephraRepository, NephraAgent],
})
export class NephraModule {}
