import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { haversineKm } from '../common/geo/haversine';
import { suppress, suppressRate } from '../common/privacy/small-cell';
import { ModelVersion } from '../generated/prisma/client';
import { SettingsService } from '../settings/settings.service';
import {
  AssessmentFact,
  BarangayForStats,
  CityInsightsRepository,
  ClinicPoint,
} from './city-insights.repository';
import {
  BudgetQueryDto,
  CityInsightsQueryDto,
} from './dto/city-insights-query.dto';
import {
  BarangayStatsDto,
  BudgetResponseDto,
  CityMapDto,
  CityOverviewDto,
  OutreachPriorityDto,
  StrategiesResponseDto,
} from './dto/city-insights-response.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 13;
const UACR_POSITIVE_MG_G = 30;
const PRIORITY_MIN_POP = 5000;
const PRIORITY_COUNT = 5;
const STEP_LABS = 2;

const NOTE =
  'Screening reach, not how common kidney disease is. Rates use the 2020 census. ' +
  'No names leave the clinic; small counts are shown as "<n".';

const STRATEGIES: [string, string][] = [
  ['test_everyone_uacr', 'Test everyone'],
  ['rule_dm_or_htn', 'Rule: diabetes or high BP'],
  ['step2_model_same_referrals', 'Model, same number of tests'],
  ['two_step_pathway_fixed_thresholds', 'Two-step pathway'],
];

interface Counts {
  screened: number;
  high: number;
  referred: number;
  done: number;
  positive: number;
  viaCode: number;
}

const emptyCounts = (): Counts => ({
  screened: 0,
  high: 0,
  referred: 0,
  done: 0,
  positive: 0,
  viaCode: 0,
});

@Injectable()
export class CityInsightsService {
  constructor(
    private readonly repository: CityInsightsRepository,
    private readonly settings: SettingsService,
  ) {}

  async overview(q: CityInsightsQueryDto): Promise<CityOverviewDto> {
    const min = await this.settings.getNumber('small_cell_min');
    const [barangays, facts, clinics] = await Promise.all([
      this.repository.findBarangays(false),
      this.loadFacts(q),
      this.repository.findClinicPoints(),
    ]);
    const { by, totals, weekly } = aggregate(barangays, facts);
    const pop = barangays.reduce((s, b) => s + b.pop2020, 0);
    const rows = barangays.map((b) => statsRow(b, by.get(b.id)!, min));

    const priorities: OutreachPriorityDto[] = barangays
      .filter((b) => b.pop2020 >= PRIORITY_MIN_POP)
      .map((b) => ({ b, rate: (1000 * by.get(b.id)!.screened) / b.pop2020 }))
      .sort((x, y) => x.rate - y.rate || y.b.pop2020 - x.b.pop2020)
      .slice(0, PRIORITY_COUNT)
      .map(({ b, rate }, i) => ({
        rank: i + 1,
        barangay: { id: b.id, name: b.name },
        population2020: b.pop2020,
        screenedPer1000: suppressRate(
          by.get(b.id)!.screened,
          0,
          round2(rate),
          min,
        ),
        nearestClinic: nearestClinic(b, clinics),
      }));

    return {
      period: q.period,
      sector: q.sector,
      smallCellMin: min,
      note: NOTE,
      totals: {
        screened: suppress(totals.screened, min),
        screenedPer1000: suppressRate(
          totals.screened,
          0,
          round2((1000 * totals.screened) / pop),
          min,
        ),
        cameWithResidentCode: suppress(totals.viaCode, min),
        higherRisk: suppress(totals.high, min),
        referred: suppress(totals.referred, min),
        completed: suppress(totals.done, min),
        completedShare: totals.referred
          ? suppressRate(
              totals.done,
              totals.referred,
              round3(totals.done / totals.referred),
              min,
            )
          : null,
        uacrPositive: suppress(totals.positive, min),
        population2020: pop,
      },
      weeklyScreenings: weekly.map((n) => suppress(n, min)),
      funnel: [
        { step: 'Screened', count: suppress(totals.screened, min) },
        { step: 'Higher risk', count: suppress(totals.high, min) },
        { step: 'Referred', count: suppress(totals.referred, min) },
        { step: 'Completed', count: suppress(totals.done, min) },
        { step: 'uACR >= 30', count: suppress(totals.positive, min) },
      ],
      barangays: rows,
      outreachPriorities: priorities,
    };
  }

  // GeoJSON for the choropleth: one feature per barangay with the same suppressed counts
  async map(q: CityInsightsQueryDto): Promise<CityMapDto> {
    const min = await this.settings.getNumber('small_cell_min');
    const [barangays, facts] = await Promise.all([
      this.repository.findBarangays(true),
      this.loadFacts(q),
    ]);
    const { by } = aggregate(barangays, facts);
    return {
      type: 'FeatureCollection',
      smallCellMin: min,
      features: barangays
        .filter((b) => b.boundary)
        .map((b) => ({
          type: 'Feature',
          geometry: b.boundary,
          properties: statsRow(b, by.get(b.id)!, min),
        })),
    };
  }

  async budget(q: BudgetQueryDto): Promise<BudgetResponseDto> {
    const model = await this.labModel();
    const [points, price] = await Promise.all([
      this.repository.findBudgetPoints(model.id),
      this.settings.getNumber('uacr_price'),
    ]);
    if (!points.length) {
      throw new ServiceUnavailableException(
        'No budget curve. Run the database seed first.',
      );
    }
    const meta = budgetMeta(model);
    // nearest point on the 10-test grid
    const at = points.reduce((best, p) =>
      Math.abs(p.testsPer1000 - q.tests) < Math.abs(best.testsPer1000 - q.tests)
        ? p
        : best,
    );
    const testCost = at.testsPer1000 * price;
    return {
      modelVersion: model.version,
      source: meta.source,
      casesPer1000: meta.casesPer1000,
      ruleSharePer1000: meta.ruleSharePer1000,
      uacrPrice: price,
      uacrPriceRange: meta.uacrPriceRange,
      curve: points.map(toPoint),
      selected: {
        ...toPoint(at),
        extraVsRule: round2(at.casesModel - at.casesRule),
        testCost,
        costPerCaseModel:
          at.casesModel > 0 ? Math.round(testCost / at.casesModel) : null,
      },
    };
  }

