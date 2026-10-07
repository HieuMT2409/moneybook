import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + database connectivity check' })
  async check(): Promise<{ status: 'ok'; database: 'up'; uptime: number }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'up', uptime: Math.round(process.uptime()) };
  }
}
