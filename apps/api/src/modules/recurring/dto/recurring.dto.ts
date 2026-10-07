import { RecurringFrequency, TransactionType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsDateOnly, IsPositiveMoney } from '../../../common/validators/money.validators';

export class CreateRecurringDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsPositiveMoney()
  amount!: string;

  @IsUUID()
  accountId!: string;

  @IsUUID()
  categoryId!: string;

  @IsEnum(RecurringFrequency)
  frequency!: RecurringFrequency;

  /** First run date. For MONTHLY/YEARLY its day-of-month becomes the anchor day ("every month on the 5th"). */
  @IsDateOnly()
  startDate!: string;

  @IsOptional()
  @IsDateOnly()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class UpdateRecurringDto {
  @IsOptional()
  @IsPositiveMoney()
  amount?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDateOnly()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
