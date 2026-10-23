import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssessmentsService } from './assessments.service';
import { AssessmentQueryDto } from './dto/assessment-query.dto';
import {
  AssessmentListResponseDto,
  AssessmentResponseDto,
  AssessmentSummaryDto,
} from './dto/assessment-response.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

// Step 2: the YAKAP doctor enters BP and labs and gets the uACR risk estimate.
// Assessments are clinical records: no PATCH or DELETE; enter a new one instead.
@Roles('DOCTOR')
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  async create(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AssessmentResponseDto> {
    return AssessmentResponseDto.fromModel(
      await this.assessmentsService.create(dto, user),
    );
  }

  // ?status=PENDING is the doctor's queue
  @Get()
  async findAll(
    @Query() query: AssessmentQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AssessmentListResponseDto> {
    const [rows, total] = await this.assessmentsService.findAll(query, user);
    return {
      data: rows.map((a) => AssessmentResponseDto.fromModel(a)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser): Promise<AssessmentSummaryDto> {
    return this.assessmentsService.summary(user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AssessmentResponseDto> {
    return AssessmentResponseDto.fromModel(
      await this.assessmentsService.findOne(id, user),
    );
  }
}
