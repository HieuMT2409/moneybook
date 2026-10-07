import { PartialType } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { IsSignedMoney } from '../../../common/validators/money.validators';

export class CreateAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsSignedMoney()
  initialBalance?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
