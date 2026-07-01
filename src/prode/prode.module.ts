import { Module } from '@nestjs/common';
import { ProdeService } from './prode.service';
import { ProdeController } from './prode.controller';

@Module({
  controllers: [ProdeController],
  providers: [ProdeService],
})
export class ProdeModule {}
