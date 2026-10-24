import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CreateNephraChatDto } from './dto/create-nephra-chat.dto';
import { NephraQueryDto } from './dto/nephra-query.dto';
import {
  NephraChatResponseDto,
  NephraInfoResponseDto,
} from './dto/nephra-response.dto';
import { NephraService } from './nephra.service';

// Nephra, the help assistant on every screen. Open to residents and staff;
// it stores nothing and never calculates.
@Controller('nephra')
export class NephraController {
  constructor(private readonly nephraService: NephraService) {}

  @Public()
  @Get()
  info(@Query() query: NephraQueryDto): NephraInfoResponseDto {
    return this.nephraService.info(query.role);
  }

  @Public()
  @Post('chat')
  @HttpCode(200)
  // over the limit: 429 with { message, retryAfterSeconds }
  chat(
    @Body() dto: CreateNephraChatDto,
    @Ip() ip: string,
  ): Promise<NephraChatResponseDto> {
    return this.nephraService.chat(dto, ip);
  }
}
