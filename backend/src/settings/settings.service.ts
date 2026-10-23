import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { SettingResponseDto } from './dto/setting-response.dto';

interface SettingDef {
  default: number;
  min: number;
  max: number;
  description: string;
}

export const SETTING_DEFS: Record<string, SettingDef> = {
  uacr_price: {
    default: 600,
    min: 1,
    max: 100000,
    description:
      'Assumed price of one uACR test in pesos (not in the YAKAP benefit)',
  },
  missed_after_days: {
    default: 14,
    min: 1,
    max: 365,
    description:
      'Days after a referral with no uACR result before it counts as missed',
  },
  small_cell_min: {
    default: 5,
    min: 2,
    max: 50,
    description:
      'Counts from 1 up to this number minus 1 are shown as "<n" on the CHO dashboard',
  },
};

export type SettingKey = keyof typeof SETTING_DEFS;

@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  // Falls back to the default when the row is missing or not a number
  async getNumber(key: SettingKey): Promise<number> {
    const def = SETTING_DEFS[key];
    const row = await this.repository.findByKey(key);
    const v = row ? Number(row.value) : NaN;
    return Number.isFinite(v) ? v : def.default;
  }

  async findAll(): Promise<SettingResponseDto[]> {
    const rows = new Map(
      (await this.repository.findAll()).map((r) => [r.key, r]),
    );
    return Object.entries(SETTING_DEFS).map(([key, def]) => {
      const row = rows.get(key);
      const v = row ? Number(row.value) : NaN;
      return {
        key,
        value: Number.isFinite(v) ? v : def.default,
        description: def.description,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  async update(
    key: string,
    value: string,
    userId: string,
  ): Promise<SettingResponseDto> {
    const def = SETTING_DEFS[key];
    if (!def) throw new NotFoundException(`Unknown setting ${key}`);
    const n = Number(value);
    if (!Number.isInteger(n) || n < def.min || n > def.max) {
      throw new BadRequestException(
        `${key} must be a whole number from ${def.min} to ${def.max}`,
      );
    }
    const saved = await this.repository.upsert(key, String(n), userId);
    return {
      key,
      value: n,
      description: def.description,
      updatedAt: saved.updatedAt,
    };
  }
}
