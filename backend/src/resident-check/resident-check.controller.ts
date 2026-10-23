import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CreateResidentCheckDto } from './dto/create-resident-check.dto';
import {
  DecodedCodeResponseDto,
  QuestionsResponseDto,
  ResidentCheckResponseDto,
} from './dto/resident-check-response.dto';
import { ResidentCheckService } from './resident-check.service';

// The 2-minute resident check. Residents never sign in, and nothing is stored:
// the answers travel only inside the 9-character clinic code.
@Controller('resident-check')
export class ResidentCheckController {
  constructor(private readonly residentCheckService: ResidentCheckService) {}

  @Get('questions')
  getQuestions(): QuestionsResponseDto {
    return this.residentCheckService.getQuestions();
  }

  @Post()
  @HttpCode(200)
  check(
    @Body() dto: CreateResidentCheckDto,
  ): Promise<ResidentCheckResponseDto> {
    return this.residentCheckService.check(dto);
  }

  // Used by YAKAP clinic staff; add @Roles('DOCTOR') once the RolesGuard exists
  @Get('codes/:code')
  decode(@Param('code') code: string): Promise<DecodedCodeResponseDto> {
    return this.residentCheckService.decode(code);
  }
}
