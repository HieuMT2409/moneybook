import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { DebtsService } from './debts.service';
import { CreateDebtDto, CreateDebtPaymentDto, ListDebtsQueryDto, UpdateDebtDto } from './dto/debt.dto';

@ApiTags('Debts')
@ApiBearerAuth()
@Controller('debts')
export class DebtsController {
  constructor(private readonly debts: DebtsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListDebtsQueryDto) {
    return this.debts.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDebtDto) {
    return this.debts.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.debts.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDebtDto) {
    return this.debts.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.debts.remove(user.id, id);
  }

  @Post(':id/payments')
  addPayment(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateDebtPaymentDto) {
    return this.debts.addPayment(user.id, id, dto);
  }
}
