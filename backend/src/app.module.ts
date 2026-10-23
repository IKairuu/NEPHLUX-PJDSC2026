import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuthModule } from './auth/auth.module';
import { BarangaysModule } from './barangays/barangays.module';
import { CityInsightsModule } from './city-insights/city-insights.module';
import { ClinicsModule } from './clinics/clinics.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { ModelVersionsModule } from './model-versions/model-versions.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReferralsModule } from './referrals/referrals.module';
import { ResidentCheckModule } from './resident-check/resident-check.module';
import { SettingsModule } from './settings/settings.module';
import { UacrResultsModule } from './uacr-results/uacr-results.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BarangaysModule,
    ResidentCheckModule,
    AssessmentsModule,
    ReferralsModule,
    SettingsModule,
    ClinicsModule,
    ModelVersionsModule,
    FollowUpsModule,
    UacrResultsModule,
    CityInsightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
