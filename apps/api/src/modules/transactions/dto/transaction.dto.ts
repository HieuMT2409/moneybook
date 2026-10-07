import { PartialType } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { IsDateOnly, IsPositiveMoney } from '../../../common/validators/money.validators';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsPositiveMoney()
  amount!: string;

  @IsUUID()
  accountId!: string;

  @IsUUID()
  categoryId!: string;

  @IsDateOnly()
  transactionDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

export class ListTransactionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDateOnly()
  from?: string;

  @IsOptional()
  @IsDateOnly()
  to?: string;

  @IsOptional()
  @IsIn(['transactionDate', 'amount', 'createdAt'])
  sortBy: 'transactionDate' | 'amount' | 'createdAt' = 'transactionDate';

  @IsOptional()
  @Type(() => String)
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
