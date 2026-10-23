import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuthModule } from './auth/auth.module';
import { BarangaysModule } from './barangays/barangays.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReferralsModule } from './referrals/referrals.module';
import { ResidentCheckModule } from './resident-check/resident-check.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BarangaysModule,
    ResidentCheckModule,
    AssessmentsModule,
    ReferralsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
