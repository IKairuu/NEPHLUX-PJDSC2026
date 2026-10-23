import { Controller, Get, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  FollowUpQueryDto,
  FollowUpSummaryQueryDto,
} from './dto/follow-up-query.dto';
import {
  FollowUpListResponseDto,
  FollowUpSummaryDto,
} from './dto/follow-up-response.dto';
import { FollowUpsService, TAB_DESCRIPTION } from './follow-ups.service';

// BHW follow-up lists, built from doctors' decisions. Read only: a BHW records
// uACR results through /uacr-results and can never change a risk estimate.
@Roles('BHW')
@Controller('follow-ups')
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  // KPI cards and tab badges
  @Get('summary')
  async summary(
    @Query() query: FollowUpSummaryQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FollowUpSummaryDto> {
    const l = await this.followUpsService.lists(user, query.barangayId);
    return {
      barangayId: l.barangayId,
      missedAfterDays: l.missedAfterDays,
      counts: {
        MISSED: l.tabs.MISSED.length,
        PENDING: l.tabs.PENDING.length,
        OVERRIDES: l.tabs.OVERRIDES.length,
        RECHECK: l.tabs.RECHECK.length,
        DONE: l.tabs.DONE.length,
      },
    };
  }

  @Get()
  async findAll(
    @Query() query: FollowUpQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FollowUpListResponseDto> {
    const l = await this.followUpsService.lists(user, query.barangayId);
    const rows = l.tabs[query.tab];
    const start = (query.page - 1) * query.limit;
    return {
      tab: query.tab,
      description: TAB_DESCRIPTION[query.tab],
      barangayId: l.barangayId,
      data: rows.slice(start, start + query.limit),
      meta: { page: query.page, limit: query.limit, total: rows.length },
    };
  }
}
