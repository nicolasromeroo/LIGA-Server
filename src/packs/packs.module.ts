import { Module } from '@nestjs/common';
import { PacksService } from './packs.service';
import { PacksController } from './packs.controller';

@Module({
  controllers: [PacksController],
  providers: [PacksService],
})
export class PacksModule {}
