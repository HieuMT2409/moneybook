import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';
import { RecurringService } from './recurring.service';

@ApiTags('Recurring')
@ApiBearerAuth()
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurring: RecurringService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.recurring.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRecurringDto) {
    return this.recurring.create(user.id, dto);
  }

  /** Manually process due rules for the current user. */
  @Post('run')
  @HttpCode(200)
  run(@CurrentUser() user: AuthUser) {
    return this.recurring.runDue(user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecurringDto) {
    return this.recurring.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.recurring.remove(user.id, id);
  }
}
