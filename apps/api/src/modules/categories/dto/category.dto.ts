import { OmitType, PartialType } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a hex color like #0f766e' })
  color?: string;
}

// A category's type can't change once transactions use it.
export class UpdateCategoryDto extends PartialType(OmitType(CreateCategoryDto, ['type'] as const)) {}
