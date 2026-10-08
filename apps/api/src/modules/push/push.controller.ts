import { Body, Controller, Delete, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscribePushDto, UnsubscribePushDto } from './dto/push.dto';
import { PushService } from './push.service';

@ApiTags('Push')
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('public-key')
  publicKey() {
    return { publicKey: this.push.publicKey() };
  }

  @Post('subscribe')
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribePushDto, @Headers('user-agent') userAgent?: string) {
    return this.push.subscribe(user.id, dto, userAgent);
  }

  @Delete('subscribe')
  unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: UnsubscribePushDto) {
    return this.push.unsubscribe(user.id, dto.endpoint);
  }

  /** Sends a test notification to all of the caller's devices. */
  @Post('test')
  @HttpCode(200)
  async test(@CurrentUser() user: AuthUser) {
    const delivered = await this.push.sendToUser(user.id, {
      title: 'MONEYBOOK',
      body: 'Thông báo hoạt động tốt 🎉',
      url: '/todos',
      tag: 'push-test',
    });
    return { delivered };
  }
}
