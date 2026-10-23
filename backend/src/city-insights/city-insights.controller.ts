import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CityInsightsService } from './city-insights.service';
import {
  BudgetQueryDto,
  CityInsightsQueryDto,
} from './dto/city-insights-query.dto';
import {
  BudgetResponseDto,
  CityMapDto,
  CityOverviewDto,
  StrategiesResponseDto,
} from './dto/city-insights-response.dto';

// City Health Office dashboard. Counts by barangay only: no patient rows, no initials,
// and small counts suppressed. Read only.
@Roles('CHO')
@Controller('city-insights')
export class CityInsightsController {
  constructor(private readonly cityInsightsService: CityInsightsService) {}

  // KPIs, weekly sparkline, funnel, barangay table and outreach priorities
  @Get('overview')
  overview(@Query() query: CityInsightsQueryDto): Promise<CityOverviewDto> {
    return this.cityInsightsService.overview(query);
  }

  // GeoJSON FeatureCollection for the map
  @Get('map')
  map(@Query() query: CityInsightsQueryDto): Promise<CityMapDto> {
    return this.cityInsightsService.map(query);
  }

  // uACR test budget slider: the curve plus the selected point
  @Get('budget')
  budget(@Query() query: BudgetQueryDto): Promise<BudgetResponseDto> {
    return this.cityInsightsService.budget(query);
  }

  @Get('strategies')
  strategies(): Promise<StrategiesResponseDto> {
    return this.cityInsightsService.strategies();
  }
}
