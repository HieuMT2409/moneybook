import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

// Money travels as a decimal string ("50000" or "50000.50") so it never touches a JS float.
const POSITIVE_MONEY = /^(?!0+(\.0+)?$)\d{1,17}(\.\d{1,2})?$/;
const SIGNED_MONEY = /^-?\d{1,17}(\.\d{1,2})?$/;
const numberToString = ({ value }: { value: unknown }) => (typeof value === 'number' ? String(value) : value);

export const IsPositiveMoney = () =>
  applyDecorators(
    Transform(numberToString),
    IsString(),
    Matches(POSITIVE_MONEY, { message: '$property must be a positive amount with at most 2 decimals' }),
  );

export const IsSignedMoney = () =>
  applyDecorators(
    Transform(numberToString),
    IsString(),
    Matches(SIGNED_MONEY, { message: '$property must be an amount with at most 2 decimals' }),
  );

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const IsDateOnly = () =>
  applyDecorators(Matches(DATE_ONLY_REGEX, { message: '$property must be in YYYY-MM-DD format' }));
