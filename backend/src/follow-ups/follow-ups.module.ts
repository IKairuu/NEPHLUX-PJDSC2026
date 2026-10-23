import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsRepository } from './follow-ups.repository';
import { FollowUpsService } from './follow-ups.service';

@Module({
  imports: [SettingsModule],
  controllers: [FollowUpsController],
  providers: [FollowUpsService, FollowUpsRepository],
})
export class FollowUpsModule {}
