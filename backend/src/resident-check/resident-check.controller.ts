import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @Public()
  @Get('questions')
  getQuestions(): QuestionsResponseDto {
    return this.residentCheckService.getQuestions();
  }

  @Public()
  @Post()
  @HttpCode(200)
  check(
    @Body() dto: CreateResidentCheckDto,
  ): Promise<ResidentCheckResponseDto> {
    return this.residentCheckService.check(dto);
  }

  // YAKAP clinic staff load a resident's answers from their code
  @Roles('DOCTOR')
  @Get('codes/:code')
  decode(@Param('code') code: string): Promise<DecodedCodeResponseDto> {
    return this.residentCheckService.decode(code);
  }
}
