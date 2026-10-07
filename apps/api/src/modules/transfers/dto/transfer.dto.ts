import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsDateOnly, IsPositiveMoney } from '../../../common/validators/money.validators';

export class CreateTransferDto {
  @IsUUID()
  fromAccountId!: string;

  @IsUUID()
  toAccountId!: string;

  @IsPositiveMoney()
  amount!: string;

  @IsDateOnly()
  transactionDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
