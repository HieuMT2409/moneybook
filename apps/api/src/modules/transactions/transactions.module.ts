import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransfersController } from '../transfers/transfers.controller';
import { TransfersService } from '../transfers/transfers.service';

@Module({
  controllers: [TransactionsController, TransfersController],
  providers: [TransactionsService, TransfersService],
})
export class TransactionsModule {}
