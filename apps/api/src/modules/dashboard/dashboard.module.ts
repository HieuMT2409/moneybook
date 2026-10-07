import { Module } from '@nestjs/common';
import { RecurringModule } from '../recurring/recurring.module';
import { ReportsModule } from '../reports/reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({ imports: [ReportsModule, RecurringModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
