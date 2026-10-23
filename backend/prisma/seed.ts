// Seeds reference data: the 80 Cagayan de Oro barangays, the 42 YAKAP clinics and
// risk model v1.0.0 (step 1 = resident questions, step 2 = YAKAP labs) with the step-2
// test-budget curve, default settings, and, when
// SEED_DEMO_PASSWORD is set, demo staff accounts for the doctor, BHW and CHO screens.
// Safe to run more than once: every row is upserted on its natural key.
// Run with: npx prisma db seed
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import {
  ClinicSector,
  LocationPrecision,
  Prisma,
  PrismaClient,
} from '../src/generated/prisma/client';

interface BarangaySeed {
  psgcCode: string;
  name: string;
  codeIndex: number;
  pop2020: number;
  pop2024: number | null;
  centreLat: number | null;
  centreLon: number | null;
  boundary: Prisma.InputJsonValue | null;
}

interface ClinicSeed {
  yakapRef: string;
  name: string;
  shortName: string | null;
  sector: ClinicSector;
  phone: string | null;
  address: string | null;
  barangay: string;
  lat: number;
  lon: number;
  locationPrecision: LocationPrecision;
  accreditationExpiry: string | null;
}

interface ModelStepSeed {
  intercept: number;
  coef: Record<string, number>;
  mean: Record<string, number>;
  auroc: { auroc: number; ci: [number, number] };
}

interface ModelSeed {
  version: string;
  thresholds: Record<string, number>;
  steps: Record<'1' | '2', ModelStepSeed>;
  evidence: Prisma.InputJsonValue;
}

interface BudgetSeed {
  source: string;
  casesPer1000: number;
  ruleSharePer1000: number;
  uacrPriceAssumed: number;
  uacrPriceRange: [number, number];
  rows: {
    tests_per_1000: number;
    model: number;
    rule_first: number;
    random: number;
  }[];
}

function load<T>(file: string): T {
  return JSON.parse(
    readFileSync(join(__dirname, 'seed-data', file), 'utf8'),
  ) as T;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedBarangays(): Promise<Map<string, number>> {
  const rows = load<BarangaySeed[]>('barangays.json');
  for (const b of rows) {
    const data = {
      ...b,
      boundary: b.boundary ?? Prisma.DbNull,
    };
    await prisma.barangay.upsert({
      where: { psgcCode: b.psgcCode },
      create: data,
      update: data,
    });
  }
  const all = await prisma.barangay.findMany({
    select: { id: true, name: true },
  });
  console.log(`barangays: ${rows.length}`);
  return new Map(all.map((b) => [b.name, b.id]));
}

async function seedClinics(barangayIds: Map<string, number>): Promise<void> {
  const rows = load<ClinicSeed[]>('clinics.json');
  for (const c of rows) {
    const barangayId = barangayIds.get(c.barangay);
    if (!barangayId) throw new Error(`Unknown barangay "${c.barangay}"`);
    const { barangay: _name, accreditationExpiry, ...rest } = c;
    const data = {
      ...rest,
      barangayId,
      accreditationExpiry: accreditationExpiry
        ? new Date(accreditationExpiry)
        : null,
    };
    await prisma.clinic.upsert({
      where: { yakapRef: c.yakapRef },
      create: data,
      update: data,
    });
  }
  console.log(`clinics: ${rows.length}`);
}

async function seedModel(): Promise<void> {
  const m = load<ModelSeed>('model-v1.json');
  const budget = load<BudgetSeed>('budget-v1.json');
  for (const step of [1, 2] as const) {
    const s = m.steps[step];
    const evidence =
      step === 2
        ? {
            ...(m.evidence as Prisma.InputJsonObject),
            budget: {
              source: budget.source,
              casesPer1000: budget.casesPer1000,
              ruleSharePer1000: budget.ruleSharePer1000,
              uacrPriceRange: budget.uacrPriceRange,
            },
          }
        : m.evidence;
    const data = {
      coefficients: { intercept: s.intercept, coef: s.coef },
      means: s.mean,
      thresholds: m.thresholds,
      testAuroc: s.auroc.auroc,
      ciLow: s.auroc.ci[0],
      ciHigh: s.auroc.ci[1],
      evidence,
      isActive: true,
    };
    // one active model per step
    await prisma.modelVersion.updateMany({
      where: { step, NOT: { version: m.version } },
      data: { isActive: false },
    });
    const row = await prisma.modelVersion.upsert({
      where: { version_step: { version: m.version, step } },
      create: { version: m.version, step, ...data },
      update: data,
    });
    if (step === 2) {
      for (const r of budget.rows) {
        const point = {
          casesModel: r.model,
          casesRule: r.rule_first,
          casesRandom: r.random,
        };
        await prisma.budgetCurvePoint.upsert({
          where: {
            modelVersionId_testsPer1000: {
              modelVersionId: row.id,
              testsPer1000: r.tests_per_1000,
            },
          },
          create: {
            modelVersionId: row.id,
            testsPer1000: r.tests_per_1000,
            ...point,
          },
          update: point,
        });
      }
    }
  }
  console.log(
    `model_versions: ${m.version} (steps 1 and 2), budget_curve_points: ${budget.rows.length}`,
  );
}

// Defaults only: a value changed later through PATCH /settings is kept
async function seedSettings(): Promise<void> {
  const defaults: Record<string, string> = {
    uacr_price: '600',
    missed_after_days: '14',
    small_cell_min: '5',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
  console.log(`settings: ${Object.keys(defaults).join(', ')}`);
}

// Demo accounts only; never set SEED_DEMO_PASSWORD on a real deployment
async function seedDemoStaff(barangayIds: Map<string, number>): Promise<void> {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) {
    console.log('staff: skipped (set SEED_DEMO_PASSWORD to add demo accounts)');
    return;
  }
  if (password.length < 8)
    throw new Error('SEED_DEMO_PASSWORD needs 8+ characters');
  const passwordHash = await hash(password, 10);
  const cho = await prisma.clinic.findFirst({
    where: { sector: 'PUBLIC', name: { contains: 'CHO', mode: 'insensitive' } },
  });
  const bonbon = barangayIds.get('Bonbon');
  const accounts: Prisma.StaffUserUncheckedCreateInput[] = [
    {
      email: 'doctor@demo.nephlux',
      fullName: 'Dr. A. Reyes',
      role: 'DOCTOR',
      clinicId: cho?.id ?? null,
      passwordHash,
      status: 'ACTIVE',
    },
    {
      email: 'bhw@demo.nephlux',
      fullName: 'L. Dalisay',
      role: 'BHW',
      barangayId: bonbon ?? null,
      passwordHash,
      status: 'ACTIVE',
    },
    {
      email: 'cho@demo.nephlux',
      fullName: 'CHO analyst',
      role: 'CHO',
      choUnit: 'NCD',
      passwordHash,
      status: 'ACTIVE',
    },
  ];
  for (const a of accounts) {
    await prisma.staffUser.upsert({
      where: { email: a.email },
      create: a,
      update: a,
    });
  }
  console.log(`staff: ${accounts.map((a) => a.email).join(', ')}`);
}

async function main(): Promise<void> {
  const barangayIds = await seedBarangays();
  await seedClinics(barangayIds);
  await seedModel();
  await seedSettings();
  await seedDemoStaff(barangayIds);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
