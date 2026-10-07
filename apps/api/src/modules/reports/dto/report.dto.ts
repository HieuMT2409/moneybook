import { TransactionType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { RangePreset } from '../../../common/dates';
import { IsDateOnly } from '../../../common/validators/money.validators';

export const RANGE_PRESETS = ['this_month', 'last_month', 'last_3_months', 'last_6_months', 'this_year', 'custom'] as const;

export class ReportQueryDto {
  @IsOptional()
  @IsIn(RANGE_PRESETS)
  range: RangePreset = 'this_month';

  @IsOptional()
  @IsDateOnly()
  from?: string;

  @IsOptional()
  @IsDateOnly()
  to?: string;
}

export class CategoryReportQueryDto extends ReportQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type: TransactionType = 'EXPENSE';
}
