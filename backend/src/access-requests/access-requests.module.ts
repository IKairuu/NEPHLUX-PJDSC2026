import { Module } from '@nestjs/common';
import { AccessRequestsController } from './access-requests.controller';
import { AccessRequestsRepository } from './access-requests.repository';
import { AccessRequestsService } from './access-requests.service';

@Module({
  controllers: [AccessRequestsController],
  providers: [AccessRequestsService, AccessRequestsRepository],
})
export class AccessRequestsModule {}
