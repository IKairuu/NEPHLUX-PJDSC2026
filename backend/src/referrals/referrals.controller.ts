import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ReferralQueryDto } from './dto/referral-query.dto';
import {
  ReferralListResponseDto,
  ReferralResponseDto,
  ReferralSlipDto,
} from './dto/referral-response.dto';
import { ReferralsService } from './referrals.service';

// The doctor's decision on an assessment: approve, override with a reason, or no referral.
// Decisions are final (no PATCH or DELETE); the audit log records each one.
@Roles('DOCTOR')
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  async create(
    @Body() dto: CreateReferralDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralResponseDto> {
    return ReferralResponseDto.fromModel(
      await this.referralsService.create(dto, user),
    );
  }

  @Get()
  async findAll(
    @Query() query: ReferralQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralListResponseDto> {
    const [rows, total] = await this.referralsService.findAll(query, user);
    return {
      data: rows.map((d) => ReferralResponseDto.fromModel(d)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralResponseDto> {
    return ReferralResponseDto.fromModel(
      await this.referralsService.findOne(id, user),
    );
  }

  @Get(':id/slip')
  slip(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralSlipDto> {
    return this.referralsService.slip(id, user);
  }

  @Post(':id/slip-printed')
  @HttpCode(200)
  async slipPrinted(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReferralResponseDto> {
    return ReferralResponseDto.fromModel(
      await this.referralsService.markSlipPrinted(id, user),
    );
  }
}