  // The planning table: screening 1,000 adults, test cost at the current uACR price
  async strategies(): Promise<StrategiesResponseDto> {
    const model = await this.labModel();
    const price = await this.settings.getNumber('uacr_price');
    const ev = (model.evidence ?? {}) as {
      cost_per_1000?: Record<
        string,
        { uacr_tests: number; cases_found: number; cases_missed: number }
      >;
      hd_per_year?: number;
    };
    const table = ev.cost_per_1000 ?? {};
    return {
      per: '1,000 adults with YAKAP labs (NHANES 2017-2020 rates)',
      uacrPrice: price,
      hemodialysisPerYear: ev.hd_per_year ?? null,
      rows: STRATEGIES.filter(([k]) => table[k]).map(([key, strategy]) => {
        const o = table[key];
        const cost = Math.round(o.uacr_tests * price);
        return {
          key,
          strategy,
          uacrTests: Math.round(o.uacr_tests),
          casesFound: round1(o.cases_found),
          casesMissed: round1(o.cases_missed),
          testCost: cost,
          costPerCase:
            o.cases_found > 0 ? Math.round(cost / o.cases_found) : null,
        };
      }),
      note: 'uACR is not in the YAKAP benefit. Dialysis avoided was not measured.',
    };
  }

  private loadFacts(q: CityInsightsQueryDto): Promise<AssessmentFact[]> {
    const since = new Date(Date.now() - q.period * DAY_MS);
    return this.repository.findFacts(
      since,
      q.sector === 'ALL' ? null : q.sector,
    );
  }

  private async labModel(): Promise<ModelVersion> {
    const m = await this.repository.findActiveModelVersion(STEP_LABS);
    if (!m)
      throw new ServiceUnavailableException(
        'No active lab model. Run the database seed first.',
      );
    return m;
  }
}

function aggregate(barangays: BarangayForStats[], facts: AssessmentFact[]) {
  const by = new Map<number, Counts>(
    barangays.map((b) => [b.id, emptyCounts()]),
  );
  const totals = emptyCounts();
  const weekly = new Array<number>(WEEKS).fill(0);
  const now = Date.now();
  for (const f of facts) {
    const c = by.get(f.patient.barangayId);
    if (!c) continue;
    const add = (k: keyof Counts) => {
      c[k]++;
      totals[k]++;
    };
    add('screened');
    if (f.riskResult?.riskLevel === 'HIGH') add('high');
    const approved = f.decision?.decision === 'APPROVED';
    if (approved) add('referred');
    // a uACR counts only as the follow-up of an approved referral
    const u = approved ? f.uacrResults[0] : undefined;
    if (u) add('done');
    if (u && u.valueMgG >= UACR_POSITIVE_MG_G) add('positive');
    if (f.residentCode) add('viaCode');
    const week = Math.floor((now - f.assessedOn.getTime()) / (7 * DAY_MS));
    if (week >= 0 && week < WEEKS) weekly[WEEKS - 1 - week]++;
  }
  return { by, totals, weekly };
}

function statsRow(
  b: BarangayForStats,
  c: Counts,
  min: number,
): BarangayStatsDto {
  return {
    id: b.id,
    name: b.name,
    population2020: b.pop2020,
    screened: suppress(c.screened, min),
    higherRisk: suppress(c.high, min),
    referred: suppress(c.referred, min),
    completed: suppress(c.done, min),
    screenedPer1000: suppressRate(
      c.screened,
      0,
      round2((1000 * c.screened) / b.pop2020),
      min,
    ),
    higherRiskShare: c.screened
      ? suppressRate(c.high, c.screened, round3(c.high / c.screened), min)
      : null,
    completedShare: c.referred
      ? suppressRate(c.done, c.referred, round3(c.done / c.referred), min)
      : null,
  };
}

function nearestClinic(b: BarangayForStats, clinics: ClinicPoint[]) {
  if (b.centreLat === null || b.centreLon === null || !clinics.length)
    return null;
  const from: [number, number] = [b.centreLat, b.centreLon];
  let best = clinics[0];
  let bestKm = Infinity;
  for (const c of clinics) {
    const km = haversineKm(from, [c.lat, c.lon]);
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return { id: best.id, name: best.name, sector: best.sector };
}

function budgetMeta(m: ModelVersion) {
  const b =
    ((m.evidence ?? {}) as { budget?: Record<string, unknown> }).budget ?? {};
  return {
    source: typeof b.source === 'string' ? b.source : null,
    casesPer1000:
      typeof b.casesPer1000 === 'number' ? round2(b.casesPer1000) : null,
    ruleSharePer1000:
      typeof b.ruleSharePer1000 === 'number'
        ? round1(b.ruleSharePer1000)
        : null,
    uacrPriceRange: Array.isArray(b.uacrPriceRange)
      ? (b.uacrPriceRange as [number, number])
      : null,
  };
}

function toPoint(p: {
  testsPer1000: number;
  casesModel: number;
  casesRule: number;
  casesRandom: number;
}) {
  return {
    testsPer1000: p.testsPer1000,
    casesModel: p.casesModel,
    casesRule: p.casesRule,
    casesRandom: p.casesRandom,
  };
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;
