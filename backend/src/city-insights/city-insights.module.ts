import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { CityInsightsController } from './city-insights.controller';
import { CityInsightsRepository } from './city-insights.repository';
import { CityInsightsService } from './city-insights.service';

@Module({
  imports: [SettingsModule],
  controllers: [CityInsightsController],
  providers: [CityInsightsService, CityInsightsRepository],
})
export class CityInsightsModule {}
