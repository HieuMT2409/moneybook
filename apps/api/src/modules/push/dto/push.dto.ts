import { Type } from 'class-transformer';
import { IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

class PushKeysDto {
  @IsString()
  @MaxLength(256)
  p256dh!: string;

  @IsString()
  @MaxLength(256)
  auth!: string;
}

export class SubscribePushDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class UnsubscribePushDto {
  @IsString()
  @MaxLength(2048)
  endpoint!: string;
}
