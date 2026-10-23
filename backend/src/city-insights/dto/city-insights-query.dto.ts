import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CityInsightsQueryDto {
  // days back from today
  @IsOptional()
  @Type(() => Number)
  @IsIn([30, 60, 90])
  period: 30 | 60 | 90 = 90;

  @IsOptional()
  @IsIn(['ALL', 'PUBLIC', 'PRIVATE'])
  sector: 'ALL' | 'PUBLIC' | 'PRIVATE' = 'ALL';
}

export class BudgetQueryDto {
  // uACR tests per 1,000 adults with YAKAP labs (the slider), steps of 10
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  tests = 490;
}
