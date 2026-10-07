import { DebtStatus, DebtType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IsDateOnly, IsPositiveMoney } from '../../../common/validators/money.validators';

export class CreateDebtDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  personName!: string;

  @IsEnum(DebtType)
  type!: DebtType;

  @IsPositiveMoney()
  totalAmount!: string;

  @IsOptional()
  @IsDateOnly()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

// `type` is deliberately not editable: switching LEND<->BORROW would invert past payments.
export class UpdateDebtDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  personName?: string;

  @IsOptional()
  @IsPositiveMoney()
  totalAmount?: string;

  @IsOptional()
  @IsDateOnly()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class CreateDebtPaymentDto {
  @IsPositiveMoney()
  amount!: string;

  @IsOptional()
  @IsDateOnly()
  paidAt?: string;

  /** If set, the payment also moves money in (LEND) or out (BORROW) of this account. */
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class ListDebtsQueryDto {
  @IsOptional()
  @IsEnum(DebtStatus)
  status?: DebtStatus;

  @IsOptional()
  @IsEnum(DebtType)
  type?: DebtType;
}
