import { SuppressedCount } from '../../common/privacy/small-cell';

export class CityTotalsDto {
  screened: SuppressedCount;
  screenedPer1000: number | null;
  cameWithResidentCode: SuppressedCount;
  higherRisk: SuppressedCount;
  referred: SuppressedCount;
  completed: SuppressedCount;
  completedShare: number | null;
  uacrPositive: SuppressedCount;
  population2020: number;
}

export class BarangayStatsDto {
  id: number;
  name: string;
  population2020: number;
  screened: SuppressedCount;
  higherRisk: SuppressedCount;
  referred: SuppressedCount;
  completed: SuppressedCount;
  screenedPer1000: number | null;
  higherRiskShare: number | null;
  completedShare: number | null;
}

export class OutreachPriorityDto {
  rank: number;
  barangay: { id: number; name: string };
  population2020: number;
  screenedPer1000: number | null;
  nearestClinic: { id: string; name: string; sector: string } | null;
}

export class CityOverviewDto {
  period: number;
  sector: string;
  smallCellMin: number;
  note: string;
  totals: CityTotalsDto;
  // oldest week first, 13 weeks
  weeklyScreenings: SuppressedCount[];
  funnel: { step: string; count: SuppressedCount }[];
  barangays: BarangayStatsDto[];
  outreachPriorities: OutreachPriorityDto[];
}

export class CityMapDto {
  type: 'FeatureCollection';
  smallCellMin: number;
  features: {
    type: 'Feature';
    geometry: unknown;
    properties: BarangayStatsDto;
  }[];
}

export class BudgetPointDto {
  testsPer1000: number;
  casesModel: number;
  casesRule: number;
  casesRandom: number;
}

export class BudgetResponseDto {
  modelVersion: string;
  source: string | null;
  casesPer1000: number | null;
  ruleSharePer1000: number | null;
  uacrPrice: number;
  uacrPriceRange: [number, number] | null;
  curve: BudgetPointDto[];
  selected: BudgetPointDto & {
    extraVsRule: number;
    testCost: number;
    costPerCaseModel: number | null;
  };
}

export class StrategyRowDto {
  key: string;
  strategy: string;
  uacrTests: number;
  casesFound: number;
  casesMissed: number;
  testCost: number;
  costPerCase: number | null;
}

export class StrategiesResponseDto {
  per: string;
  uacrPrice: number;
  hemodialysisPerYear: number | null;
  rows: StrategyRowDto[];
  note: string;
}
