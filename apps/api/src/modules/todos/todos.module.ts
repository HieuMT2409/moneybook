import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { TodoRemindersService } from './todo-reminders.service';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

@Module({
  imports: [PushModule],
  controllers: [TodosController],
  providers: [TodosService, TodoRemindersService],
})
export class TodosModule {}
