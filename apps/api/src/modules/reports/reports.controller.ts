import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CategoryReportQueryDto, ReportQueryDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('monthly')
  monthly(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    return this.reports.monthly(user.id, query);
  }

  @Get('categories')
  categories(@CurrentUser() user: AuthUser, @Query() query: CategoryReportQueryDto) {
    return this.reports.categories(user.id, query);
  }

  @Get('cash-flow')
  cashFlow(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    return this.reports.cashFlow(user.id, query);
  }

  @Get('net-worth')
  netWorth(@CurrentUser() user: AuthUser) {
    return this.reports.netWorth(user.id);
  }
}
