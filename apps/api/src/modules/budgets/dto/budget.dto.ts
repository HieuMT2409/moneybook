import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { IsPositiveMoney } from '../../../common/validators/money.validators';

export class CreateBudgetDto {
  @IsUUID()
  categoryId!: string;

  @IsPositiveMoney()
  amount!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}

export class UpdateBudgetDto {
  @IsPositiveMoney()
  amount!: string;
}

export class ListBudgetsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
