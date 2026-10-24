import { Module } from '@nestjs/common';
import { NephraAgent } from './nephra.agent';
import { NephraRateLimiter } from './nephra-rate-limiter';
import { NephraController } from './nephra.controller';
import { NephraRepository } from './nephra.repository';
import { NephraService } from './nephra.service';

@Module({
  controllers: [NephraController],
  providers: [NephraService, NephraRepository, NephraAgent, NephraRateLimiter],
})
export class NephraModule {}
