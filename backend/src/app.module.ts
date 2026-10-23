import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BarangaysModule } from './barangays/barangays.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResidentCheckModule } from './resident-check/resident-check.module';

@Module({
  imports: [PrismaModule, BarangaysModule, ResidentCheckModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
