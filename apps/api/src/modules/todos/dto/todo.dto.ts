import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsISO8601, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { REMIND_OPTIONS } from '../reminder';

export class CreateTodoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** ISO 8601 instant, e.g. 2026-10-08T01:30:00.000Z (the web app converts the user's local time). */
  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(REMIND_OPTIONS)
  remindBeforeMinutes?: number;
}

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** Send null to clear the due date. */
  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(REMIND_OPTIONS)
  remindBeforeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isDone?: boolean;
}

export class ListTodosQueryDto {
  @IsOptional()
  @IsIn(['open', 'done', 'all'])
  status: 'open' | 'done' | 'all' = 'open';
}
